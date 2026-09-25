# Komari Gotify Notification Plugin

[简体中文](./README.md) | [English](#english)

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
