// 使用纯 Node 编码器（无依赖）生成 256x256 的 RGBA PNG 图标。
// 通过 `npm run icon` 运行一次并提交生成结果。
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";

const root = resolve(import.meta.dirname, "..");
const SIZE = 256;
const pixels = Buffer.alloc(SIZE * SIZE * 4); // 透明的 RGBA 缓冲

function setPixel(x, y, color) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const index = (y * SIZE + x) * 4;
  const alpha = color[3] === undefined ? 255 : color[3];
  if (alpha === 255) {
    pixels[index] = color[0];
    pixels[index + 1] = color[1];
    pixels[index + 2] = color[2];
    pixels[index + 3] = 255;
    return;
  }
  const existing = pixels[index + 3];
  if (existing === 255) return;
  const src = alpha / 255;
  const dst = existing / 255;
  const out = src + dst * (1 - src);
  if (out <= 0) return;
  pixels[index] = Math.round((color[0] * src + pixels[index] * dst * (1 - src)) / out);
  pixels[index + 1] = Math.round((color[1] * src + pixels[index + 1] * dst * (1 - src)) / out);
  pixels[index + 2] = Math.round((color[2] * src + pixels[index + 2] * dst * (1 - src)) / out);
  pixels[index + 3] = Math.round(out * 255);
}

function inRoundedRect(x, y, radius) {
  const max = SIZE - 1;
  const closestX = x < radius ? radius : x > max - radius ? max - radius : x;
  const closestY = y < radius ? radius : y > max - radius ? max - radius : y;
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy <= radius * radius;
}

function fillCircle(cx, cy, radius, color) {
  const r2 = radius * radius;
  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPixel(x, y, color);
    }
  }
}

function fillRect(x0, y0, x1, y1, color) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setPixel(x, y, color);
  }
}

// 背景：圆角方形内的垂直蓝色渐变。
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (!inRoundedRect(x, y, 52)) continue;
    const t = y / (SIZE - 1);
    setPixel(x, y, [
      Math.round(37 + (29 - 37) * t),
      Math.round(99 + (78 - 99) * t),
      Math.round(235 + (216 - 235) * t),
      255,
    ]);
  }
}

// 铃铛轮廓（原始造型，由基本图形拼合而成）。
const white = [255, 255, 255, 255];
fillCircle(128, 62, 9, white); // 顶部圆钮
fillCircle(128, 110, 46, white); // 钟形穹顶
fillRect(82, 110, 174, 166, white); // 主体
fillCircle(76, 170, 10, white); // 底座左端
fillCircle(180, 170, 10, white); // 底座右端
fillRect(76, 160, 180, 176, white); // 底座横条
fillCircle(128, 194, 12, white); // 铃舌

// 穹顶下方的小缺口，让铃铛看起来是一个造型而非一团色块。
setPixel(0, 0, [0, 0, 0, 0]);

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

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuffer = Buffer.from(type, "ascii");
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

const stride = SIZE * 4 + 1;
const raw = Buffer.alloc(stride * SIZE);
for (let y = 0; y < SIZE; y++) {
  raw[y * stride] = 0; // 过滤类型：无
  pixels.copy(raw, y * stride + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // 位深
ihdr[9] = 6; // 颜色类型：RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const output = join(root, "icon.png");
await writeFile(output, png);
console.log(`wrote ${output} (${png.length} bytes)`);
