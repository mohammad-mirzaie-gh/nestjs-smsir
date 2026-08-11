import { SmsirStatusCode } from './interfaces/smsir-responses.interface';

/**
 * Thrown whenever the sms.ir API responds with a non-success `status`
 * (i.e. anything other than `1`), or when the HTTP call itself fails
 * (network error, non-2xx HTTP status, invalid JSON body, etc).
 *
 * @example
 * try {
 *   await smsirService.sendBulk('Hello', ['09123456789']);
 * } catch (error) {
 *   if (error instanceof SmsirException) {
 *     console.log(error.status, error.message);
 *   }
 * }
 */
export class SmsirException extends Error {
  /**
   * The `status` field returned by the sms.ir API, or `null` when the
   * failure happened before a response body could be parsed
   * (e.g. a network error or a non-JSON response).
   */
  public readonly status: number | SmsirStatusCode | null;

  /**
   * The raw HTTP status code of the response, when available.
   */
  public readonly httpStatus?: number;

  constructor(
    message: string,
    status: number | SmsirStatusCode | null = null,
    httpStatus?: number,
  ) {
    super(message);
    this.name = 'SmsirException';
    this.status = status;
    this.httpStatus = httpStatus;

    Object.setPrototypeOf(this, SmsirException.prototype);
  }
}
