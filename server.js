const express = require('express');
const cors    = require('cors');
const path    = require('path');
const crypto  = require('crypto');
const low     = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const shortid = require('shortid');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Encryption setup ──────────────────────────────────────────────────────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-secure-key-change-in-production';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decrypt(encryptedText) {
  if (!encryptedText) return '';
  try {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error('Decryption error:', e.message);
    return '';
  }
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Database setup ────────────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'rsvp.json');
const adapter = new FileSync(DB_PATH);
const db      = low(adapter);

db.defaults({ rsvps: [] }).write();

// ── Routes ────────────────────────────────────────────────────────────────────

// Submit RSVP
app.post('/api/rsvp', (req, res) => {
  const { family_name, attendees, message } = req.body;

  if (!family_name || !Array.isArray(attendees) || attendees.length === 0) {
    return res.status(400).json({ error: 'Family name and at least one attendee are required.' });
  }

  const cleaned = attendees.map(n => String(n).trim()).filter(Boolean);
  if (cleaned.length === 0) {
    return res.status(400).json({ error: 'Please provide valid attendee names.' });
  }

  // Duplicate check (case-insensitive family name)
  const existing = db.get('rsvps')
    .find(r => decrypt(r.family_name).toLowerCase() === family_name.trim().toLowerCase())
    .value();

  if (existing) {
    return res.status(409).json({ error: 'An RSVP from this family has already been submitted.' });
  }

  const entry = {
    id:             shortid.generate(),
    family_name:    encrypt(family_name.trim()),
    attendees:      cleaned.map(n => encrypt(n)),
    attendee_count: cleaned.length,
    message:        encrypt((message || '').trim()),
    created_at:     new Date().toISOString()
  };

  db.get('rsvps').push(entry).write();

  res.status(201).json({ success: true, id: entry.id, count: cleaned.length });
});

// Admin — all RSVPs
app.get('/api/rsvps', (req, res) => {
  const secret = req.query.secret;
  if (secret !== (process.env.ADMIN_SECRET || 'bless2025')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const rsvps = db.get('rsvps').orderBy('created_at', 'desc').value();
  const total = rsvps.reduce((sum, r) => sum + r.attendee_count, 0);

  // Decrypt data for admin
  const decryptedRsvps = rsvps.map(r => ({
    id: r.id,
    family_name: decrypt(r.family_name),
    attendees: r.attendees.map(a => decrypt(a)),
    attendee_count: r.attendee_count,
    message: decrypt(r.message),
    created_at: r.created_at
  }));

  res.json({ total_families: rsvps.length, total_attendees: total, rsvps: decryptedRsvps });
});

// Delete RSVP
app.delete('/api/rsvp/:id', (req, res) => {
  const secret = req.query.secret;
  if (secret !== (process.env.ADMIN_SECRET || 'bless2025')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const id = req.params.id;
  const existing = db.get('rsvps').find({ id }).value();
  if (!existing) {
    return res.status(404).json({ error: 'RSVP not found.' });
  }

  db.get('rsvps').remove({ id }).write();
  res.json({ success: true });
});

// Public summary
app.get('/api/summary', (req, res) => {
  const rsvps   = db.get('rsvps').value();
  const total   = rsvps.reduce((sum, r) => sum + r.attendee_count, 0);
  res.json({ families: rsvps.length, total });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🏠 House Blessing RSVP running on port ${PORT}`);
});
