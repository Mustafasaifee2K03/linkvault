// index.js
// Complete Backend for LinkVault
// Node.js + Express + SQLite + Multer

import express from "express";
import cors from "cors";
import multer from "multer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import cron from "node-cron";

const app = express();
const PORT = 4000;

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const ALLOWED_MIME_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm"
]);

app.use(cors());
app.use(express.json());

// Ensure uploads directory exists
const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR);
}

// ---------------- DB SETUP ----------------
const db = await open({
  filename: "linkvault.db",
  driver: sqlite3.Database
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS contents (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    text_content TEXT,
    file_path TEXT,
    original_name TEXT,
    password TEXT,
    one_time INTEGER DEFAULT 0,
    created_at INTEGER,
    expires_at INTEGER,
    owner_id TEXT
  )
`);

await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

await db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`);

const ensureColumns = async () => {
  const columns = await db.all("PRAGMA table_info(contents)");
  const names = new Set(columns.map((col) => col.name));

  const addColumn = async (name, definition) => {
    if (!names.has(name)) {
      await db.exec(`ALTER TABLE contents ADD COLUMN ${name} ${definition}`);
      names.add(name);
    }
  };

  await addColumn("delete_token", "TEXT");
  await addColumn("max_views", "INTEGER");
  await addColumn("view_count", "INTEGER DEFAULT 0");
  await addColumn("file_size", "INTEGER");
  await addColumn("file_mime", "TEXT");
  await addColumn("owner_id", "TEXT");
};

await ensureColumns();

// ---------------- MULTER SETUP ----------------
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const id = uuidv4();
    req.generatedId = id;
    const ext = path.extname(file.originalname);
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error("INVALID_FILE_TYPE"));
    }
    return cb(null, true);
  }
});

const deleteContentRow = async (row) => {
  if (!row) return;
  if (row.file_path && fs.existsSync(row.file_path)) {
    fs.unlinkSync(row.file_path);
  }
  await db.run("DELETE FROM contents WHERE id = ?", [row.id]);
};

const getCleanInteger = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
};

const normalizeEmail = (email) => (email || "").trim().toLowerCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const getAuthToken = (req) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
};

const createSession = async (userId) => {
  const token = uuidv4();
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_TTL_MS;
  await db.run(
    "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
    [token, userId, createdAt, expiresAt]
  );
  return { token, expiresAt };
};

const attachUser = async (req, res, next) => {
  try {
    const token = getAuthToken(req);
    if (!token) {
      req.user = null;
      return next();
    }

    const row = await db.get(
      `
        SELECT
          users.id AS user_id,
          users.email AS email,
          sessions.expires_at AS expires_at
        FROM sessions
        JOIN users ON sessions.user_id = users.id
        WHERE sessions.token = ?
      `,
      [token]
    );

    if (!row || row.expires_at < Date.now()) {
      await db.run("DELETE FROM sessions WHERE token = ?", [token]);
      req.user = null;
      return next();
    }

    req.user = { id: row.user_id, email: row.email, token };
    return next();
  } catch (err) {
    return next(err);
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "UNAUTHORIZED" });
  }
  return next();
};

app.use(attachUser);

// ---------------- AUTH API ----------------
app.post("/api/register", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password || "";

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "INVALID_EMAIL" });
  }

  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return res.status(400).json({ error: "WEAK_PASSWORD" });
  }

  const existing = await db.get("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) {
    return res.status(409).json({ error: "EMAIL_EXISTS" });
  }

  const userId = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = Date.now();

  await db.run(
    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    [userId, email, passwordHash, createdAt]
  );

  const session = await createSession(userId);
  return res.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id: userId, email }
  });
});

app.post("/api/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password || "";

  if (!email || !password) {
    return res.status(400).json({ error: "INVALID_CREDENTIALS" });
  }

  const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
  if (!user) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  }

  const session = await createSession(user.id);
  return res.json({
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id: user.id, email: user.email }
  });
});

app.get("/api/me", requireAuth, async (req, res) => {
  return res.json({ user: { id: req.user.id, email: req.user.email } });
});

app.post("/api/logout", requireAuth, async (req, res) => {
  await db.run("DELETE FROM sessions WHERE token = ?", [req.user.token]);
  return res.json({ success: true });
});

