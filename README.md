# streambot.js

[![GitHub](https://img.shields.io/github/license/redeven/streambot.js?style=for-the-badge)](https://github.com/redeven/streambot.js/blob/master/LICENSE)

Library that exports a ready-to-use Discord bot that relays online stream status messages for your streamers of choice from supported platforms.

Currently supports:

- Twitch.tv
- Trovo.live

Requires a valid SSL certificate (privkey & fullchain) to sign Twitch subscriptions

## Installation

```
npm install streambot.js
```

## Standalone Usage

```ts
const bot = new StreambotJs(opts, sslCert);
bot.init(opts).subscribe();
```

## Express Middleware

```ts
const app = express();
const bot = new StreambotJs(opts, sslCert);
await bot.expressMiddleware.apply(app);
app.listen(443, () => {
  bot.init(opts).subscribe();
});
```

## Loading and saving configuration

To allow more flexibility for the end user's storage choices, the library doesn't store its configuration to any file.

To load existing configuration from storage:
_You should load your configuration before initializing the bot_

```ts
const configuration: StreambotJsConfiguration = getFromStorage();
bot.setConfiguration(configuration);
bot.init(opts).subscribe();
```

To subscribe to configuration changes

```ts
bot.configurationChanges.subscribe((configuration: StreambotJsConfiguration) => {
  saveToStorage(configuration);
});
```
