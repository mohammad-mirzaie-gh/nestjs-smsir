import { SmsirModuleOptions } from './interfaces/smsir-module-options.interface';
import { SmsirResponse } from './interfaces/smsir-responses.interface';
import { SmsirException } from './smsir.exception';

const DEFAULT_BASE_URL = 'https://api.sms.ir';
const DEFAULT_TIMEOUT = 15_000;

export type HttpMethod = 'GET' | 'POST' | 'DELETE';

/**
 * Thin, dependency-free HTTP client for the sms.ir REST API
 * (https://sms.ir/rest-api/).
 *
 * This talks to the API directly using the native `fetch` implementation
 * (available globally since Node.js 18), so this package does not depend
 * on any third-party sms.ir SDK.
 */
export class SmsirClient {
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(private readonly options: SmsirModuleOptions) {
    if (!options?.apiKey) {
      throw new Error(
        'SmsirModule: "apiKey" is required to create the sms.ir client.',
      );
    }

    if (!options?.lineNumber) {
      throw new Error(
        'SmsirModule: "lineNumber" is required to create the sms.ir client.',
      );
    }

    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
  }

  get defaultLineNumber(): number {
    return this.options.lineNumber;
  }

  /**
   * Performs a GET request and returns the parsed `data` field.
   *
   * `query` values equal to `undefined`, `null`, or `''` are omitted
   * from the querystring so callers can pass optional params freely.
   */
  async get<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('GET', path, undefined, query);
  }

  /**
   * Performs a POST request with a JSON body and returns the parsed
   * `data` field.
   */
  async post<T>(path: string, body?: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Performs a DELETE request and returns the parsed `data` field.
   */
  async delete<T>(path: string, query?: Record<string, unknown>): Promise<T> {
    return this.request<T>('DELETE', path, undefined, query);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, unknown>,
  ): Promise<T> {
    const url = this.buildUrl(path, query);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);

    let response: Response;

    try {
      response = await fetch(url, {
        method,
        headers: {
          'X-API-KEY': this.options.apiKey,
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new SmsirException(
          `sms.ir request timed out after ${this.timeout}ms (${method} ${path})`,
        );
      }

      throw new SmsirException(
        `sms.ir request failed (${method} ${path}): ${error?.message ?? error}`,
      );
    } finally {
      clearTimeout(timer);
    }

    let payload: SmsirResponse<T> | undefined;

    try {
      payload = (await response.json()) as SmsirResponse<T>;
    } catch {
      // The response was not valid JSON.
    }

    if (!response.ok) {
      throw new SmsirException(
        payload?.message ??
          `sms.ir request failed with HTTP status ${response.status} (${method} ${path})`,
        payload?.status ?? null,
        response.status,
      );
    }

    if (!payload) {
      throw new SmsirException(
        `sms.ir returned an empty or invalid response body (${method} ${path})`,
        null,
        response.status,
      );
    }

    if (payload.status !== 1) {
      throw new SmsirException(payload.message, payload.status, response.status);
    }

    return payload.data;
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}${path}`);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') {
          continue;
        }

        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }
}
