export async function fetchSsl(url: string, init: RequestInit | undefined, skipSsl: boolean): Promise<Response> {
  if (skipSsl && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0') {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    console.log('SSL verification disabled (provider has skip_ssl enabled)');
  }
  return fetch(url, init);
}
