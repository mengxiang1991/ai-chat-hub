# ChatHub - AI 平台聚合器

一个 Electron 桌面应用，用于聚合多个 AI 平台（豆包、DeepSeek、元宝、Perplexity），实现：

- 在单个窗口内**对比多个 AI 平台的回答**
- 使用 BrowserView 内嵌浏览器，**用户无感知**
- 支持**添加自定义平台**
- **"ALL in One"** 模式一键发送问题到所有平台

## 功能特点

- 多平台支持：豆包、DeepSeek、元宝、Perplexity
- BrowserView 技术：原站体验，无需离开应用
- ALL in One：一个问题，同时获取所有平台的回答
- 自定义平台：可添加任何网页平台
- 分屏布局：并排对比不同平台的回答

## 技术栈

- **Electron** - 桌面应用框架
- **React** - 前端 UI
- **TypeScript** - 类型安全
- **Vite** - 快速构建工具

## 项目结构

```
chat-hub/
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.ts           # 入口，创建窗口，注册 IPC
│   │   ├── view-manager.ts    # BrowserView 管理（核心）
│   │   ├── platform-handler.ts # 平台操作 IPC 处理器
│   │   └── store.ts           # electron-store 持久化
│   ├── preload/        # 预加载脚本
│   │   └── index.ts   # contextBridge 暴露 electronAPI
│   ├── renderer/       # React 前端
│   │   ├── App.tsx            # 根组件
│   │   └── components/        # UI 组件
│   └── platforms/     # 平台适配器
│       ├── base.ts           # PlatformAdapter 接口
│       ├── registry.ts       # 平台注册表
│       ├── doubao.ts, deepseek.ts, yuanbao.ts, perplexity.ts
│
├── electron-builder.yml  # 打包配置
├── package.json
└── vite.config.ts
```

## 开发

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

启动后会自动打开 Electron 窗口和 Vite 开发服务器。

### 构建

```bash
# 构建 Electron 应用
npm run build

# 打包为可执行文件
npm run dist
```

## 使用方法

1. **启动应用**：运行 `npm run dev`
2. **登录平台**：首次使用需要登录各 AI 平台（点击侧边栏平台右侧的 `...`）
3. **ALL in One 模式**：
   - 点击 "⚡ ALL in One" 按钮
   - 输入问题并发送
   - 等待所有平台返回回答
4. **单平台模式**：点击侧边栏任意平台切换

## 平台适配器

每个平台都有独立的适配器实现，位于 `src/platforms/` 目录。适配器需实现以下接口：

- `isLoggedIn()` - 检查是否已登录
- `login()` - 执行登录流程
- `ask()` - 发送问题并获取回答
- `logout()` - 退出登录

## License

MIT
