# nestjs-smsir

A NestJS integration for the [sms.ir](https://sms.ir/) SMS service.

This package provides an **Injectable service** and a **Dynamic Module** wrapper around the official [sms.ir REST API](https://sms.ir/rest-api/), so you can use sms.ir with standard NestJS patterns such as **Dependency Injection**, `forRoot()`, `forRootAsync()`, and `ConfigService`.

[![npm version](https://img.shields.io/npm/v/nestjs-smsir.svg)](https://www.npmjs.com/package/nestjs-smsir)
[![npm downloads](https://img.shields.io/npm/dm/nestjs-smsir.svg)](https://www.npmjs.com/package/nestjs-smsir)
[![license](https://img.shields.io/npm/l/nestjs-smsir.svg)](https://github.com/mohammad-mirzaie-gh/nestjs-smsir/blob/main/LICENSE)

---

## What changed in v2.0.0 (important)

Version `1.x` of this package wrapped the third-party `sms-typescript` package. That package's version actually published on npm (`1.0.2`) only exposes the **old PascalCase API** (`SendBulk`, `SendVerifyCode`, `ReportArchived`, ...) and must be imported from `sms-typescript/lib`. The camelCase API (`sendBulk`, `reportDailyPack`, ...) that `nestjs-smsir` `1.x` called against it only exists in a newer version of that SDK that **was never published to npm** — so every call in `1.x` failed at runtime with `TypeError: ... is not a function`.

**v2.0.0 removes the `sms-typescript` dependency entirely.** `nestjs-smsir` now talks directly to `https://api.sms.ir` using Node's native `fetch` (Node.js 18+), based on the [official sms.ir REST API documentation](https://sms.ir/rest-api/). There is no third-party SDK in the dependency chain anymore, so this package can't be broken by a version mismatch in someone else's package again.

If you were on `1.x`:

* `getClient()` / the raw `Smsir` client from `sms-typescript` no longer exist — everything is now provided directly by `SmsirService`.
* `sendByURL(username, mobile, text, customLine?)` is now `sendByURL(username, password, mobile, text, customLineNumber?)` to match the real `GET /v1/send` endpoint, which requires a password (your API key) in addition to the username.
* Report methods that used to take positional arguments (`reportDailyPack(pageNumber, pageSize)`, `reportArchive(fromDate, toDate, pageNumber, pageSize)`, ...) now take a single options object (`reportDailyPack({ pageNumber, pageSize })`, `reportArchive({ fromDate, toDate, pageNumber, pageSize })`) — see [API Reference](#api-reference) below.
* Errors are now thrown as `SmsirException` instead of being returned inside a wrapped response object.

---

## Features

* 🚀 Native NestJS `DynamicModule` integration
* 💉 Full Dependency Injection support
* ⚙️ Static configuration with `forRoot()`
* 🔄 Async configuration with `forRootAsync()`
* 🔧 `ConfigService` integration
* 🌐 **Zero runtime dependencies** — talks to `api.sms.ir` directly via native `fetch`
* 📱 SMS, OTP, and bulk messaging support
* 📊 Message and delivery reporting
* 💳 Account credit and sender-line information
* ⚠️ Typed `SmsirException` with the real sms.ir status code
* 🧩 TypeScript-first API, typed against the [official sms.ir REST API](https://sms.ir/rest-api/)
* 🌍 Global module support by default

---

## Installation

Install the package using npm:

```bash
npm i nestjs-smsir
```

> Requires Node.js >= 18 (uses the native `fetch` API). No other runtime dependency is installed.

---

## Getting Started

### Static Configuration

Use `forRoot()` when your `apiKey` and `lineNumber` are already available.

```ts
// app.module.ts

import { Module } from '@nestjs/common';
import { SmsirModule } from 'nestjs-smsir';

@Module({
  imports: [
    SmsirModule.forRoot({
      apiKey: 'YOUR_API_KEY',
      lineNumber: 30007732000000,

      // `isGlobal` defaults to true.
      // isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

By default, `SmsirModule` is registered as a global module, so you do not need to import it again in other feature modules.

To disable global registration:

```ts
SmsirModule.forRoot({
  apiKey: 'YOUR_API_KEY',
  lineNumber: 30007732000000,
  isGlobal: false,
});
```

---

## Async Configuration

Use `forRootAsync()` when configuration values need to be loaded from environment variables, `ConfigService`, or another provider.

```ts
// app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SmsirModule } from 'nestjs-smsir';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    SmsirModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (config: ConfigService) => ({
        apiKey: config.getOrThrow<string>('SMSIR_API_KEY'),
        lineNumber: Number(
          config.getOrThrow<string>('SMSIR_LINE_NUMBER'),
        ),
      }),
    }),
  ],
})
export class AppModule {}
```

### Environment Variables

```env
SMSIR_API_KEY=your-api-key-here
SMSIR_LINE_NUMBER=30007732000000
```

---

## Using `useClass`

If you prefer to keep your configuration logic inside a dedicated class, you can use `useClass`.

```ts
import { Injectable } from '@nestjs/common';
import {
  SmsirModuleOptions,
  SmsirOptionsFactory,
} from 'nestjs-smsir';

@Injectable()
export class SmsirConfigService implements SmsirOptionsFactory {
  createSmsirOptions(): SmsirModuleOptions {
    return {
      apiKey: process.env.SMSIR_API_KEY!,
      lineNumber: Number(process.env.SMSIR_LINE_NUMBER),
    };
  }
}
```

Then register it with the module:

```ts
SmsirModule.forRootAsync({
  useClass: SmsirConfigService,
});
```

---

## Using `SmsirService`

Once `SmsirModule` has been registered, inject `SmsirService` anywhere in your application.

```ts
// auth.service.ts

import { Injectable } from '@nestjs/common';
import { SmsirService } from 'nestjs-smsir';

@Injectable()
export class AuthService {
  constructor(
    private readonly smsirService: SmsirService,
  ) {}

  async sendOtp(mobile: string, code: string) {
    return this.smsirService.sendVerifyCode(
      mobile,
      123456,
      [
        {
          name: 'Code',
          value: code,
        },
      ],
    );
  }

  async sendWelcomeMessage(mobile: string) {
    return this.smsirService.sendBulk(
      'Welcome to our application!',
      [mobile],
    );
  }

  async checkCredit() {
    return this.smsirService.getCredit();
  }
}
```

---

## OTP Example

A typical OTP flow can be implemented by combining `sendVerifyCode()` with your own storage mechanism such as Redis or a database.

```ts
// auth.controller.ts

import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Post('send-otp')
  async sendOtp(
    @Body('mobile') mobile: string,
  ) {
    const code = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    // Store the OTP in your database, Redis, or another storage system.
    const result = await this.authService.sendOtp(
      mobile,
      code,
    );

    return {
      success: true,
      messageId: result.messageId,
    };
  }
}
```

> **Note:** OTP generation, expiration, rate limiting, and verification are application-level concerns and are not managed by this package.

---

## Error Handling

Every method throws a `SmsirException` when the sms.ir API responds with a non-success status, or when the request itself fails (network error, timeout, invalid response).

```ts
import { SmsirException } from 'nestjs-smsir';

try {
  await this.smsirService.sendBulk('Hello', ['09123456789']);
} catch (error) {
  if (error instanceof SmsirException) {
    // error.status is the numeric sms.ir status code (see SmsirStatusCode),
    // or null if the failure happened before a response body was parsed.
    console.error(error.status, error.message);
  }

  throw error;
}
```

`SmsirStatusCode` contains all documented status codes (e.g. `InsufficientCredit`, `InvalidMobileNumber`, `TemplateNotFound`, ...) so you can branch on specific failures:

```ts
import { SmsirException, SmsirStatusCode } from 'nestjs-smsir';

try {
  await this.smsirService.sendBulk('Hello', [mobile]);
} catch (error) {
  if (
    error instanceof SmsirException &&
    error.status === SmsirStatusCode.InsufficientCredit
  ) {
    // handle low balance
  }
  throw error;
}
```

---

# API Reference

All methods return a `Promise` that resolves with the endpoint's `data` field directly (already unwrapped from the `{ status, message, data }` envelope), or rejects with a `SmsirException` on failure.

## Sending Messages

| Method                                                                       | Endpoint                        | Description                                                      |
| ----------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------ |
| `sendBulk(messageText, mobiles, sendDateTime?, customLineNumber?)`            | `POST /v1/send/bulk`             | Sends the same message to up to 100 recipients.                  |
| `sendLikeToLike(messageTexts, mobiles, sendDateTime?, customLineNumber?)`     | `POST /v1/send/likeToLike`       | Sends different messages to different recipients, 1-to-1.        |
| `sendVerifyCode(mobile, templateId, parameters)`                              | `POST /v1/send/verify`           | Sends a verification code / pattern message using a template.    |
| `deleteScheduled(packId)`                                                     | `DELETE /v1/send/scheduled/{id}` | Cancels a scheduled pack (up to 3 minutes before send time).     |
| `sendByURL(username, password, mobile, text, customLineNumber?)`              | `GET /v1/send`                   | Sends an SMS using the legacy, credential-based URL method.      |

## Reports

| Method                                             | Endpoint                    | Description                                                |
| --------------------------------------------------- | ----------------------------- | -------------------------------------------------------------- |
| `reportMessage(messageId)`                         | `GET /v1/send/{messageId}`  | Retrieves a single message's info and delivery status.     |
| `reportDailyPack({ pageNumber?, pageSize? })`      | `GET /v1/send/pack`         | Retrieves a summary of today's send packs.                 |
| `reportPackById(packId)`                           | `GET /v1/send/pack/{id}`    | Retrieves every message belonging to a specific pack.      |
| `reportTodayLive({ pageNumber?, pageSize? })`      | `GET /v1/send/live`         | Retrieves today's sent messages in real time.               |
| `reportArchive({ fromDate?, toDate?, pageNumber?, pageSize? })` | `GET /v1/send/archive`      | Retrieves archived sent messages within a date range.       |
| `reportLatestReceive(count?)`                      | `GET /v1/receive/latest`    | Retrieves the latest received messages (once each).         |
| `reportReceiveLive({ pageNumber?, pageSize?, sortByNewest? })` | `GET /v1/receive/live`      | Retrieves today's received messages.                         |
| `reportReceiveArchive({ fromDate?, toDate?, pageNumber?, pageSize? })` | `GET /v1/receive/archive`   | Retrieves archived received messages within a date range.   |

## Account & Settings

| Method             | Endpoint       | Description                                              |
| ------------------ | -------------- | ---------------------------------------------------------- |
| `getCredit()`      | `GET /v1/credit` | Retrieves the current account credit balance.             |
| `getLineNumbers()` | `GET /v1/line`   | Retrieves the sender lines associated with the account.   |

---

## Response Types

Every response type mirrors the fields documented at [sms.ir/rest-api](https://sms.ir/rest-api/), for example:

```ts
import { SendPackResult } from 'nestjs-smsir';

const result: SendPackResult = await this.smsirService.sendBulk(
  'Hello World!',
  ['09123456789'],
);

result.packId;       // string
result.messageIds;   // Array<number | null>
result.cost;          // number
```

`messageIds[i]` being `0` means that recipient is blacklisted; `null` means the number is invalid or the text was too long — this mirrors sms.ir's own documented behavior, it is not something this package invents.

---

## Module Configuration

### `SmsirModuleOptions`

```ts
interface SmsirModuleOptions {
  apiKey: string;
  lineNumber: number;
  baseUrl?: string;   // default: 'https://api.sms.ir'
  timeout?: number;   // default: 15000 (ms)
  isGlobal?: boolean; // default: true
}
```

| Option       | Type      | Required | Default                | Description                                |
| ------------ | --------- | -------: | ----------------------: | -------------------------------------------- |
| `apiKey`     | `string`  |      Yes |                       — | API key obtained from sms.ir (sent as `X-API-KEY`). |
| `lineNumber` | `number`  |      Yes |                       — | Default sender line number.                 |
| `baseUrl`    | `string`  |       No | `'https://api.sms.ir'` | Override the API base URL (e.g. for testing/mocking). |
| `timeout`    | `number`  |       No |                 `15000` | Request timeout in milliseconds.            |
| `isGlobal`   | `boolean` |       No |                  `true` | Registers the module globally.              |

---

## Architecture

```text
┌──────────────────────────────┐
│       Your NestJS App        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       SmsirService            │
│  Injectable NestJS Wrapper    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│       SmsirClient             │
│  Internal fetch-based client  │
│  (no third-party SDK)         │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  https://api.sms.ir (REST)    │
└──────────────────────────────┘
```

This package no longer wraps another package's SDK. `SmsirClient` talks to sms.ir's documented REST endpoints directly, so its behavior can't drift out of sync with a dependency's release schedule.

---

## Contributing

Contributions, bug reports, feature requests, and improvements are welcome.

Before submitting a pull request, please make sure that:

* The project builds successfully (`npm run build`).
* New functionality includes appropriate tests.
* Public APIs are properly documented.
* Changes follow the existing project structure and coding conventions.

---

## License

This project is licensed under the [MIT License](LICENSE).
