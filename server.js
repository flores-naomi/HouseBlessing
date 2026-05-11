const express = require('express');
const cors    = require('cors');
const path    = require('path');
const low     = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const shortid = require('shortid');

const app  = express();
const PORT = process.env.PORT || 3000;

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
    .find(r => r.family_name.toLowerCase() === family_name.trim().toLowerCase())
    .value();

  if (existing) {
    return res.status(409).json({ error: 'An RSVP from this family has already been submitted.' });
  }

  const entry = {
    id:             shortid.generate(),
    family_name:    family_name.trim(),
    attendees:      cleaned,
    attendee_count: cleaned.length,
    message:        (message || '').trim(),
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

  res.json({ total_families: rsvps.length, total_attendees: total, rsvps });
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
