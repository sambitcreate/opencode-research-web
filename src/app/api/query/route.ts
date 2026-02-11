import type { NextRequest } from 'next/server';
import { runResearchQuery } from '@/lib/opencode';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await runResearchQuery(query);

    const response = {
      id: `result_${Date.now()}`,
      query: query,
      status: 'completed',
      sessionId: result.sessionId,
      answer: result.answer,
      sources: result.sources,
      metadata: {
        sources: result.sources.length,
        processingTime: result.processingTime,
        confidenceScore: result.confidenceScore,
        opencode: result.opencode
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Query processing error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process query',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
