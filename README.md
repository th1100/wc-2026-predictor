# World Cup 2026 Predictor

## Quick setup (Windows, no coding required)

### 1. Edit `config.js`

Open `config.js` in **Notepad** (right-click → "Open with" → "Notepad").

Replace the two placeholder values with your Supabase credentials:

```js
const SUPABASE_URL = "https://your-project.supabase.co";
const SUPABASE_KEY = "sb_publishable_...";
```

Save the file (Ctrl+S).

### 2. Upload to GitHub

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `wc-2026-predictor`
3. **Public** or **Private** — both work
4. Click **"Create repository"**
5. On the new repo page, click **"uploading an existing file"** (small link in the middle)
6. **Drag all four files** (`index.html`, `app.js`, `config.js`, `README.md`) into the upload area
7. Scroll down and click **"Commit changes"**

### 3. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Find your `wc-2026-predictor` repo in the list → click **"Import"**
3. Leave all settings at default
4. Click **"Deploy"**
5. Wait ~30 seconds

You'll get a URL like `https://wc-2026-predictor-yourname.vercel.app` — share this with your colleagues!

### 4. Test it

1. Open the URL in your browser
2. Sign up with a test name
3. Make a few picks → they should auto-save
4. Click the small dot (·) at the bottom of the home page 3 times → Admin tab appears
5. Log in with default password `admin2026` → change it immediately

## Updating later

If you want to change something:

1. Open file on GitHub
2. Click the pencil ✏️ icon to edit
3. Make changes → "Commit"
4. Vercel auto-deploys the new version in 30 seconds

## Sharing with colleagues

Just send them the URL. They:
- Open the URL
- Click "Sign up"
- Enter their name + password
- Make picks
- Click "Submit my final picks" when ready

No Claude account or any other app needed.

## Admin actions

- **Force lock**: stop accepting picks before 11.6
- **Set official results**: enter actual match outcomes
- **Recalculate scores**: refresh the leaderboard
- **Set top scorer**: enter the official top scorer at the end
- **Change admin password**: do this right after deploying

## Troubleshooting

- **"Setup required" page**: edit `config.js` with real Supabase values
- **Can't log in / data not saving**: check your Supabase URL & key in `config.js` (copy them exactly, no extra spaces)
- **Picks lock too early**: the default lock time is June 11, 2026 17:00 Helsinki time. Change `LOCK_TIME_ISO` in `config.js` if needed.

Good luck with the pool! ⚽
