import { ModuleMetadata, Type } from '@nestjs/common';

/**
 * Configuration options required to talk to the sms.ir web service.
 */
export interface SmsirModuleOptions {
  /**
   * API key obtained from the sms.ir developer panel.
   * Sent as the `X-API-KEY` header on every request.
   */
  apiKey: string;

  /**
   * Default dedicated or public sender line number used for sending
   * messages when no `customLineNumber` is passed to a send method.
   */
  lineNumber: number;

  /**
   * Base URL of the sms.ir REST API.
   *
   * @default 'https://api.sms.ir'
   */
  baseUrl?: string;

  /**
   * Request timeout in milliseconds.
   *
   * @default 15000
   */
  timeout?: number;

  /**
   * Whether the module should be registered as global and made available
   * throughout the application without importing it into every module.
   *
   * @default true
   */
  isGlobal?: boolean;
}

/**
 * Async configuration options for factory-based configuration.
 *
 * Useful when configuration values such as the API key need to be loaded
 * dynamically from `ConfigService`, environment variables, or another
 * provider.
 */
export interface SmsirModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  isGlobal?: boolean;

  useFactory?: (
    ...args: any[]
  ) =>
    | Promise<Omit<SmsirModuleOptions, 'isGlobal'>>
    | Omit<SmsirModuleOptions, 'isGlobal'>;

  inject?: any[];

  useExisting?: Type<SmsirOptionsFactory>;

  useClass?: Type<SmsirOptionsFactory>;
}

/**
 * Factory interface for creating sms.ir module configuration asynchronously.
 */
export interface SmsirOptionsFactory {
  createSmsirOptions():
    | Promise<Omit<SmsirModuleOptions, 'isGlobal'>>
    | Omit<SmsirModuleOptions, 'isGlobal'>;
}
