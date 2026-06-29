// Cleans the Davi fairy face sprites:
//  1) flood-fills the baked-in light checkerboard background to REAL transparency
//  2) re-aligns every frame to a common top-center anchor so the head doesn't jitter
//  3) feathers the keyed edge to avoid a light halo
// Input:  src/assets/sprites/davi/*.png (original generator output, opaque bg)
// Output: src/assets/sprites/davi/clean/*.png (transparent, aligned)
const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const SRC = path.join(__dirname, "..", "src", "assets", "sprites", "davi");
const OUT = path.join(SRC, "clean");
fs.mkdirSync(OUT, { recursive: true });

const FRAMES = [
  "David_neutral_pleasant.png",
  "David_mouth_slightly_open.png",
  "David_mouth_open.png",
  "David_mouth_wide_open.png",
  "David_eyes_closed.png",
  "David_gentle_smile.png",
  "David_neutral_smile.png",
  "David_smirk.png",
];

function decodePng(file) {
  const buf = fs.readFileSync(file);
  let p = 8, width, height, colorType;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.slice(p + 8, p + 8 + len);
    if (type === "IHDR") { width = data.readUInt32BE(0); height = data.readUInt32BE(4); colorType = data[9]; }
    if (type === "IDAT") idat.push(data);
    if (type === "IEND") break;
    p += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = colorType === 6 ? 4 : 3;
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);
  const paeth = (a, b, c) => { const q = a + b - c, pa = Math.abs(q - a), pb = Math.abs(q - b), pc = Math.abs(q - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const f = raw[pos++];
    for (let x = 0; x < stride; x++) {
      const rv = raw[pos++];
      const a = x >= ch ? out[y * stride + x - ch] : 0;
      const b = y > 0 ? out[(y - 1) * stride + x] : 0;
      const c = (x >= ch && y > 0) ? out[(y - 1) * stride + x - ch] : 0;
      let v;
      if (f === 0) v = rv; else if (f === 1) v = rv + a; else if (f === 2) v = rv + b;
      else if (f === 3) v = rv + ((a + b) >> 1); else v = rv + paeth(a, b, c);
      out[y * stride + x] = v & 255;
    }
  }
  // normalize to RGBA
  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++) {
    rgba[j++] = out[i * ch]; rgba[j++] = out[i * ch + 1]; rgba[j++] = out[i * ch + 2];
    rgba[j++] = ch === 4 ? out[i * ch + 3] : 255;
  }
  return { rgba, width, height };
}

function encodePng(rgba, width, height) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const comp = zlib.deflateSync(raw, { level: 9 });
  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td) >>> 0, 0);
    return Buffer.concat([len, td, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", comp), chunk("IEND", Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c ^ 0xffffffff; }

// background = light & low-saturation (the checkerboard squares ~240/253)
const isBg = (r, g, b) => { const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx > 205 && (mx - mn) < 24; };

function process(file) {
  const { rgba, width, height } = decodePng(path.join(SRC, file));
  const N = width * height;
  const bg = new Uint8Array(N); // 1 = background (border-connected light)
  const stack = [];
  const at = (x, y) => y * width + x;
  const pixBg = (x, y) => { const i = at(x, y) * 4; return isBg(rgba[i], rgba[i + 1], rgba[i + 2]); };
  for (let x = 0; x < width; x++) { stack.push(x, 0, x, height - 1); }
  for (let y = 0; y < height; y++) { stack.push(0, y, width - 1, y); }
  while (stack.length) {
    const y = stack.pop(), x = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const id = at(x, y);
    if (bg[id]) continue;
    if (!pixBg(x, y)) continue;
    bg[id] = 1;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  // set alpha 0 on bg; feather 1px ring (reduce alpha + on light edge pixels)
  for (let i = 0; i < N; i++) if (bg[i]) rgba[i * 4 + 3] = 0;
  // edge feather: any kept light pixel touching transparent → soften
  const softened = Buffer.from(rgba);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const id = at(x, y); if (bg[id]) continue;
    let touchT = false;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height || bg[at(nx, ny)]) { touchT = true; break; }
    }
    if (touchT) {
      const i = id * 4, r = rgba[i], g = rgba[i + 1], b = rgba[i + 2];
      if (isBg(r, g, b)) softened[i + 3] = 0; // halo pixel → drop
      else softened[i + 3] = Math.min(softened[i + 3], 180);
    }
  }
  // figure bbox from alpha
  let minx = width, miny = height, maxx = 0, maxy = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (softened[at(x, y) * 4 + 3] > 8) { if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; }
  }
  return { rgba: softened, width, height, minx, miny, maxx, maxy };
}

// pass 1: process + collect bboxes
const processed = FRAMES.map((f) => ({ f, ...process(f) }));
const maxW = Math.max(...processed.map((p) => p.maxx - p.minx + 1));
const maxH = Math.max(...processed.map((p) => p.maxy - p.miny + 1));
// uniform canvas with margin; figure top-centered (anchor head to a fixed top)
const PAD_X = 12, PAD_TOP = 10, PAD_BOT = 10;
const CW = maxW + PAD_X * 2;
const CH = maxH + PAD_TOP + PAD_BOT;

console.log("frames:", processed.length, "common canvas:", CW + "x" + CH, "(maxFig " + maxW + "x" + maxH + ")");

for (const p of processed) {
  const figW = p.maxx - p.minx + 1, figH = p.maxy - p.miny + 1;
  const out = Buffer.alloc(CW * CH * 4); // transparent
  const offX = Math.round((CW - figW) / 2) - p.minx; // horizontal center
  const offY = PAD_TOP - p.miny;                     // anchor figure top
  for (let y = p.miny; y <= p.maxy; y++) {
    for (let x = p.minx; x <= p.maxx; x++) {
      const dx = x + offX, dy = y + offY;
      if (dx < 0 || dy < 0 || dx >= CW || dy >= CH) continue;
      const si = (y * p.width + x) * 4, di = (dy * CW + dx) * 4;
      out[di] = p.rgba[si]; out[di + 1] = p.rgba[si + 1]; out[di + 2] = p.rgba[si + 2]; out[di + 3] = p.rgba[si + 3];
    }
  }
  const png = encodePng(out, CW, CH);
  fs.writeFileSync(path.join(OUT, p.f), png);
  console.log("  wrote clean/" + p.f, "fig " + figW + "x" + figH);
}
console.log("done →", OUT);
