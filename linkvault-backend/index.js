// index.js
// Complete Backend for LinkVault
// Node.js + Express + SQLite + Multer

import express from "express";
import cors from "cors";
import multer from "multer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import cron from "node-cron";

const app = express();
const PORT = 4000;

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
    expires_at INTEGER
  )
`);

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

const upload = multer({ storage });

// ---------------- UPLOAD API ----------------
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    const { text, expiryMinutes, password, oneTime } = req.body;

    if (!text && !req.file) {
      return res.status(400).json({ error: "Text or file required" });
    }

    const id = req.generatedId || uuidv4();
    const createdAt = Date.now();
    const expiresAt = createdAt + (expiryMinutes ? expiryMinutes * 60 * 1000 : 10 * 60 * 1000);

    if (req.file) {
      await db.run(`
        INSERT INTO contents
        (id, type, file_path, original_name, password, one_time, created_at, expires_at)
        VALUES (?, 'file', ?, ?, ?, ?, ?, ?)
      `, [
        id,
        req.file.path,
        req.file.originalname,
        password || null,
        oneTime ? 1 : 0,
        createdAt,
        expiresAt
      ]);
    } else {
      await db.run(`
        INSERT INTO contents
        (id, type, text_content, password, one_time, created_at, expires_at)
        VALUES (?, 'text', ?, ?, ?, ?, ?)
      `, [
        id,
        text,
        password || null,
        oneTime ? 1 : 0,
        createdAt,
        expiresAt
      ]);
    }

    // res.json({ link: `http://localhost:5173/view/${id}` });
res.json({
  link: `http://localhost:5173/view/${id}`,
  expiresAt
});

  } catch (err) {
    res.status(500).json({ error: "Upload failed" });
  }
});

// ---------------- VIEW CONTENT ----------------
app.get("/api/content/:id", async (req, res) => {
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row || Date.now() > row.expires_at) {
    return res.sendStatus(403);
  }

  res.json({
    type: row.type,
    text: row.text_content,
    originalName: row.original_name,
    requiresPassword: !!row.password
  });
});

// ---------------- VERIFY PASSWORD ----------------
app.post("/api/verify/:id", async (req, res) => {
  const { password } = req.body;
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row || row.password !== password) {
    return res.sendStatus(403);
  }

  res.json({ success: true });
});

// ---------------- DOWNLOAD ----------------
app.get("/api/download/:id", async (req, res) => {
  const row = await db.get("SELECT * FROM contents WHERE id = ?", [req.params.id]);

  if (!row || Date.now() > row.expires_at) {
    return res.sendStatus(403);
  }

  if (row.one_time) {
    await db.run("DELETE FROM contents WHERE id = ?", [row.id]);
  }

  res.download(row.file_path, row.original_name);
});

// ---------------- CLEANUP CRON ----------------
cron.schedule("*/5 * * * *", async () => {
  const now = Date.now();
  const expired = await db.all("SELECT * FROM contents WHERE expires_at < ?", [now]);

  for (const row of expired) {
    if (row.file_path && fs.existsSync(row.file_path)) {
      fs.unlinkSync(row.file_path);
    }
    await db.run("DELETE FROM contents WHERE id = ?", [row.id]);
  }
});

app.listen(PORT, () => {
  console.log(`LinkVault backend running on port ${PORT}`);
});
