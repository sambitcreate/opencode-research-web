import { getOpenCodeStatus } from '@/lib/opencode';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getOpenCodeStatus();
    return Response.json(status);
  } catch (error) {
    return Response.json(
      {
        running: false,
        error: error instanceof Error ? error.message : 'Unknown status error'
      },
      { status: 500 }
    );
  }
}