app.get("/api/my-contents", requireAuth, async (req, res) => {
  const rows = await db.all(
    `
      SELECT id, type, original_name, created_at, expires_at, view_count, max_views
      FROM contents
      WHERE owner_id = ?
      ORDER BY created_at DESC
    `,
    [req.user.id]
  );

  const items = rows.map((row) => ({
    id: row.id,
    type: row.type,
    originalName: row.original_name,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    viewCount: row.view_count ?? 0,
    maxViews: row.max_views ?? null
  }));

  return res.json({ items });
});

// ---------------- UPLOAD API ----------------
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const { text, expiryMinutes, password, oneTime, maxViews } = req.body;

    if (!text && !req.file) {
      return res.status(400).json({ error: "Text or file required" });
    }

    const id = req.generatedId || uuidv4();
    const createdAt = Date.now();
    const expiryMinutesValue = getCleanInteger(expiryMinutes) || 10;
    const expiresAt = createdAt + expiryMinutesValue * 60 * 1000;
    const maxViewsValue = getCleanInteger(maxViews);
    const deleteToken = uuidv4();
    const ownerId = req.user ? req.user.id : null;

    if (req.file) {
      await db.run(`
        INSERT INTO contents
        (id, type, file_path, original_name, password, one_time, created_at, expires_at, delete_token, max_views, file_size, file_mime, owner_id)
        VALUES (?, 'file', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        req.file.path,
        req.file.originalname,
        password || null,
        oneTime ? 1 : 0,
        createdAt,
        expiresAt,
        deleteToken,
        maxViewsValue,
        req.file.size,
        req.file.mimetype,
        ownerId
      ]);
    } else {
      await db.run(`
        INSERT INTO contents
        (id, type, text_content, password, one_time, created_at, expires_at, delete_token, max_views, owner_id)
        VALUES (?, 'text', ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id,
        text,
        password || null,
        oneTime ? 1 : 0,
        createdAt,
        expiresAt,
        deleteToken,
        maxViewsValue,
        ownerId
      ]);
    }

    res.json({
      id,
      link: `http://localhost:5173/view/${id}`,
      expiresAt,
      deleteToken,
      viewCount: 0,
      maxViews: maxViewsValue
    });

  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

