import { Inject, Injectable, Logger } from '@nestjs/common';
import { SMSIR_MODULE_OPTIONS } from './smsir.constants';
import { SmsirModuleOptions } from './interfaces/smsir-module-options.interface';
import {
  DateRangePaginationParams,
  PaginationParams,
  VerifyCodeParam,
} from './interfaces/smsir-payloads.interface';
import {
  DailyPackSummary,
  DeleteScheduledResult,
  MessageReport,
  ReceivedMessage,
  SendByUrlResult,
  SendPackResult,
  SendVerifyCodeResult,
} from './interfaces/smsir-responses.interface';
import { SmsirClient } from './smsir.client';

/**
 * Injectable NestJS wrapper around the sms.ir REST API
 * (https://sms.ir/rest-api/).
 *
 * This service talks to `https://api.sms.ir` directly - it does not rely
 * on any third-party sms.ir SDK, so its behaviour is not affected by the
 * version (or lack of camelCase methods) of packages such as
 * `sms-typescript`.
 *
 * @example
 * constructor(private readonly smsirService: SmsirService) {}
 *
 * await this.smsirService.sendBulk('Hello World', ['09123456789']);
 */
@Injectable()
export class SmsirService {
  private readonly logger = new Logger(SmsirService.name);
  private readonly client: SmsirClient;

  constructor(
    @Inject(SMSIR_MODULE_OPTIONS)
    private readonly options: SmsirModuleOptions,
  ) {
    this.client = new SmsirClient(this.options);
  }

  // ---------------------------------------------------------------------
  // Send methods
  // ---------------------------------------------------------------------

  /**
   * Sends the same message text to multiple recipients (up to 100).
   *
   * `POST /v1/send/bulk`
   *
   * @param messageText The SMS message text.
   * @param mobiles Array of recipient mobile numbers (max 100).
   * @param sendDateTime Optional Unix timestamp (UTC) for scheduled delivery
   *   (between 1 hour and 365 days from now).
   * @param customLineNumber Optional sender line number, overriding the
   *   module's default `lineNumber`.
   */
  sendBulk(
    messageText: string,
    mobiles: string[],
    sendDateTime?: number,
    customLineNumber?: number,
  ): Promise<SendPackResult> {
    this.logger.debug(`sendBulk -> ${mobiles.length} recipient(s)`);

    return this.client.post<SendPackResult>('/v1/send/bulk', {
      lineNumber: customLineNumber ?? this.client.defaultLineNumber,
      messageText,
      mobiles,
      sendDateTime: sendDateTime ?? null,
    });
  }

  /**
   * Sends different message texts to different recipients, 1-to-1
   * (`messageTexts[i]` is sent to `mobiles[i]`).
   *
   * `POST /v1/send/likeToLike`
   *
   * The `messageTexts` and `mobiles` arrays must have the same length
   * (max 100 each).
   *
   * @param messageTexts Array of message texts.
   * @param mobiles Array of recipient mobile numbers.
   * @param sendDateTime Optional Unix timestamp (UTC) for scheduled delivery.
   * @param customLineNumber Optional sender line number, overriding the
   *   module's default `lineNumber`.
   */
  sendLikeToLike(
    messageTexts: string[],
    mobiles: string[],
    sendDateTime?: number,
    customLineNumber?: number,
  ): Promise<SendPackResult> {
    this.logger.debug(`sendLikeToLike -> ${mobiles.length} recipient(s)`);

    return this.client.post<SendPackResult>('/v1/send/likeToLike', {
      lineNumber: customLineNumber ?? this.client.defaultLineNumber,
      messageTexts,
      mobiles,
      sendDateTime: sendDateTime ?? null,
    });
  }

  /**
   * Cancels a scheduled send pack that has not been sent yet.
   * Allowed up to 3 minutes before the scheduled send time.
   *
   * `DELETE /v1/send/scheduled/{packId}`
   *
   * @param packId The pack id returned by `sendBulk` / `sendLikeToLike`.
   */
  deleteScheduled(packId: string): Promise<DeleteScheduledResult> {
    this.logger.debug(`deleteScheduled -> ${packId}`);

    return this.client.delete<DeleteScheduledResult>(
      `/v1/send/scheduled/${encodeURIComponent(packId)}`,
    );
  }

  /**
   * Sends a verification code (OTP) or any other pattern-based message
   * (e.g. order confirmation) using a predefined template configured in
   * the sms.ir panel ("ارسال سریع").
   *
   * `POST /v1/send/verify`
   *
   * @param mobile Recipient mobile number.
   * @param templateId ID of the template configured in the sms.ir panel.
   * @param parameters Template parameters, for example:
   * `[{ name: 'Code', value: '123456' }]`
   */
  sendVerifyCode(
    mobile: string,
    templateId: number,
    parameters: VerifyCodeParam[],
  ): Promise<SendVerifyCodeResult> {
    this.logger.debug(
      `sendVerifyCode -> ${mobile} (template: ${templateId})`,
    );

    return this.client.post<SendVerifyCodeResult>('/v1/send/verify', {
      mobile,
      templateId,
      parameters,
    });
  }

