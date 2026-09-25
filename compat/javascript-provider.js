// Komari <= 1.5.x 的 “JavaScript” 通知渠道脚本。
//
// 用法：
//   设置 -> 通知 -> 通知方式：“JavaScript” -> 填写下方 GOTIFY 配置后，
//   将本文件内容粘贴到脚本框中。
//
// Komari >= 1.6.0 请改用仓库根目录下的插件。
//
// 可用的运行时 API：fetch()、xhr()、console.log()。
// 实现 sendMessage(message, title) 与 sendEvent(event)。

const GOTIFY = {
  serverUrl: "https://gotify.example.com", // 不要包含结尾斜杠
  token: "Axxxxxxxxxxxx",
  priority: 5,
  markdown: true,
  clickUrl: "", // 可选，例如你的 Komari 面板地址
};

function gotifyExtras() {
  const extras = {};
  if (GOTIFY.markdown) extras["client::display"] = { contentType: "text/markdown" };
  if (GOTIFY.clickUrl) extras["client::notification"] = { click: { url: GOTIFY.clickUrl } };
  return extras;
}

function toMarkdown(text) {
  return String(text)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n(?!\n)/g, "  \n");
}

async function gotifyPush(message, title) {
  const base = String(GOTIFY.serverUrl).replace(/\/+$/, "");
  const token = String(GOTIFY.token || "").trim();
  if (!base || !token) throw new Error("gotify is not configured");

  let body = String(message || "");
  if (GOTIFY.markdown) body = toMarkdown(body);

  const payload = {
    title: String(title || "Komari"),
    message: body,
    priority: GOTIFY.priority,
  };
  const extras = gotifyExtras();
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
    throw new Error("gotify API returned status " + response.status);
  }
  return true;
}

function sendMessage(message, title) {
  return gotifyPush(message, title);
}

function sendEvent(event) {
  const clients = Array.isArray(event.clients)
    ? event.clients.map((client) => client.name || client.uuid).join(", ")
    : "";
  const lines = [String(event.emoji || "") + " " + String(event.event || "Komari")];
  if (clients) lines.push("Clients: " + clients);
  if (event.message) lines.push("Message: " + event.message);
  if (event.time) lines.push("Time: " + event.time);
  return gotifyPush(lines.join("\n"), String(event.event || "Komari"));
}
