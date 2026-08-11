/**
 * A single replaceable parameter used in a Verify Code Template.
 *
 * The `name` must match the parameter key configured for the template
 * in the sms.ir panel (without the leading/trailing `#`).
 *
 * @example
 * { name: 'Code', value: '123456' }
 */
export interface VerifyCodeParam {
  name: string;
  value: string;
}

/**
 * Pagination parameters accepted by most report endpoints.
 */
export interface PaginationParams {
  /** Number of items per page. */
  pageSize?: number;
  /** Requested page number (1-based). */
  pageNumber?: number;
}

/**
 * Date range + pagination parameters accepted by the archive report endpoints.
 */
export interface DateRangePaginationParams extends PaginationParams {
  /** Start of the range, as a Unix timestamp (UTC). */
  fromDate?: number;
  /** End of the range, as a Unix timestamp (UTC). */
  toDate?: number;
}
