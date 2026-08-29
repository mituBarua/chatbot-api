export async function requireAuth(request: Request, env: Env): Promise<string | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const providedKey = authHeader.slice(7); // Remove "Bearer "
  const validKey = env.API_KEY;

  if (providedKey !== validKey) {
    return null;
  }

  return providedKey;
}

export function sendError(code: string, message: string, status: number = 400) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message }
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

export function sendSuccess(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}