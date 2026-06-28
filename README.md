# Digital Slam Book 

This README is your map. Three companion documents go deeper on specific
concerns:
- **TECH_STACK.md** — every technology used, and why
- **SETUP.md** — step-by-step local run instructions + troubleshooting
- **DEPLOYMENT.md** — step-by-step path to a live, shareable URL

## Quickest path to seeing it run

```bash
# Terminal 1
cd backend && python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm install && npm run dev
```
Then follow SETUP.md Step 3 onward (create your owner account, try the flow).

## The experience, as it exists right now

```
Friend clicks your link
   ↓
Enters name (no separate invitation step, per your decision)
   ↓
Writes pages, autosaves, attaches photos
   ↓
   (meanwhile...)
   ↓
Owner logs in -> Dashboard (friends listed FCFS)
   ↓
Owner clicks "Open & Read the Slam Book"
   ↓
Cover Page (your uploaded cover.png)
   ↓
Click "Open Book"
   ↓
Book Opening Animation
   ↓
Friend 1 → Friend 2 → Friend 3 ... (animated page-turning, music, photos)
```
This matches the flow you specified. The cover image lives at
`frontend/public/cover.png` — replace that file anytime to update your
cover design with zero code changes.

## What's real and tested

- Owner auth (bcrypt + JWT)
- Friend entry → multi-page writing → debounced autosave → delete-with-renumber
- FCFS friend ordering (database-enforced via timestamp, not manually managed)
- Photo upload (local disk for dev, Cloudinary-ready for production)
- Music library with categories; owner manages, friends/public can browse
- Owner analytics (real counts, computed live, not hardcoded)
- PDF export of the full book in FCFS order
- Premium reading experience: your real cover image, book-opening animation,
  Framer Motion page-turning, parchment/gold theme, handwritten font,
  ambient floating hearts (respects `prefers-reduced-motion`), ribbon
  bookmark, per-friend music autoplay, keyboard/click/swipe navigation

Every item above was actually run and verified — see the conversation
history for the specific test commands and their output, not just claims.
