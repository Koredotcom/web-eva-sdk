# Eva Web SDK

Add the Eva floating chatbot to your web app.

---

## Option A: Script tag

For plain HTML or no bundler. npm install only if you use the UMD file from the package (not needed for CDN). API: `window.EvaSDK`.

1. Load the SDK and styles (use your path or CDN):

```html
<link rel="stylesheet" href="path/to/sdk-styles.css" />
<script src="path/to/eva-web-sdk.umd.js"></script>
```

2. Init and control via `window.EvaSDK`:

```javascript
var EvaSDK = window.EvaSDK;
EvaSDK.chatBot.init({
  accessToken: 'YOUR_ACCESS_TOKEN',
  api_url: 'https://work.kore.ai/api/',
  presence_url: 'https://work.kore.ai/',
  userId: 'YOUR_USER_ID'
});
// Open/close
EvaSDK.chatBot.open();
EvaSDK.chatBot.close();
```

---

## Option B: npm package

For React, Vite, Webpack, etc. npm install required. API: `import { chatBot } from 'eva-web-sdk'`.

1. Install and import:

```bash
npm install eva-web-sdk
```

```javascript
import { chatBot } from 'eva-web-sdk';
import 'eva-web-sdk/styles';

chatBot.init({
  accessToken: 'YOUR_ACCESS_TOKEN',
  api_url: 'https://work.kore.ai/api/',
  presence_url: 'https://work.kore.ai/',
  userId: 'YOUR_USER_ID'
});

chatBot.open();
chatBot.close();
```

---

## Config (init options)

| Key | Required | Description |
|-----|----------|-------------|
| `accessToken` | Yes | Auth token |
| `api_url` | Yes | REST API base (e.g. `https://work.kore.ai/api/`) |
| `userId` | Yes | User id |
| `presence_url` | Recommended | WebSocket base (e.g. `https://work.kore.ai/`) |
| `autoOpen` | No | Open panel on load (default: false) |
| `buttonLabel` | No | Button text (default: "Chat") |
| `title` | No | Panel title (default: "Eva Assistant") |
| `containerId`, `initialHistoryLimit`, `enableDebugging`, `disableHistorySectionInChatSection`, `appMetaData`, `chatInterface` | No | See package for details |

---

## API

| Method | Description |
|--------|-------------|
| `chatBot.init(config)` | Initialize once before use |
| `chatBot.open()` | Show chat panel |
| `chatBot.close()` | Hide chat panel |
| `chatBot.setChatHistoryContent(html \| node)` | Custom history sidebar content |

With script tag, use `EvaSDK.chatBot.*` instead of `chatBot.*`.  
Also: `EvaSDK.chatInterface.configure(options)`, `EvaSDK.chatInterface.startNewChat()`, `EvaSDK.destroy()`, `EvaSDK.reinitialize(config)`.

---

## Notes

- Always load SDK styles (`sdk-styles.css` or `import 'eva-web-sdk/styles'`).
- Call `init` once per page; use `EvaSDK.reinitialize(config)` to re-init with new config.
