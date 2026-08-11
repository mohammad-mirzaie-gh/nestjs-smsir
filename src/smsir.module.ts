import { DynamicModule, Module, Provider } from '@nestjs/common';
import { SMSIR_MODULE_OPTIONS } from './smsir.constants';
import {
  SmsirModuleAsyncOptions,
  SmsirModuleOptions,
  SmsirOptionsFactory,
} from './interfaces/smsir-module-options.interface';
import { SmsirService } from './smsir.service';

/**
 * sms.ir module for NestJS.
 *
 * This module supports two ways of configuration:
 *
 * 1. Static configuration (when the apiKey/lineNumber are already available):
 *
 * ```ts
 * SmsirModule.forRoot({
 *   apiKey: 'your-api-key',
 *   lineNumber: 30007732000000,
 * })
 * ```
 *
 * 2. Async configuration (when the apiKey needs to be loaded
 *    from ConfigService/environment variables):
 *
 * ```ts
 * SmsirModule.forRootAsync({
 *   imports: [ConfigModule],
 *   inject: [ConfigService],
 *   useFactory: (config: ConfigService) => ({
 *     apiKey: config.get('SMSIR_API_KEY'),
 *     lineNumber: config.get('SMSIR_LINE_NUMBER'),
 *   }),
 * })
 * ```
 */
@Module({})
export class SmsirModule {
  static forRoot(options: SmsirModuleOptions): DynamicModule {
    const isGlobal = options.isGlobal ?? true;

    const optionsProvider: Provider = {
      provide: SMSIR_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: SmsirModule,
      global: isGlobal,
      providers: [optionsProvider, SmsirService],
      exports: [SmsirService],
    };
  }

  static forRootAsync(options: SmsirModuleAsyncOptions): DynamicModule {
    const isGlobal = options.isGlobal ?? true;

    return {
      module: SmsirModule,
      global: isGlobal,
      imports: options.imports || [],
      providers: [...this.createAsyncProviders(options), SmsirService],
      exports: [SmsirService],
    };
  }

  private static createAsyncProviders(
    options: SmsirModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: SMSIR_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }

    if (options.useExisting) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),

        // The factory class must also be registered as a provider
        // so that it can be injected.
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    throw new Error(
      'SmsirModule.forRootAsync: one of useFactory, useClass, or useExisting must be specified.',
    );
  }

  private static createAsyncOptionsProvider(
    options: SmsirModuleAsyncOptions,
  ): Provider {
    if (options.useExisting) {
      return {
        provide: SMSIR_MODULE_OPTIONS,
        useFactory: async (optionsFactory: SmsirOptionsFactory) =>
          optionsFactory.createSmsirOptions(),
        inject: [options.useExisting],
      };
    }

    if (options.useClass) {
      return {
        provide: SMSIR_MODULE_OPTIONS,
        useFactory: async (optionsFactory: SmsirOptionsFactory) =>
          optionsFactory.createSmsirOptions(),
        inject: [options.useClass],
      };
    }

    throw new Error(
      'SmsirModule.forRootAsync: useClass or useExisting is invalid.',
    );
  }
}
