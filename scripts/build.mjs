// 将插件打包为 dist/<short>.zip 并输出其 SHA-256 摘要。
// 特意不依赖第三方库：它只校验源文件并写入 ZIP，
// 绝不执行插件代码。
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { deflateRawSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const dist = join(root, "dist");
const EXPECTED_VERSION = "1.0.6";
const EXPECTED_KOMARI = ">=1.6.0";

function fail(message) {
  console.error("error: " + message);
  process.exit(1);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

// 极简的确定性 ZIP 写入器（deflate 压缩、UTF-8 文件名、无数据描述符）。
function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.data;
    const compressed = deflateRawSync(data, { level: 9 });
    const checksum = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(8), u16(0), u16(0),
      u32(checksum), u32(compressed.length), u32(data.length),
      u16(name.length), u16(0), name, compressed,
    ]);
    localParts.push(local);
    centralParts.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(8), u16(0), u16(0),
      u32(checksum), u32(compressed.length), u32(data.length),
      u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += local.length;
  }
  const localData = Buffer.concat(localParts);
  const centralData = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralData.length), u32(localData.length), u16(0),
  ]);
  return Buffer.concat([localData, centralData, end]);
}

const manifestRaw = await readFile(join(root, "komari-plugin.json"), "utf8");
let manifest;
try {
  manifest = JSON.parse(manifestRaw);
} catch (error) {
  fail("komari-plugin.json is not valid JSON: " + error.message);
}

const short = manifest.short;
if (typeof short !== "string" || !/^(?!default$)[A-Za-z0-9_-]+$/.test(short)) {
  fail("manifest.short is invalid: " + JSON.stringify(short));
}
if (!manifest.name) fail("manifest.name is required");
if (manifest.version !== EXPECTED_VERSION) {
  fail(`manifest.version must be ${EXPECTED_VERSION}, got ${JSON.stringify(manifest.version)}`);
}
if (manifest.komari !== EXPECTED_KOMARI) {
  fail(`manifest.komari must be "${EXPECTED_KOMARI}", got ${JSON.stringify(manifest.komari)}`);
}

const entry = manifest.entry || "script.js";
const entryPath = join(root, entry);
if (!existsSync(entryPath)) fail("entry file not found: " + entry);

const syntax = spawnSync(process.execPath, ["--check", entryPath], { encoding: "utf8" });
if (syntax.status !== 0) {
  fail("entry syntax check failed:\n" + (syntax.stderr || "").trim());
}

const names = ["komari-plugin.json", entry];
if (manifest.icon) names.push(manifest.icon);

const entries = [];
for (const name of names) {
  const file = join(root, name);
  if (!existsSync(file)) fail("missing file referenced by the manifest: " + name);
  entries.push({ name, data: await readFile(file) });
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const zip = createZip(entries);
const output = join(dist, `${short}.zip`);
await writeFile(output, zip);
const digest = createHash("sha256").update(zip).digest("hex");
await writeFile(join(dist, "SHA256SUMS.txt"), `${digest}  ${basename(output)}\n`);

console.log(`built ${basename(output)} (${zip.length} bytes, ${entries.length} files)`);
console.log(`sha256 ${digest}`);
