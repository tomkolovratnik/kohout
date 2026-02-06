export async function fetchSsl(url: string, init: RequestInit | undefined, skipSsl: boolean): Promise<Response> {
  if (!skipSsl) return fetch(url, init);
  // Node.js is single-threaded, so temporarily disabling TLS verification is safe
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    return await fetch(url, init);
  } finally {
    if (prev === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev;
  }
}
