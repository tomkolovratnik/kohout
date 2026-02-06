import { ProxyAgent, Agent, type Dispatcher } from 'undici';

const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy
  || process.env.HTTP_PROXY || process.env.http_proxy;

const dispatchers = new Map<string, Dispatcher>();

function getDispatcher(skipSsl: boolean): Dispatcher | undefined {
  const key = `${proxyUrl ?? ''}:${skipSsl}`;
  let d = dispatchers.get(key);
  if (d) return d;

  const tlsOpts = skipSsl ? { rejectUnauthorized: false } : undefined;

  if (proxyUrl) {
    console.log(`Using proxy: ${proxyUrl}${skipSsl ? ' (SSL verification disabled)' : ''}`);
    d = new ProxyAgent({
      uri: proxyUrl,
      requestTls: tlsOpts,
      proxyTls: tlsOpts,
    });
  } else if (skipSsl) {
    console.log('SSL verification disabled (provider has skip_ssl enabled)');
    d = new Agent({ connect: tlsOpts });
  }

  if (d) dispatchers.set(key, d);
  return d;
}

export async function fetchSsl(url: string, init: RequestInit | undefined, skipSsl: boolean): Promise<Response> {
  const dispatcher = getDispatcher(skipSsl);
  if (dispatcher) {
    return fetch(url, { ...init, dispatcher } as any);
  }
  return fetch(url, init);
}
