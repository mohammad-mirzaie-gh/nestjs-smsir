/**
 * Generic response envelope returned by every sms.ir REST API endpoint.
 *
 * @see https://sms.ir/rest-api/
 */
export interface SmsirResponse<T> {
  /**
   * Numeric status code.
   * `1` means success. Any other value represents a logical error
   * (see {@link SmsirStatusCode}).
   */
  status: number;

  /**
   * Human readable (Persian) description of the status.
   */
  message: string;

  /**
   * The actual payload returned by the endpoint.
   */
  data: T;
}

/**
 * Response data of `sendBulk` / `sendLikeToLike`.
 */
export interface SendPackResult {
  /** Unique identifier of the send pack. */
  packId: string;

  /**
   * One id per recipient, in the same order as the request.
   *
   * - A concrete number is the message id.
   * - `0` means the number is on the blacklist.
   * - `null` means the number is invalid or the text was too long.
   */
  messageIds: Array<number | null>;

  /** Credit consumed by this pack. */
  cost: number;
}

/**
 * Response data of `deleteScheduled`.
 */
export interface DeleteScheduledResult {
  /** Credit that was returned to the account after cancelling the pack. */
  returnedCreditCount: number;

  /** Number of messages that were cancelled. */
  smsCount: number;
}

/**
 * Response data of `sendVerifyCode`.
 */
export interface SendVerifyCodeResult {
  /** Unique identifier of the sent message. */
  messageId: number;

  /** Credit consumed by this message. */
  cost: number;
}

/**
 * Response data of `sendByURL`.
 */
export interface SendByUrlResult {
  /** Unique identifier of the sent message. */
  messageId: number;

  /** Credit consumed by this message. */
  cost: number;
}

/**
 * Delivery state of a message.
 *
 * @see https://sms.ir/rest-api/
 */
export enum SmsirDeliveryState {
  /** Delivered to the handset. */
  Delivered = 1,
  /** Not delivered to the handset. */
  NotDelivered = 2,
  /** Being processed by the telecom operator. */
  ProcessingByTelecom = 3,
  /** Not delivered to the telecom operator. */
  NotDeliveredToTelecom = 4,
  /** Delivered to the telecom operator. */
  DeliveredToTelecom = 5,
  /** An error occurred. */
  Error = 6,
  /** The number is blacklisted. */
  Blacklist = 7,
}

/**
 * Response data of `reportMessage`.
 */
export interface MessageReport {
  messageId: number;
  mobile: number;
  messageText: string;
  /** Unix timestamp (UTC). */
  sendDateTime: number;
  lineNumber: number;
  cost: number;
  deliveryState: SmsirDeliveryState | null;
  /** Unix timestamp (UTC), null while not yet delivered. */
  deliveryDateTime: number | null;
}

/**
 * A single entry returned by `reportDailyPack`.
 */
export interface DailyPackSummary {
  packId: string;
  recipientCount: number;
  /** Unix timestamp (UTC). */
  creationDateTime: number;
}

/**
 * A single entry returned by `reportLatestReceive`, `reportReceiveLive`,
 * and `reportReceiveArchive`.
 */
export interface ReceivedMessage {
  /** Sender mobile number. */
  mobile: number;
  messageText: string;
  /** The line number that received the message. */
  number: number;
  /** Unix timestamp (UTC). */
  receivedDateTime: number;
}

/**
 * Status codes that may be returned in the `status` field of a
 * {@link SmsirResponse}.
 *
 * @see https://sms.ir/rest-api/
 */
export enum SmsirStatusCode {
  /** Operation completed successfully. */
  Success = 1,
  /** A generic/unexpected error occurred on the sms.ir side. */
  GenericError = 0,
  /** The API key is invalid. */
  InvalidApiKey = 10,
  /** The API key is disabled. */
  ApiKeyDisabled = 11,
  /** The API key is restricted to a set of IPs and the caller IP is not allowed. */
  ApiKeyIpRestricted = 12,
  /** The account is disabled. */
  AccountDisabled = 13,
  /** The account is suspended. */
  AccountSuspended = 14,
  /** Too many requests. */
  TooManyRequests = 20,
  /** The line number is invalid. */
  InvalidLineNumber = 101,
  /** Insufficient credit. */
  InsufficientCredit = 102,
  /** The request contains one or more empty message texts. */
  EmptyMessageText = 103,
  /** The request contains one or more invalid mobile numbers. */
  InvalidMobileNumber = 104,
  /** The number of mobile numbers exceeds the allowed maximum (100). */
  TooManyMobiles = 105,
  /** The number of message texts exceeds the allowed maximum (100). */
  TooManyMessageTexts = 106,
  /** The mobile number list is empty. */
  EmptyMobileList = 107,
  /** The message text list is empty. */
  EmptyMessageTextList = 108,
  /** The scheduled send time is invalid. */
  InvalidSendDateTime = 109,
  /** The number of mobiles and the number of texts do not match. */
  MobileTextCountMismatch = 110,
  /** No pack was registered with this id. */
  PackNotFound = 111,
  /** No record was found to delete. */
  RecordNotFoundForDelete = 112,
  /** The template was not found. */
  TemplateNotFound = 113,
  /** A parameter value exceeds the allowed length (25 characters). */
  ParameterValueTooLong = 114,
  /** One or more mobile numbers are blacklisted. */
  MobileBlacklisted = 115,
  /** A parameter name cannot be empty. */
  EmptyParameterName = 116,
  /** The submitted text was not approved. */
  TextNotApproved = 117,
  /** The number of messages exceeds the allowed limit. */
  TooManyMessages = 118,
}
