// 在沙箱 VM 中加载 script.js，提供伪造的 `server` 模块与模拟的
// Gotify HTTP 服务端，然后驱动已注册的渠道处理器。
// 无需运行 Komari 实例即可验证插件逻辑。
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join, resolve } from "node:path";
import vm from "node:vm";

const root = resolve(import.meta.dirname, "..");
const code = await readFile(join(root, "script.js"), "utf8");

function assert(condition, label) {
  if (!condition) throw new Error("assertion failed: " + label);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`assertion failed: ${label}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}

function sampleNotification() {
  return {
    event: {
      event: "Offline",
      clients: [{ uuid: "abc", name: "Web-01" }],
      time: "2026-01-01T00:00:00Z",
      message: "",
      emoji: "🔴",
    },
    title: "Offline",
    message: "🔴🔴🔴\nEvent: Offline\nClients: Web-01\nMessage: \nTime: 2026-01-01 00:00:00",
  };
}

let captured = null;
const fakeServer = {
  registerNotificationChannel(id, configuration, handler) {
    captured = { id, configuration, handler };
  },
};

const context = vm.createContext({
  require(name) {
    if (name === "server") return fakeServer;
    throw new Error("unexpected module requested by the plugin: " + name);
  },
  fetch,
  URL,
  URLSearchParams,
  console,
  setTimeout,
  clearTimeout,
});

vm.runInContext(code, context, { filename: "script.js" });

assert(typeof context.load === "function", "load() is defined");
context.load();
assert(captured !== null, "a notification channel was registered");
assertEqual(captured.id, "gotify", "channel id");
assert(Array.isArray(captured.configuration.data), "configuration.data is an array");
assertEqual(captured.configuration.data.length, 5, "configuration field count");
assertEqual(captured.configuration.data[0].key, "server_url", "first config key");
assertEqual(captured.configuration.data[0].required, true, "server_url is required");

let lastRequest = null;
const mock = createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    lastRequest = { method: request.method, url: request.url, headers: request.headers, body };
    if (request.headers["x-gotify-key"] !== "A.TestToken") {
      response.writeHead(401, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({ error: "Unauthorized", errorCode: 401, errorDescription: "bad token" }),
      );
      return;
    }
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ id: 1, appid: 1, message: "ok", date: "2026-01-01T00:00:00Z" }));
  });
});

await new Promise((resolveListen) => mock.listen(0, "127.0.0.1", resolveListen));
const base = `http://127.0.0.1:${mock.address().port}`;

try {
  // 正常路径：通过请求头鉴权，优先级 + Markdown + 点击地址均映射到 extras。
  await captured.handler(sampleNotification(), {
    server_url: base + "/",
    token: "A.TestToken",
    priority: 8,
    markdown: true,
    click_url: "https://komari.example",
  });

  assertEqual(lastRequest.method, "POST", "request method");
  assertEqual(lastRequest.url, "/message", "request path");
  assertEqual(lastRequest.headers["x-gotify-key"], "A.TestToken", "X-Gotify-Key header");
  assertEqual(lastRequest.headers["content-type"], "application/json", "content type");

  const sent = JSON.parse(lastRequest.body);
  assertEqual(sent.title, "Offline", "title");
  assertEqual(sent.priority, 8, "priority");
  assertEqual(sent.extras["client::display"].contentType, "text/markdown", "markdown extra");
  assertEqual(
    sent.extras["client::notification"].click.url,
    "https://komari.example",
    "click url extra",
  );
  assert(sent.message.includes("  \n"), "markdown hard line breaks");
  assert(!sent.message.includes("Time: 2026-01-01 00:00:00\n"), "no soft line breaks remain");

  // 禁用 Markdown -> 不产生 contentType 附加项。
  lastRequest = null;
  await captured.handler(sampleNotification(), {
    server_url: base,
    token: "A.TestToken",
    priority: 5,
    markdown: false,
  });
  const plain = JSON.parse(lastRequest.body);
  assert(plain.extras === undefined, "no extras when markdown disabled and no click url");

  // 错误路径：Token 错误 -> 401 以抛出异常的形式暴露。
  lastRequest = null;
  let rejected = false;
  try {
    await captured.handler(sampleNotification(), { server_url: base, token: "wrong" });
  } catch (error) {
    rejected = true;
    assert(String(error.message).includes("401"), "error mentions the HTTP status");
  }
  assert(rejected, "handler rejects on non-2xx response");

  // 缺少配置 -> 在发起请求前直接拒绝。
  rejected = false;
  try {
    await captured.handler(sampleNotification(), {});
  } catch (error) {
    rejected = true;
    assert(/server url/.test(String(error.message)), "error explains missing server url");
  }
  assert(rejected, "handler rejects on empty config");

  console.log("PASS: gotify plugin logic verified (auth, body, extras, markdown, errors)");
} finally {
  mock.close();
}
