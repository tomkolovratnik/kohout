import type { ProviderConfig } from '../types.js';

export class JiraClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(config: ProviderConfig) {
    this.baseUrl = config.base_url.replace(/\/$/, '');
    const auth = Buffer.from(`${config.username}:${config.pat_token}`).toString('base64');
    this.headers = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private async throwApiError(res: Response, context: string): Promise<never> {
    const text = await res.text().catch(() => '');
    throw new Error(`Jira API error (${context}): ${res.status} ${res.statusText} – ${text}`);
  }

  async getIssue(issueKey: string): Promise<any> {
    const url = `${this.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}?expand=renderedFields`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) await this.throwApiError(res, `getIssue ${issueKey}`);
    return res.json();
  }

  async getIssueComments(issueKey: string): Promise<any[]> {
    const url = `${this.baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) await this.throwApiError(res, `getIssueComments ${issueKey}`);
    const data = await res.json();
    return data.comments || [];
  }

  async searchIssues(jql: string, nextPageToken?: string): Promise<{ issues: { key: string }[]; nextPageToken?: string }> {
    const url = `${this.baseUrl}/rest/api/3/search/jql`;
    const body: Record<string, unknown> = { jql, maxResults: 50, fields: ['key'] };
    if (nextPageToken) {
      body.nextPageToken = nextPageToken;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) await this.throwApiError(res, 'searchIssues');
    const data = await res.json();
    return { issues: data.issues || [], nextPageToken: data.nextPageToken };
  }

  async testConnection(): Promise<boolean> {
    const url = `${this.baseUrl}/rest/api/3/myself`;
    const res = await fetch(url, { headers: this.headers });
    return res.ok;
  }
}
