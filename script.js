const server = require("server");

const configuration = {
  type: "managed",
  name: {
    zh_CN: "Gotify",
    zh_TW: "Gotify",
    en: "Gotify",
    ja_JP: "Gotify",
    id_ID: "Gotify",
  },
  data: [
    {
      key: "server_url",
      name: {
        zh_CN: "Gotify 服务器地址",
        zh_TW: "Gotify 伺服器位址",
        en: "Gotify Server URL",
        ja_JP: "Gotify サーバー URL",
        id_ID: "URL Server Gotify",
      },
      type: "string",
      required: true,
      default: "https://gotify.example.com",
      help: {
        zh_CN: "例如 https://gotify.example.com，不要包含结尾斜杠",
        zh_TW: "例如 https://gotify.example.com，請勿包含結尾斜線",
        en: "For example https://gotify.example.com, without a trailing slash",
        ja_JP: "例: https://gotify.example.com（末尾のスラッシュは不要）",
        id_ID: "Contoh https://gotify.example.com, tanpa garis miring di akhir",
      },
    },
    {
      key: "token",
      name: {
        zh_CN: "应用 Token",
        zh_TW: "應用程式 Token",
        en: "App Token",
        ja_JP: "アプリケーショントークン",
        id_ID: "Token Aplikasi",
      },
      type: "string",
      required: true,
      help: {
        zh_CN: "在 Gotify 中创建应用后生成的 Token（以 A 开头）",
        zh_TW: "在 Gotify 建立應用程式後產生的 Token（以 A 開頭）",
        en: "The application token generated in Gotify (starts with A)",
        ja_JP: "Gotify でアプリ作成時に生成されるトークン（A で始まる）",
        id_ID: "Token aplikasi yang dibuat di Gotify (diawali dengan A)",
      },
    },
    {
      key: "priority",
      name: {
        zh_CN: "默认优先级",
        zh_TW: "預設優先級",
        en: "Default Priority",
        ja_JP: "既定の優先度",
        id_ID: "Prioritas Default",
      },
      type: "number",
      default: 5,
      help: {
        zh_CN: "0-10，数字越大越紧急（0 表示不通知）",
        zh_TW: "0-10，數字越大越緊急（0 表示不通知）",
        en: "0-10, higher is more urgent (0 disables the notification)",
        ja_JP: "0〜10、大きいほど緊急（0 は通知なし）",
        id_ID: "0-10, semakin besar semakin mendesak (0 menonaktifkan notifikasi)",
      },
    },
    {
      key: "markdown",
      name: {
        zh_CN: "Markdown 渲染",
        zh_TW: "Markdown 渲染",
        en: "Render Markdown",
        ja_JP: "Markdown をレンダリング",
        id_ID: "Render Markdown",
      },
      type: "switch",
      default: true,
      help: {
        zh_CN: "开启后通知正文按 Markdown 渲染（需要支持该特性的 Gotify 客户端）",
        zh_TW: "開啟後通知內容會以 Markdown 渲染（需要支援該特性的 Gotify 用戶端）",
        en: "Render the notification body as Markdown (requires a supporting Gotify client)",
        ja_JP: "通知本文を Markdown として描画します（対応クライアントが必要）",
        id_ID: "Render isi notifikasi sebagai Markdown (memerlukan klien Gotify yang mendukung)",
      },
    },
    {
      key: "click_url",
      name: {
        zh_CN: "点击跳转地址",
        zh_TW: "點擊跳轉網址",
        en: "Click URL",
        ja_JP: "クリック時の URL",
        id_ID: "URL Klik",
      },
      type: "string",
      help: {
        zh_CN: "可选，点击通知时打开的地址（例如 Komari 面板地址）",
        zh_TW: "選填，點擊通知時開啟的網址（例如 Komari 面板位址）",
        en: "Optional URL opened when the notification is clicked (for example your Komari dashboard)",
        ja_JP: "任意。通知クリック時に開く URL（例: Komari ダッシュボード）",
        id_ID: "Opsional, URL yang dibuka saat notifikasi diklik (misalnya dasbor Komari)",
      },
    },
  ],
};

function normalizeBaseUrl(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

function normalizePriority(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 5;
  return Math.min(10, Math.max(0, Math.trunc(numeric)));
}

// Gotify 渲染 Markdown 时，单个换行是软换行。把每个单换行转换为硬换行，
// 以便 Komari 模板能保留其换行格式。
function toMarkdown(text) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n(?!\n)/g, "  \n");
}

function buildExtras(config) {
  const extras = {};
  if (config.markdown !== false) {
    extras["client::display"] = { contentType: "text/markdown" };
  }
  const clickUrl = String(config.click_url || "").trim();
  if (clickUrl) {
    extras["client::notification"] = { click: { url: clickUrl } };
  }
  return extras;
}

async function readErrorDetail(response) {
  try {
    const payload = await response.json();
    if (payload && typeof payload === "object") {
      return payload.errorDescription || payload.error || "";
    }
  } catch (_) {
    // 忽略非 JSON 格式的响应体。
  }
  return "";
}

async function sendGotify(notification, config) {
  const base = normalizeBaseUrl(config.server_url);
  const token = String(config.token || "").trim();
  if (!base) throw new Error("gotify server url is required");
  if (!token) throw new Error("gotify app token is required");
  new URL(base);

  const title = String(notification.title || "Komari");
  let message = String(notification.message || "");
  if (!message) throw new Error("message is empty");
  if (config.markdown !== false) message = toMarkdown(message);

  const payload = {
    title,
    message,
    priority: normalizePriority(config.priority),
  };
  const extras = buildExtras(config);
  if (Object.keys(extras).length > 0) payload.extras = extras;

  const response = await fetch(base + "/message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Gotify-Key": token,
    },
    body: JSON.stringify(payload),
  });

  if (response.status < 200 || response.status >= 300) {
    const detail = await readErrorDetail(response);
    throw new Error(
      "gotify API returned status " + response.status + (detail ? ": " + detail : ""),
    );
  }
}

function load() {
  server.registerNotificationChannel("gotify", configuration, sendGotify);
}
