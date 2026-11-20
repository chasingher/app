import express from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate compliant PNG icons for PWA (192x192, 512x512, 180x180 apple-touch-icon)
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createHeartPng(size: number, maskable = false): Buffer {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const scale = maskable ? 1.32 : 1.08;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // filter type 0
    const ny = ((0.46 - y / size) * 2.6) * scale;
    for (let x = 0; x < size; x++) {
      const nx = ((x / size - 0.5) * 2.6) * scale;
      const distCenter = Math.sqrt((x / size - 0.5) ** 2 + (y / size - 0.5) ** 2);
      const heartVal = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * Math.pow(ny, 3);

      let r = 58;
      let g = 13;
      let b = 24;
      if (distCenter < 0.42) {
        r = 78;
        g = 18;
        b = 34;
      }
      if (Math.abs(distCenter - (maskable ? 0.35 : 0.41)) < 0.012) {
        r = 226;
        g = 185;
        b = 111;
      }
      if (heartVal <= 0) {
        const shade = Math.max(0, Math.min(1, (0.5 - y / size) + 0.5));
        r = Math.round(165 + shade * 65);
        g = Math.round(24 + shade * 36);
        b = Math.round(68 + shade * 42);
      }

      const px = rowStart + 1 + x * 4;
      raw[px] = r;
      raw[px + 1] = g;
      raw[px + 2] = b;
      raw[px + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw, { level: 6 });
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function ensurePwaIcons() {
  const pubDir = path.resolve(__dirname, 'public');
  if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });
  const targets = [
    { file: 'pwa-192x192.png', size: 192, maskable: false },
    { file: 'pwa-512x512.png', size: 512, maskable: false },
    { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
    { file: 'apple-touch-icon.png', size: 180, maskable: false },
  ];
  for (const t of targets) {
    const filePath = path.join(pubDir, t.file);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, createHeartPng(t.size, t.maskable));
    }
  }
}

interface StoredFirebaseConfig {
  projectId: string;
  databaseId: string;
  storageBucket: string;
  publicBaseUrl: string;
  enabled: boolean;
}

interface FirebaseMediaRecord {
  id: string;
  objectKey: string;
  fileName: string;
  kind: 'images' | 'video' | 'voice' | 'music';
  contentType: string;
  sizeBytes: number;
  originalBytes?: number;
  savedBytes?: number;
  width?: number;
  height?: number;
  projectSlug: string;
  url: string;
  storageTier: 'firebase-5gb';
  createdAt: string;
}

const FIREBASE_APPLET_CONFIG_PATH = path.resolve(__dirname, 'firebase-applet-config.json');
const FIREBASE_UPLOAD_DIR = path.resolve(__dirname, 'public/uploads/firebase');

function loadFirebaseConfig(): StoredFirebaseConfig {
  let appletCfg: { projectId?: string; firestoreDatabaseId?: string; storageBucket?: string } = {};
  try {
    if (fs.existsSync(FIREBASE_APPLET_CONFIG_PATH)) {
      appletCfg = JSON.parse(fs.readFileSync(FIREBASE_APPLET_CONFIG_PATH, 'utf-8'));
    }
  } catch {
    // ignore
  }
  return {
    projectId: appletCfg.projectId || 'gen-lang-client-0322444571',
    databaseId:
      appletCfg.firestoreDatabaseId ||
      'ai-studio-chasingher-f7a61704-2cdd-4e3c-af0b-e387f983103a',
    storageBucket:
      appletCfg.storageBucket || 'gen-lang-client-0322444571.firebasestorage.app',
    publicBaseUrl: '',
    enabled: true,
  };
}

// Start with a completely clean media catalog (0 legacy test files)
const mediaCatalog: FirebaseMediaRecord[] = [];

