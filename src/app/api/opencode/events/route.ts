import type { NextRequest } from 'next/server';
import {
  ensureOpenCodeServer,
  openOpenCodeEventStream,
  parseOpenCodeSseBlock,
  type OpenCodeSseSource
} from '@/lib/opencode';
import { parseAutostartParam } from '@/lib/opencode-route-utils';

export const runtime = 'nodejs';

type EventScope = 'instance' | 'global' | 'both';

function parseEventScope(value: string | null): EventScope {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return 'instance';
  if (normalized === 'instance' || normalized === 'global' || normalized === 'both') {
    return normalized;
  }
  throw new Error('Invalid scope. Expected one of: instance, global, both.');
}

function resolveSources(scope: EventScope): OpenCodeSseSource[] {
  if (scope === 'instance') return ['instance'];
  if (scope === 'global') return ['global'];
  return ['instance', 'global'];
}

function encodeSseEvent(encoder: TextEncoder, event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function encodeSseComment(encoder: TextEncoder, comment: string): Uint8Array {
  return encoder.encode(`: ${comment}\n\n`);
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const scope = parseEventScope(searchParams.get('scope'));
    const autostart = parseAutostartParam(searchParams);
    const sources = resolveSources(scope);

    if (autostart) {
      await ensureOpenCodeServer();
    }

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        const abortControllers: AbortController[] = [];
        let seq = 0;
        let closed = false;
        let heartbeat: ReturnType<typeof setInterval> | null = null;

        const safeEnqueue = (chunk: Uint8Array) => {
          if (closed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            closed = true;
          }
        };

        const emit = (event: string, payload: unknown) => {
          safeEnqueue(encodeSseEvent(encoder, event, payload));
        };

        const close = () => {
          if (closed) return;
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          request.signal.removeEventListener('abort', onAbort);
          for (const abortController of abortControllers) {
            abortController.abort();
          }
          try {
            controller.close();
          } catch {
            // ignored
          }
        };

        const onAbort = () => {
          close();
        };

        request.signal.addEventListener('abort', onAbort);

        heartbeat = setInterval(() => {
          safeEnqueue(encodeSseComment(encoder, 'keep-alive'));
        }, 15_000);

        emit('ready', {
          scope,
          sources,
          connectedAt: new Date().toISOString()
        });

        const pumpSource = async (source: OpenCodeSseSource) => {
          const upstreamAbortController = new AbortController();
          abortControllers.push(upstreamAbortController);

          try {
            const upstreamResponse = await openOpenCodeEventStream({
              source,
              signal: upstreamAbortController.signal
            });

            if (!upstreamResponse.ok) {
              const bodyText = (await upstreamResponse.text()).slice(0, 700);
              emit('source_error', {
                source,
                status: upstreamResponse.status,
                message: bodyText || 'OpenCode event stream returned non-OK response.'
              });
              return;
            }

            emit('source_open', {
              source,
              status: upstreamResponse.status
            });

            const reader = upstreamResponse.body?.getReader();
            if (!reader) {
              emit('source_error', {
                source,
                status: upstreamResponse.status,
                message: 'Event stream body is missing.'
              });
              return;
            }

            let buffered = '';

            while (!closed) {
              const { done, value } = await reader.read();
              if (done) break;

              buffered += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');

              while (true) {
                const separator = buffered.indexOf('\n\n');
                if (separator === -1) break;

                const block = buffered.slice(0, separator);
                buffered = buffered.slice(separator + 2);
                const parsed = parseOpenCodeSseBlock(block);
                if (!parsed) continue;

                seq += 1;
                emit('event', {
                  seq,
                  source,
                  event: parsed.event || 'message',
                  id: parsed.id,
                  timestamp: new Date().toISOString(),
                  data: parsed.data
                });
              }
            }

            if (buffered.trim()) {
              const parsed = parseOpenCodeSseBlock(buffered);
              if (parsed) {
                seq += 1;
                emit('event', {
                  seq,
                  source,
                  event: parsed.event || 'message',
                  id: parsed.id,
                  timestamp: new Date().toISOString(),
                  data: parsed.data
                });
              }
            }

            emit('source_closed', {
              source,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            if (upstreamAbortController.signal.aborted || closed) return;
            emit('source_error', {
              source,
              message: error instanceof Error ? error.message : 'Unknown stream bridge error.'
            });
          }
        };

        void Promise.allSettled(sources.map((source) => pumpSource(source))).then(() => {
          emit('complete', {
            timestamp: new Date().toISOString(),
            reason: 'All upstream event streams ended.'
          });
          close();
        });
      },
      cancel() {
        // next/server aborts the request signal on disconnect.
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no'
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown OpenCode events error';
    const status = message.startsWith('Invalid scope') ? 400 : 500;
    return Response.json(
      {
        error: message
      },
      { status }
    );
  }
}