  /**
   * Sends a single SMS using the legacy, credential-based URL/query-param
   * method.
   *
   * `GET /v1/send`
   *
   * @param username sms.ir panel username.
   * @param password sms.ir panel API key (used as the legacy password).
   * @param mobile Recipient mobile number.
   * @param text SMS message text.
   * @param customLineNumber Optional sender line number, overriding the
   *   module's default `lineNumber`.
   */
  sendByURL(
    username: string,
    password: string,
    mobile: string,
    text: string,
    customLineNumber?: number,
  ): Promise<SendByUrlResult> {
    return this.client.get<SendByUrlResult>('/v1/send', {
      username,
      password,
      line: customLineNumber ?? this.client.defaultLineNumber,
      mobile,
      text,
    });
  }

  // ---------------------------------------------------------------------
  // Report methods
  // ---------------------------------------------------------------------

  /**
   * Retrieves a single message's info and delivery status.
   *
   * `GET /v1/send/{messageId}`
   */
  reportMessage(messageId: number): Promise<MessageReport> {
    return this.client.get<MessageReport>(`/v1/send/${messageId}`);
  }

  /**
   * Retrieves a summary of today's send packs.
   *
   * `GET /v1/send/pack`
   */
  reportDailyPack(params?: PaginationParams): Promise<DailyPackSummary[]> {
    return this.client.get<DailyPackSummary[]>('/v1/send/pack', {
      pageSize: params?.pageSize,
      pageNumber: params?.pageNumber,
    });
  }

  /**
   * Retrieves every message that belongs to a specific send pack.
   *
   * `GET /v1/send/pack/{packId}`
   */
  reportPackById(packId: string): Promise<MessageReport[]> {
    return this.client.get<MessageReport[]>(
      `/v1/send/pack/${encodeURIComponent(packId)}`,
    );
  }

  /**
   * Retrieves today's sent messages in real time, with pagination.
   *
   * `GET /v1/send/live`
   */
  reportTodayLive(params?: PaginationParams): Promise<MessageReport[]> {
    return this.client.get<MessageReport[]>('/v1/send/live', {
      pageSize: params?.pageSize,
      pageNumber: params?.pageNumber,
    });
  }

  /**
   * Retrieves archived (previous-day-and-earlier) sent messages within an
   * optional date range, with pagination.
   *
   * `GET /v1/send/archive`
   */
  reportArchive(
    params?: DateRangePaginationParams,
  ): Promise<MessageReport[]> {
    return this.client.get<MessageReport[]>('/v1/send/archive', {
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      pageSize: params?.pageSize,
      pageNumber: params?.pageNumber,
    });
  }

  /**
   * Retrieves the latest received messages. Each message can only be
   * fetched once through this endpoint.
   *
   * `GET /v1/receive/latest`
   *
   * @param count Number of messages to retrieve (default & max: 100).
   */
  reportLatestReceive(count?: number): Promise<ReceivedMessage[]> {
    return this.client.get<ReceivedMessage[]>('/v1/receive/latest', {
      count,
    });
  }

  /**
   * Retrieves today's received messages (read and unread), with
   * pagination.
   *
   * `GET /v1/receive/live`
   */
  reportReceiveLive(
    params?: PaginationParams & { sortByNewest?: boolean },
  ): Promise<ReceivedMessage[]> {
    return this.client.get<ReceivedMessage[]>('/v1/receive/live', {
      pageSize: params?.pageSize,
      pageNumber: params?.pageNumber,
      sortByNewest: params?.sortByNewest,
    });
  }

  /**
   * Retrieves archived (previous-day-and-earlier) received messages
   * within an optional date range, with pagination.
   *
   * `GET /v1/receive/archive`
   */
  reportReceiveArchive(
    params?: DateRangePaginationParams,
  ): Promise<ReceivedMessage[]> {
    return this.client.get<ReceivedMessage[]>('/v1/receive/archive', {
      fromDate: params?.fromDate,
      toDate: params?.toDate,
      pageSize: params?.pageSize,
      pageNumber: params?.pageNumber,
    });
  }

  // ---------------------------------------------------------------------
  // Settings methods
  // ---------------------------------------------------------------------

  /**
   * Retrieves the current account credit balance.
   *
   * `GET /v1/credit`
   */
  getCredit(): Promise<number> {
    return this.client.get<number>('/v1/credit');
  }

  /**
   * Retrieves the list of dedicated and public sender lines available to
   * the account.
   *
   * `GET /v1/line`
   */
  getLineNumbers(): Promise<number[]> {
    return this.client.get<number[]>('/v1/line');
  }
}
