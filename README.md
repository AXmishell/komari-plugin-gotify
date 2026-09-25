# Komari Gotify Notification Plugin

[简体中文](#简体中文) | [English](#english)

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

### 发布到 Komari 插件市场

1. 修改 `komari-plugin.json` 中的 `author`，并补上仓库地址 `url`（可选但推荐）。
2. 打标签并推送，CI 会自动构建并创建 GitHub Release：
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. 在 [plugin-market](https://github.com/komari-monitor/plugin-market/issues/new/choose) 选择
   *GitHub 托管插件* 模板提交仓库地址。市场会自动读取最新 Release。
   - 目录中 `komari` 字段必须与 manifest 完全一致（本插件为 `>=1.6.0`）。
   - `download` 指向 Release 中的 ZIP，`sha256` 使用 `dist/SHA256SUMS.txt` 的值。

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

---

## English

A standalone [Komari](https://github.com/komari-monitor/komari) plugin that adds a **Gotify**
notification channel. It registers the channel via `server.registerNotificationChannel("gotify", ...)`;
select `Gotify` in the Komari notification settings and fill in the server URL and app token.

> **Requires Komari `>= 1.6.0`.** The notification-channel registration API
> (`server.registerNotificationChannel`) is available from 1.6.0. On 1.5.1 and earlier use the
> [1.5.1 fallback](#151-fallback). The plugin only uses the runtime-provided `fetch` and needs **no
> sensitive permission** (only `timeout`).

### Configuration

| Key | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `server_url` | string | yes | `https://gotify.example.com` | Gotify server URL, without a trailing slash |
| `token` | string | yes | — | Gotify application token (starts with `A`) |
| `priority` | number | no | `5` | Priority 0–10, higher is more urgent |
| `markdown` | switch | no | `true` | Render as Markdown and convert newlines to hard breaks |
| `click_url` | string | no | — | URL opened when the notification is clicked |

### Installation

1. Download `gotify-notification-plugin.zip` from [Releases](../../releases).
2. Upload the ZIP on the Komari plugin page and enable it.
3. Open **Settings → Notifications**, choose `Gotify`, and fill in the server URL and token.

The ZIP contains `komari-plugin.json`, `script.js` and `icon.png` at its root.

### Build from source

Node.js 18 or newer, no third-party dependencies:

```bash
npm run icon    # optional: regenerate icon.png
npm test        # verify the plugin logic in a sandbox against a mock Gotify server
npm run build   # produces dist/gotify-notification-plugin.zip and its SHA-256
```

The build only validates the manifest, syntax-checks the entry and packages the files; it never
executes the plugin code.

### Publishing to the plugin market

1. Set a real `author` in `komari-plugin.json` and, optionally, add your repository `url`.
2. Tag and push; CI builds and publishes a GitHub Release:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
3. Submit the repository on the [plugin-market](https://github.com/komari-monitor/plugin-market/issues/new/choose)
   using the *GitHub-hosted plugin* template.
   - The catalog `komari` field must match the manifest exactly (`>=1.6.0` here).
   - `download` points at the release ZIP and `sha256` comes from `dist/SHA256SUMS.txt`.

### 1.5.1 fallback

On Komari `<= 1.5.x`, use the built-in **JavaScript** notification channel instead: edit
[`compat/javascript-provider.js`](./compat/javascript-provider.js), fill in the server URL and token,
and paste it into the script box under **Settings → Notifications → method `JavaScript`**. It
implements `sendMessage(message, title)` and `sendEvent(event)` with the same Gotify logic.

### Notes

- The token is sent via the `X-Gotify-Key` header, so it never appears in URLs or access logs.
- If Gotify uses a **self-signed HTTPS certificate**, the runtime may refuse the connection.
  Configure a trusted certificate, or use an internal `http://` address.
- Debounce/cooldown for offline/online/traffic events is handled by Komari core; the plugin only delivers.

### License

[MIT](./LICENSE)
