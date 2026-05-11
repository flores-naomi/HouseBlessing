# 🏠 House Blessing RSVP App

A beautiful invitation website where guests can confirm their attendance and add the names of everyone coming with them.

---

## Features

- **RSVP Form** — guests enter their family name, individual attendee names, and an optional message
- **Live counter** — shows total families and guests confirmed so far
- **Admin Dashboard** — view all RSVPs at `/admin.html` with a password
- **CSV Export** — download all RSVPs from the admin panel
- **Duplicate prevention** — one submission per family name
- **SQLite database** — simple, zero-config, file-based storage

---

## Local Development

```bash
npm install
npm run dev        # uses nodemon for hot-reload
# open http://localhost:3000
```

---

## Deploy to Railway

1. **Push to GitHub** (or use Railway CLI):
   ```bash
   git init && git add . && git commit -m "init"
   ```

2. **Create a new Railway project** at [railway.app](https://railway.app)

3. **Connect your GitHub repo** — Railway auto-detects Node.js

4. **Set environment variables** in Railway → Variables:

   | Variable       | Value                        |
   |----------------|------------------------------|
   | `PORT`         | *(Railway sets this automatically)* |
   | `ADMIN_SECRET` | `your-secure-password`       |
   | `DB_PATH`      | `/data/rsvp.db` *(optional — see below)* |

5. **Persistent storage** (recommended so data survives redeploys):
   - In Railway: go to your service → **Volumes** → Add Volume
   - Mount path: `/data`
   - Set `DB_PATH=/data/rsvp.db` in Variables

6. **Deploy** — Railway builds and deploys automatically.

---

## Admin Dashboard

Visit `https://your-app.railway.app/admin.html`

- Default password: `bless2025` (change via `ADMIN_SECRET` env var)
- Shows all RSVPs, attendee names, counts, and messages
- Export to CSV button

---

## Customizing the Invitation

Edit `public/index.html` and update:
- The **date**, **time**, and **address** in the hero section
- The **RSVP deadline** in the card subtitle
- The **Bible verse** if you'd like a different one
- Colors via CSS variables at the top of the `<style>` block

---

## Project Structure

```
house-blessing/
├── server.js          # Express backend + SQLite API
├── package.json
├── railway.toml       # Railway deployment config
└── public/
    ├── index.html     # Guest-facing invitation + RSVP form
    └── admin.html     # Password-protected admin dashboard
```
