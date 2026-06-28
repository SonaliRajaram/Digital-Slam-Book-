# Deployment Guide — Getting Your Slam Book Live on the Internet

Honest note before you start: I (Claude) can't click "Deploy" on your
accounts for you — these platforms require YOUR login and YOUR payment-free
signup. What I can do is give you the exact steps, in order, so you're never
guessing. Follow this top to bottom; each part builds on the last.

---

## Part 1 — Push your code to GitHub

1. Create a free GitHub account if you don't have one: github.com
2. Create a new repository (e.g. `digital-slam-book`), keep it Private if
   you'd rather friends not browse your source code.
3. From inside your unzipped project folder:
```bash
cd digital-slam-book
git init
git add .
git commit -m "Initial commit: working slam book scaffold"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/digital-slam-book.git
git push -u origin main
```

**Important:** make sure `backend/venv/` and `frontend/node_modules/` are
NOT committed (they're large and machine-specific). Create this file first:

```bash
cat > .gitignore << 'EOF'
venv/
node_modules/
.next/
__pycache__/
*.pyc
slam_book.db
static/uploads/
.env.local
EOF
```

---

## Part 2 — Set up Cloudinary (for real photo storage)

1. Sign up free at cloudinary.com
2. On your Cloudinary dashboard, copy the value labeled "API Environment
   variable" — it looks like:
   `CLOUDINARY_URL=cloudinary://123456789:AbCdEfG@your_cloud_name`
3. Keep this tab open — you'll paste this into Render's environment
   variables in Part 3.

---

## Part 3 — Deploy the backend on Render

1. Sign up free at render.com, connect your GitHub account.
2. Click "New +" → "Web Service" → select your `digital-slam-book` repo.
3. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Under "Environment", add these variables:
   | Key | Value |
   |---|---|
   | `JWT_SECRET_KEY` | any long random string (e.g. generate one with `python3 -c "import secrets; print(secrets.token_hex(32))"`) |
   | `STORAGE_PROVIDER` | `cloudinary` |
   | `CLOUDINARY_URL` | the value you copied in Part 2 |
   | `DATABASE_URL` | leave blank for now — Part 4 below sets this once your database exists |
5. Click "Create Web Service". Wait for the build to finish — Render gives
   you a permanent URL like `https://digital-slam-book.onrender.com`.

**Confirm it worked:** open `https://YOUR-RENDER-URL.onrender.com/docs` —
you should see the same Swagger docs page you saw locally.

---

## Part 4 — Add a real PostgreSQL database

1. On Render: "New +" → "PostgreSQL" → free tier → create it.
2. Copy the "Internal Database URL" it gives you.
3. Go back to your Web Service's Environment settings, set:
   `DATABASE_URL` = that internal URL
4. Your service will auto-redeploy. SQLAlchemy will create all tables
   automatically on startup (same `Base.metadata.create_all` you tested
   locally) — no manual migration needed for this stage.

---

## Part 5 — Deploy the frontend on Vercel

1. Sign up free at vercel.com, connect GitHub.
2. "Add New" → "Project" → select your repo.
3. Set **Root Directory** to `frontend`.
4. Add an environment variable:
   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | your Render backend URL from Part 3 (e.g. `https://digital-slam-book.onrender.com`) |
5. Click Deploy. Vercel gives you a permanent URL like
   `https://digital-slam-book.vercel.app`.

---

## Part 6 — Connect the two (CORS)

Your backend currently only allows `http://localhost:3000`. Now that your
frontend has a real URL, update `backend/app/main.py`:

```python
allow_origins=[
    "http://localhost:3000",
    "https://digital-slam-book.vercel.app",  # <- your actual Vercel URL
],
```

Commit and push this change — Render will auto-redeploy.

---

## Part 7 — Create your real owner account in production

Visit `https://YOUR-RENDER-URL.onrender.com/docs`, use `POST /auth/register`
exactly like you did locally, but with your real email/password this time.

---

## You're done

Your permanent link to share with friends is your **Vercel URL**
(`https://digital-slam-book.vercel.app`). Your own login is at
`https://digital-slam-book.vercel.app/owner/login`.

## A note on the free tier

Render's free web services "sleep" after 15 minutes of no traffic and take
~30-50 seconds to wake up on the next request. For a slam book friends
visit occasionally, this is a fine trade-off for $0/month — just don't be
alarmed by the first request feeling slow.