app.post("/api/access/:id", async (req, res) => {
  const { password } = req.body;
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row) {
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  if (Date.now() > row.expires_at) {
    await deleteContentRow(row);
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  if (row.password && row.password !== password) {
    return res.status(403).json({ error: "INVALID_PASSWORD" });
  }

  if (row.max_views !== null && row.view_count >= row.max_views) {
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  const update = await db.run(
    "UPDATE contents SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ? AND (max_views IS NULL OR COALESCE(view_count, 0) < max_views)",
    [row.id]
  );

  if (!update || update.changes === 0) {
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  const updated = await db.get(
    "SELECT view_count, max_views, one_time, type FROM contents WHERE id = ?",
    [row.id]
  );

  if (row.type === "text") {
    res.json({
      type: row.type,
      text: row.text_content,
      originalName: row.original_name,
      requiresPassword: !!row.password,
      viewCount: updated?.view_count ?? 0,
      maxViews: updated?.max_views ?? null
    });

    if (updated && updated.one_time) {
      await deleteContentRow(row);
    }

    return;
  }

  res.json({
    type: row.type,
    text: null,
    originalName: row.original_name,
    requiresPassword: !!row.password,
    viewCount: updated?.view_count ?? 0,
    maxViews: updated?.max_views ?? null
  });
});

app.post("/api/view/:id", async (req, res) => {
  const { password } = req.body;
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row) {
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  if (Date.now() > row.expires_at) {
    await deleteContentRow(row);
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  if (row.password && row.password !== password) {
    return res.status(403).json({ error: "INVALID_PASSWORD" });
  }

  if (row.max_views !== null && row.view_count >= row.max_views) {
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  const update = await db.run(
    "UPDATE contents SET view_count = view_count + 1 WHERE id = ? AND (max_views IS NULL OR view_count < max_views)",
    [row.id]
  );

  if (!update || update.changes === 0) {
    return res.status(403).json({ error: "EXPIRED_OR_INVALID" });
  }

  const updated = await db.get(
    "SELECT view_count, max_views, one_time, type, file_path FROM contents WHERE id = ?",
    [row.id]
  );

  if (updated && updated.one_time && updated.type === "text") {
    await deleteContentRow(row);
  }

  res.json({ viewCount: updated?.view_count ?? 0, maxViews: updated?.max_views ?? null });
});

app.post("/api/stats/:id", async (req, res) => {
  const { deleteToken } = req.body;
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);
  const isOwner = req.user && row && row.owner_id === req.user.id;

  if (!row || (!isOwner && (!deleteToken || row.delete_token !== deleteToken))) {
    return res.sendStatus(403);
  }

  res.json({
    viewCount: row.view_count || 0,
    maxViews: row.max_views
  });
});

// ---------------- VIEW CONTENT ----------------
app.get("/api/content/:id", async (req, res) => {
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row) {
    return res.sendStatus(403);
  }

  if (Date.now() > row.expires_at) {
    await deleteContentRow(row);
    return res.sendStatus(403);
  }

  if (row.password) {
    return res.json({
      type: row.type,
      text: null,
      originalName: row.original_name,
      requiresPassword: true
    });
  }

  if (row.max_views !== null && row.view_count >= row.max_views) {
    return res.sendStatus(403);
  }

  const update = await db.run(
    "UPDATE contents SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ? AND (max_views IS NULL OR COALESCE(view_count, 0) < max_views)",
    [row.id]
  );

  if (!update || update.changes === 0) {
    return res.sendStatus(403);
  }

  const updated = await db.get(
    "SELECT view_count, max_views, one_time, type FROM contents WHERE id = ?",
    [row.id]
  );

  if (row.type === "text") {
    res.json({
      type: row.type,
      text: row.text_content,
      originalName: row.original_name,
      requiresPassword: false,
      viewCount: updated?.view_count ?? 0,
      maxViews: updated?.max_views ?? null
    });

    if (updated && updated.one_time) {
      await deleteContentRow(row);
    }

    return;
  }

  res.json({
    type: row.type,
    text: null,
    originalName: row.original_name,
    requiresPassword: false,
    viewCount: updated?.view_count ?? 0,
    maxViews: updated?.max_views ?? null
  });
});

// ---------------- VERIFY PASSWORD ----------------
app.post("/api/verify/:id", async (req, res) => {
  const { password } = req.body;
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row || Date.now() > row.expires_at || row.password !== password) {
    return res.sendStatus(403);
  }

  res.json({ success: true });
});

// ---------------- DOWNLOAD ----------------
app.get("/api/download/:id", async (req, res) => {
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row) {
    return res.sendStatus(403);
  }

  if (Date.now() > row.expires_at) {
    await deleteContentRow(row);
    return res.sendStatus(403);
  }

  if (row.type !== "file") {
    return res.status(400).json({ error: "Not a file download." });
  }

  if (row.password && row.password !== req.query.password) {
    return res.sendStatus(403);
  }

  res.download(row.file_path, row.original_name, async (err) => {
    if (err) {
      return;
    }

    if (row.one_time) {
      await deleteContentRow(row);
    }
  });
});

app.post("/api/delete/:id", async (req, res) => {
  const { deleteToken } = req.body;
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);
  const isOwner = req.user && row && row.owner_id === req.user.id;

  if (!row || (!isOwner && (!deleteToken || row.delete_token !== deleteToken))) {
    return res.sendStatus(403);
  }

  await deleteContentRow(row);
  res.json({ success: true });
});

// ---------------- CLEANUP CRON ----------------
cron.schedule("*/5 * * * *", async () => {
  const now = Date.now();
  const expired = await db.all("SELECT * FROM contents WHERE expires_at < ?", [now]);

  for (const row of expired) {
    await deleteContentRow(row);
  }

  await db.run("DELETE FROM sessions WHERE expires_at < ?", [now]);
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: `File too large. Max ${MAX_FILE_SIZE_MB} MB.` });
    }
  }

  if (err && err.message === "INVALID_FILE_TYPE") {
    return res.status(400).json({ error: "Invalid file type. Choose an allowed file." });
  }

  return res.status(500).json({ error: "Upload failed" });
});

app.listen(PORT, () => {
  console.log(`LinkVault backend running on port ${PORT}`);
});
