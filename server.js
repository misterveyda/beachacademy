require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/beachacademy';

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value JSONB
    );
  `);
}

// ensure uploads directory exists
const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = Date.now() + '-' + Math.random().toString(36).slice(2,8);
    cb(null, base + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/health', (req, res) => res.json({ ok: true }));

// file upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no_file' });
  const url = `/uploads/${req.file.filename}`;
  return res.json({ ok: true, name: req.file.originalname, url });
});

// serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR));

// Get value by key
app.get('/kv/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const result = await pool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Not found' });
    return res.json(result.rows[0].value);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'db_error' });
  }
});

// Put value by key (replace or insert)
app.put('/kv/:key', async (req, res) => {
  const { key } = req.params;
  const value = req.body;
  try {
    await pool.query(
      `INSERT INTO kv_store(key, value) VALUES($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, value]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'db_error' });
  }
});

// Delete key
app.delete('/kv/:key', async (req, res) => {
  const { key } = req.params;
  try {
    await pool.query('DELETE FROM kv_store WHERE key = $1', [key]);
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'db_error' });
  }
});

(async () => {
  try {
    await ensureTable();
    const port = process.env.PORT || 4000;
    app.listen(port, () => console.log(`Server listening on port ${port}`));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
})();
