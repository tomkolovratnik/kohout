import type { ProviderConfig } from '../types.js';
import { fetchSsl } from '../fetch-utils.js';

export class AzureDevOpsClient {
  private organization: string;
  private project: string;
  private headers: Record<string, string>;
  private skipSsl: boolean;

  constructor(config: ProviderConfig) {
    this.organization = config.extra_config?.organization || '';
    this.project = config.extra_config?.project || '';
    this.skipSsl = config.extra_config?.skip_ssl === 'true';
    const auth = Buffer.from(`:${config.pat_token}`).toString('base64');
    this.headers = {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  private get baseUrl() {
    return `https://dev.azure.com/${this.organization}/${this.project}/_apis`;
  }

  private fetch(url: string, init?: RequestInit): Promise<Response> {
    return fetchSsl(url, { ...init, headers: this.headers }, this.skipSsl);
  }

  private async throwApiError(res: Response, context: string): Promise<never> {
    const text = await res.text().catch(() => '');
    throw new Error(`Azure DevOps API error (${context}): ${res.status} ${res.statusText} – ${text}`);
  }

  async getWorkItem(id: string): Promise<any> {
    const url = `${this.baseUrl}/wit/workitems/${encodeURIComponent(id)}?$expand=all&api-version=7.1`;
    const res = await this.fetch(url);
    if (!res.ok) await this.throwApiError(res, `getWorkItem ${id}`);
    return res.json();
  }

  async getWorkItemComments(id: string): Promise<any[]> {
    const url = `${this.baseUrl}/wit/workitems/${encodeURIComponent(id)}/comments?api-version=7.1-preview.4`;
    const res = await this.fetch(url);
    if (!res.ok) await this.throwApiError(res, `getWorkItemComments ${id}`);
    const data = await res.json();
    return data.comments || [];
  }

  async queryWorkItems(wiql: string): Promise<number[]> {
    const url = `${this.baseUrl}/wit/wiql?api-version=7.1`;
    const res = await this.fetch(url, {
      method: 'POST',
      body: JSON.stringify({ query: wiql }),
    });
    if (!res.ok) await this.throwApiError(res, `queryWorkItems`);
    const data = await res.json();
    return (data.workItems || []).map((wi: any) => wi.id);
  }

  async testConnection(): Promise<boolean> {
    const url = `https://dev.azure.com/${this.organization}/_apis/projects/${this.project}?api-version=7.1`;
    const res = await this.fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Azure DevOps API ${res.status} ${res.statusText} (${url}): ${body}`);
    }
    return true;
  }
}
