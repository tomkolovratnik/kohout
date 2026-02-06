let insecureDispatcher: unknown = null;

async function ensureInsecureDispatcher(): Promise<unknown> {
  if (!insecureDispatcher) {
    // @ts-ignore - undici is bundled with Node.js 18+
    const { Agent } = await import('undici');
    insecureDispatcher = new Agent({ connect: { rejectUnauthorized: false } });
  }
  return insecureDispatcher;
}

export async function fetchSsl(url: string, init: RequestInit | undefined, skipSsl: boolean): Promise<Response> {
  if (!skipSsl) return fetch(url, init);
  const dispatcher = await ensureInsecureDispatcher();
  return fetch(url, { ...init, dispatcher } as any);
}
