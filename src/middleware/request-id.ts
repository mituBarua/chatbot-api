export function generateRequestId(): string {
  return `req_${crypto.randomUUID().split('-')[0]}`;
}

export function extractRequestId(request: Request): string {
  const provided = request.headers.get('x-request-id');
  return provided || generateRequestId();
}