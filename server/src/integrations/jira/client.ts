import type { ProviderConfig } from '../types.js';
import { fetchSsl } from '../fetch-utils.js';

export class JiraClient {
  private baseUrl: string;
  private headers: Record<string, string>;
  private skipSsl: boolean;
  private apiVersion: '2' | '3' | null = null;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.base_url.replace(/\/$/, '');
    this.skipSsl = config.extra_config?.skip_ssl === 'true';
    const auth = Buffer.from(`${config.username}:${config.pat_token}`).toString('base64');
    this.headers = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetchSsl(url, { ...init, headers: this.headers }, this.skipSsl);
  }

  private async throwApiError(res: Response, context: string): Promise<never> {
    const text = await res.text().catch(() => '');
    throw new Error(`Jira API error (${context}): ${res.status} ${res.statusText} – ${text}`);
  }

  /** Detect whether this is v2 (Server/DC) or v3 (Cloud) */
  private async detectVersion(): Promise<'2' | '3'> {
    if (this.apiVersion) return this.apiVersion;
    for (const ver of ['2', '3'] as const) {
      const url = `${this.baseUrl}/rest/api/${ver}/myself`;
      const res = await this.fetch(url);
      if (res.ok) {
        this.apiVersion = ver;
        console.log(`Jira API version detected: v${ver} (${this.baseUrl})`);
        return ver;
      }
      if (res.status === 404 && ver === '2') continue;
      const body = await res.text().catch(() => '');
      throw new Error(`Jira API ${res.status} ${res.statusText} (${url}): ${body}`);
    }
    throw new Error(`Jira API endpoint not found at ${this.baseUrl}/rest/api/*/myself`);
  }

  private api(path: string): string {
    return `${this.baseUrl}/rest/api/${this.apiVersion}${path}`;
  }

  async testConnection(): Promise<boolean> {
    await this.detectVersion();
    return true;
  }

  async getIssue(issueKey: string): Promise<any> {
    await this.detectVersion();
    const url = this.api(`/issue/${encodeURIComponent(issueKey)}?expand=renderedFields`);
    const res = await this.fetch(url);
    if (!res.ok) await this.throwApiError(res, `getIssue ${issueKey}`);
    return res.json();
  }

  async getIssueComments(issueKey: string): Promise<any[]> {
    await this.detectVersion();
    const url = this.api(`/issue/${encodeURIComponent(issueKey)}/comment`);
    const res = await this.fetch(url);
    if (!res.ok) await this.throwApiError(res, `getIssueComments ${issueKey}`);
    const data = await res.json();
    return data.comments || [];
  }

  async searchIssues(jql: string, nextPageToken?: string): Promise<{ issues: { key: string }[]; nextPageToken?: string }> {
    await this.detectVersion();

    if (this.apiVersion === '2') {
      // Jira Server/DC: GET /rest/api/2/search?jql=...
      const startAt = nextPageToken ? Number(nextPageToken) : 0;
      const params = new URLSearchParams({
        jql,
        maxResults: '50',
        fields: 'key',
        startAt: String(startAt),
      });
      const url = this.api(`/search?${params}`);
      const res = await this.fetch(url);
      if (!res.ok) await this.throwApiError(res, 'searchIssues');
      const data = await res.json();
      const issues = data.issues || [];
      const next = startAt + issues.length < data.total ? String(startAt + issues.length) : undefined;
      return { issues, nextPageToken: next };
    }

    // Jira Cloud: POST /rest/api/3/search/jql
    const url = this.api('/search/jql');
    const body: Record<string, unknown> = { jql, maxResults: 50, fields: ['key'] };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const res = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) await this.throwApiError(res, 'searchIssues');
    const data = await res.json();
    return { issues: data.issues || [], nextPageToken: data.nextPageToken };
  }
}
