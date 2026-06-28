# Local Setup — Step by Step

Follow this exactly, in order. Each step tells you how to confirm it worked
before moving to the next, so if something breaks, you know exactly where.

## Prerequisites (install these first)

1. **Python 3.11 or 3.12** — check with `python3 --version`
   - Don't have it? Download from python.org
2. **Node.js 18+** — check with `node --version`
   - Don't have it? Download from nodejs.org (LTS version)
3. **Git** — check with `git --version`

## Step 1 — Unzip the project

Unzip `digital-slam-book.zip` anywhere. You'll get:
```
digital-slam-book/
├── backend/
├── frontend/
├── README.md
├── TECH_STACK.md
└── DEPLOYMENT.md
```

## Step 2 — Backend setup

Open a terminal:

```bash
cd digital-slam-book/backend

# Create an isolated Python environment (keeps this project's packages
# separate from anything else on your machine)
python3 -m venv venv

# Activate it
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload
```

**Confirm it worked:** open http://localhost:8000/docs in your browser.
You should see an interactive API documentation page (Swagger UI) listing
all the endpoints (auth, friends, pages, media, music, analytics, export).

**Leave this terminal running.** Open a NEW terminal for the next step.

## Step 3 — Create your owner account (do this ONCE)

While the backend is running, on the `/docs` page:
1. Find `POST /auth/register`, click it, click "Try it out"
2. Enter your real email and a password in the request body
3. Click "Execute"
4. You'll get back an `access_token` — you don't need to copy it, the
   frontend login page will get its own token when you log in there.

## Step 4 — Frontend setup

In your NEW terminal:

```bash
cd digital-slam-book/frontend
npm install
npm run dev
```

**Confirm it worked:** open http://localhost:3000 — you should see "You've
been invited to write a page" with a name field.

## Step 5 — Try the full flow yourself

1. At http://localhost:3000, enter a test name and click "Start Writing" —
   you're now in the friend writing experience.
2. Type something, wait 2 seconds, see "All changes saved ✓"
3. Go to http://localhost:3000/owner/login, log in with the email/password
   from Step 3.
4. You'll land on the dashboard — your test friend should be listed.
5. Click "📖 Open & Read the Slam Book" — you'll see your cover page
   first, then "Open Book" plays the opening animation into the pages.

If all five steps work, your local setup is fully correct.

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| `ModuleNotFoundError` on backend start | Virtual env not activated, or `pip install` skipped | Re-run Step 2's `source venv/bin/activate` then `pip install -r requirements.txt` |
| Frontend shows "Failed to fetch" | Backend isn't running, or wrong URL | Confirm Step 2's terminal still shows the server running; confirm `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000` |
| `CORS error` in browser console | Frontend running on a port other than 3000 | Edit `backend/app/main.py`'s `allow_origins` list to include whatever port your frontend actually printed |
| `bcrypt` related error on backend install | bcrypt version mismatch | Run `pip install bcrypt==4.0.1 --force-reinstall` inside the activated venv |
| Cover image doesn't show in reading view | `cover.png` missing | Confirm `frontend/public/cover.png` exists — it must be in `public/`, not `app/` |
| Port already in use | Another process is using 8000 or 3000 | Backend: `uvicorn app.main:app --reload --port 8001` (and update `.env.local` to match). Frontend: `npm run dev -- -p 3001` |
