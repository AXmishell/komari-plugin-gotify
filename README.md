# Komari Gotify Notification Plugin

[简体中文](#简体中文) | [English](./README-EN.md)

## 简体中文

一个为 [Komari](https://github.com/komari-monitor/komari) 提供 **Gotify** 通知渠道的独立插件。通过
`server.registerNotificationChannel("gotify", ...)` 注册渠道，在 Komari 后台的通知设置中选择 `Gotify`
并填写服务器地址与应用 Token 即可。

> **环境要求：Komari `>= 1.6.0`。**
> 通知渠道注册 API（`server.registerNotificationChannel`）自 1.6.0 起提供，1.5.1 及更早版本请使用
> 下方的 [1.5.1 兼容方案](#151-兼容方案)。插件只使用运行时提供的 `fetch`，**不需要任何敏感权限**
> （仅声明 `timeout`）。

### 配置项

| 键 | 类型 | 必填 | 默认 | 说明 |
| --- | --- | --- | --- | --- |
| `server_url` | string | 是 | `https://gotify.example.com` | Gotify 服务器地址，不含结尾斜杠 |
| `token` | string | 是 | — | Gotify 应用 Token（以 `A` 开头） |
| `priority` | number | 否 | `5` | 通知优先级 0–10，数字越大越紧急 |
| `markdown` | switch | 否 | `true` | 正文按 Markdown 渲染，并自动把换行转为硬换行 |
| `click_url` | string | 否 | — | 点击通知时打开的地址（例如 Komari 面板） |

### 安装

1. 从本仓库的 [Releases](../../releases) 下载 `gotify-notification-plugin.zip`。
2. 在 Komari 后台的插件管理页面上传 ZIP 并启用。
3. 进入 **设置 → 通知**，通知方式选择 `Gotify`，填写服务器地址与 Token。

ZIP 根目录包含 `komari-plugin.json`、`script.js`、`icon.png`，可直接被 Komari 安装器读取。

### 从源码构建

需要 Node.js 18 或更高版本，无第三方依赖：

```bash
npm run icon    # 可选：重新生成 icon.png
npm test        # 在沙箱中验证插件逻辑（模拟 Gotify 服务端）
npm run build   # 生成 dist/gotify-notification-plugin.zip 与 SHA-256
```

`npm run build` 只校验 manifest、对入口做语法检查并打包，不会执行插件代码。

### 1.5.1 兼容方案

If you are on Komari `<= 1.5.x`，可以用内置的 **JavaScript** 通知渠道代替插件：编辑
[`compat/javascript-provider.js`](./compat/javascript-provider.js)，填入服务器地址与 Token，然后粘贴到
**设置 → 通知 → 通知方式 `JavaScript`** 的脚本框中。该脚本实现 `sendMessage(message, title)` 与
`sendEvent(event)`，逻辑与插件一致。

### 注意事项

- Token 通过 `X-Gotify-Key` 请求头发送，不会出现在 URL 或访问日志中。
- 若 Gotify 使用**自签名 HTTPS 证书**，运行时可能拒绝连接；请为 Gotify 配置受信任证书，或改用内网
  `http://` 地址。
- 离线/在线/流量等事件的去抖与冷却由 Komari 核心处理，插件只负责投递。

### 许可证

[MIT](./LICENSE)