async function startServer() {
  ensurePwaIcons();
  if (!fs.existsSync(FIREBASE_UPLOAD_DIR)) {
    fs.mkdirSync(FIREBASE_UPLOAD_DIR, { recursive: true });
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // 1. Firebase 5GB Free Plan Storage & Firestore Database Status
  app.get('/api/firebase/status', (_req, res) => {
    const cfg = loadFirebaseConfig();
    const usedBytes = mediaCatalog.reduce((sum, item) => sum + item.sizeBytes, 0);
    const savedBytesByCompression = mediaCatalog.reduce(
      (sum, item) => sum + (item.savedBytes || 0),
      0
    );
    res.json({
      config: cfg,
      firebase: {
        projectId: cfg.projectId,
        databaseId: cfg.databaseId,
        storageBucket: cfg.storageBucket,
        planCapacityBytes: 5 * 1024 * 1024 * 1024,
      },
      connectionMode: 'firebase_live',
      endpoint: `https://firebasestorage.googleapis.com/v0/b/${cfg.storageBucket}`,
      usedBytes,
      savedBytesByCompression,
      capacityBytes: 5 * 1024 * 1024 * 1024, // 5 GB Firebase Free Plan storage capacity
      objectCount: mediaCatalog.length,
      objects: mediaCatalog.slice(0, 50),
    });
  });

  // 2. Clean / Reset Media Catalog & Temp Files
  app.post('/api/firebase/clean', (_req, res) => {
    for (const item of mediaCatalog) {
      try {
        const localFilePath = path.join(FIREBASE_UPLOAD_DIR, item.objectKey);
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
      } catch {
        // ignore
      }
    }
    mediaCatalog.length = 0;
    res.json({ ok: true, cleaned: true, objectCount: 0, usedBytes: 0 });
  });

  // 3. Firebase Media Upload (Auto-Compressed WebP Images, Video, Voice Notes, Music)
  app.post('/api/firebase/upload', async (req, res) => {
    try {
      const { fileName, contentType, kind, projectSlug, originalBytes, width, height, base64Data } =
        req.body || {};
      if (!fileName || !base64Data) {
        res.status(400).json({ error: 'Missing fileName or base64Data' });
        return;
      }

      const safeSlug = (projectSlug || 'general').replace(/[^a-zA-Z0-9_-]/g, '-');
      const safeKind = ['images', 'video', 'voice', 'music'].includes(kind) ? kind : 'images';
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
      const stamp = Date.now().toString(36);
      const objectKey = `projects/${safeSlug}/${safeKind}/${stamp}-${safeName}`;

      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      const buffer = Buffer.from(cleanBase64, 'base64');

      const localFilePath = path.join(FIREBASE_UPLOAD_DIR, objectKey);
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
      fs.writeFileSync(localFilePath, buffer);
      const finalUrl = `/uploads/firebase/${objectKey}`;

      const rawOriginal =
        typeof originalBytes === 'number' && originalBytes >= buffer.length
          ? originalBytes
          : buffer.length;

      const record: FirebaseMediaRecord = {
        id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        objectKey,
        fileName: safeName,
        kind: safeKind as FirebaseMediaRecord['kind'],
        contentType: contentType || 'application/octet-stream',
        sizeBytes: buffer.length,
        originalBytes: rawOriginal,
        savedBytes: Math.max(0, rawOriginal - buffer.length),
        width: typeof width === 'number' ? width : undefined,
        height: typeof height === 'number' ? height : undefined,
        projectSlug: safeSlug,
        url: finalUrl,
        storageTier: 'firebase-5gb',
        createdAt: new Date().toISOString(),
      };
      mediaCatalog.unshift(record);

      res.json({ ok: true, object: record });
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Failed to upload media to Firebase storage',
      });
    }
  });

  app.delete('/api/firebase/objects/:id', (req, res) => {
    const idx = mediaCatalog.findIndex((m) => m.id === req.params.id);
    if (idx !== -1) {
      const removed = mediaCatalog[idx];
      mediaCatalog.splice(idx, 1);
      try {
        const localFilePath = path.join(FIREBASE_UPLOAD_DIR, removed.objectKey);
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
      } catch {
        // ignore
      }
    }
    res.json({ ok: true });
  });

  app.post('/api/firebase/delete-by-url', (req, res) => {
    const targetUrl = String(req.body?.url || '').trim();
    if (!targetUrl) {
      res.json({ ok: true, deleted: false });
      return;
    }
    const idx = mediaCatalog.findIndex(
      (m) => m.url === targetUrl || m.objectKey === targetUrl
    );
    if (idx !== -1) {
      const removed = mediaCatalog[idx];
      mediaCatalog.splice(idx, 1);
      try {
        const localFilePath = path.join(FIREBASE_UPLOAD_DIR, removed.objectKey);
        if (fs.existsSync(localFilePath)) fs.unlinkSync(localFilePath);
      } catch {
        // ignore
      }
      res.json({ ok: true, deleted: true });
      return;
    }
    res.json({ ok: true, deleted: false });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    // When HMR & WebSockets are disabled (e.g. behind AI Studio HTTPS proxy),
    // Vite 8 still injects /@vite/client which tries to connect to ws://...:24678.
    // Serve a clean WebSocket-free /@vite/client shim so CSS injection and
    // import.meta.hot calls work seamlessly with zero WebSocket errors.
    const noWsViteClient = `
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]').forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  const noop = () => {};
  return {
    data: {},
    accept: noop,
    acceptExports: noop,
    dispose: noop,
    prune: noop,
    decline: noop,
    invalidate: noop,
    on: noop,
    off: noop,
    send: noop,
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (search ? "&" + search.slice(1) : "") + (hash || "");
}
export class ErrorOverlay extends (typeof HTMLElement !== "undefined" ? HTMLElement : Object) {}
`;

    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(noWsViteClient);
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Chasing Her server running on http://localhost:${PORT}`);
  });
}

startServer();
