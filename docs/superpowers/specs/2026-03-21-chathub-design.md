# ChatHub - AI Platform Aggregator Design

## Context

Users often need to compare responses from multiple AI platforms (Qwen, Doubao, DeepSeek, Perplexity, Yuanbao, etc.) when researching or verifying answers. Currently this requires opening multiple browser tabs, logging into each separately, and copying questions across. This is tedious and time-consuming.

ChatHub is a desktop application that aggregates multiple AI platforms into a single interface with a one-click "ALL in One" feature that sends a question to all platforms simultaneously and displays responses side-by-side for easy comparison.

## Design Decisions

### Tech Stack
- **Electron** desktop app — bundled Chromium enables native Playwright browser automation without external dependencies
- **React + TypeScript** frontend — lightweight, component-based UI
- **Playwright** — browser automation for platform interaction
- **electron-store** — local storage for user config and session data only

### Platform Integration: Browser Context Isolation
Each AI platform runs in its own Playwright Browser Context, isolating cookies, localStorage, and session state. This mirrors how a real browser works — no shared state between platforms.

### Extensibility: Adapter Pattern
Platforms are added via adapter files under `src/platforms/`. Each adapter implements a common interface:

```typescript
interface PlatformAdapter {
  id: string;           // unique identifier, e.g. "doubao"
  name: string;         // display name, e.g. "豆包"
  icon: string;         // emoji or icon identifier

  // Check if user is already logged in
  isLoggedIn(context: BrowserContext): Promise<boolean>;

  // Initiate login flow (navigate, fill forms, click buttons)
  login(context: BrowserContext): Promise<void>;

  // Send question and return response text
  ask(context: BrowserContext, question: string): Promise<string>;

  // Clear session
  logout(context: BrowserContext): Promise<void>;
}
```

Extension options:
- **JSON config** — for platforms with simple page structures, users can add via config file without writing code
- **TypeScript adapter** — for complex platforms requiring custom logic, drop a `.ts` file into `src/platforms/`

### UI Layout: Sidebar + Chat View
```
┌─────────────────────────────────────────────────┐
│  ChatHub                            [⚙️] [?]   │
├──────────┬──────────────────────────────────────┤
│ 平台列表  │           对话视图                   │
│ ──────── │                                      │
│ 🤖 豆包   │  用户: xxx                           │
│ 🧠 deepseek│  AI: response...                    │
│ 🌐 元宝   │                                      │
│ 🌐 perplexity│                                    │
│ ➕ 添加   │  [输入框........................]   │
│ ──────── │                        [发送] [ALL] │
│ ⚡ ALL   │                                      │
└──────────┴──────────────────────────────────────┘
```

- **Left sidebar**: Platform list with login indicators (green dot = logged in), ALL button at bottom
- **Right panel**: Chat view for selected platform; in ALL mode, splits into multiple columns
- **Input area**: Text input + Send button + ALL button

### ALL in One Flow
1. User types question and clicks ALL
2. App sends question to all logged-in platforms in parallel (Promise.all)
3. Each platform's response streams back and renders in its column
4. User can scroll/compare responses across columns

### Session Management
- Login state stored per-platform in persistent Browser Context
- Settings page shows login status for each platform with re-login/logout options
- No backend, no auth server — user's sessions stay on their machine

## File Structure

```
chat-hub/
├── src/
│   ├── platforms/          # One file per platform adapter
│   │   ├── base.ts         # PlatformAdapter interface
│   │   ├── doubao.ts       # 豆包 adapter
│   │   ├── deepseek.ts     # DeepSeek adapter
│   │   ├── yuanbao.ts      # 元宝 adapter
│   │   ├── perplexity.ts   # Perplexity adapter
│   │   └── index.ts        # Registry loader
│   ├── main/               # Electron main process
│   │   ├── index.ts        # Entry point
│   │   ├── browser.ts      # Playwright browser management
│   │   └── store.ts        # electron-store wrapper
│   ├── renderer/           # React frontend
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── AllView.tsx
│   │   │   ├── InputBar.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   │   └── usePlatform.ts
│   │   └── styles/
│   └── preload/
│       └── index.ts        # IPC bridge
├── package.json
├── electron-builder.yml
└── tsconfig.json
```

## Verification

1. **Build & Run**: `npm run build` produces an installable `.exe`; app launches without errors
2. **Platform Login**: Click Doubao in sidebar → login flow opens → complete login → green indicator shows
3. **Single Platform Chat**: Type question → send → response appears in chat view
4. **ALL in One**: Click ALL → all logged-in platforms receive question → split-column view shows responses
5. **Persistence**: Close and reopen app → login states persist without re-login
6. **Extensibility**: Add a new platform via JSON config → appears in sidebar → works without code change
