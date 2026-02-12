import type { NextRequest } from 'next/server';
import { getOpenCodeStatus, invokeOpenCodeEndpoint } from '@/lib/opencode';

export const runtime = 'nodejs';

const SECTION_PATHS = {
  config: '/config',
  'global/config': '/global/config',
  project: '/project',
  'project/current': '/project/current',
  mcp: '/mcp',
  lsp: '/lsp',
  formatter: '/formatter',
  path: '/path',
  vcs: '/vcs'
} as const;

type SectionName = keyof typeof SECTION_PATHS;

const DEFAULT_SECTIONS: SectionName[] = [
  'config',
  'global/config',
  'project',
  'project/current',
  'mcp',
  'lsp',
  'formatter',
  'path',
  'vcs'
];

function parseInclude(value: string | null): SectionName[] {
  if (!value) return DEFAULT_SECTIONS;
  const entries = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter((item): item is SectionName => item in SECTION_PATHS);
  if (entries.length === 0) return DEFAULT_SECTIONS;
  return Array.from(new Set(entries));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const autostart = searchParams.get('autostart') === '1';
    const include = parseInclude(searchParams.get('include'));

    const status = await getOpenCodeStatus();
    const sections = await Promise.all(
      include.map(async (name) => {
        const result = await invokeOpenCodeEndpoint({
          path: SECTION_PATHS[name],
          method: 'GET',
          ensureRunning: autostart
        });
        return [name, result] as const;
      })
    );

    const payload: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const [name, result] of sections) {
      payload[name] = result;
      if (!result.ok) {
        errors.push(`${name} failed (${result.status})`);
      }
    }

    return Response.json({
      status,
      include,
      sections: payload,
      errors
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unknown system route error'
      },
      { status: 500 }
    );
  }
}
