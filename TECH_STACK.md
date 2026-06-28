# Tech Stack — Complete Reference

This documents every technology used in the project, why it was chosen, and
what it's responsible for. Refer back to this whenever a new piece is added.

## Backend

| Tech | Role | Why this, not an alternative |
|---|---|---|
| **Python 3.12** | Language | Matches your stated preference; huge ecosystem for any future AI/media features |
| **FastAPI** | Web framework | Async-native, automatic interactive docs at `/docs`, strong type validation via Pydantic |
| **SQLAlchemy** | ORM | Lets you swap SQLite → PostgreSQL by changing one env var, not your code |
| **SQLite** (dev) | Database | Zero setup, single file, perfect for local development |
| **PostgreSQL** (prod) | Database | Handles concurrent users correctly; what you'll point `DATABASE_URL` to in production |
| **python-jose** | JWT tokens | Issues/verifies the owner's login token |
| **passlib + bcrypt** | Password hashing | Industry-standard one-way password hashing |
| **ReportLab** | PDF generation | Pure-Python, no external binary dependency — simpler to deploy on free hosting |
| **Cloudinary** (prod only) | Photo storage | Free tier, built-in image transforms (crop/filter/polaroid effects) |

## Frontend

| Tech | Role | Why this, not an alternative |
|---|---|---|
| **Next.js 14 (App Router)** | Framework | Server-rendering gives fast first load — important since friends open your link cold, often on mobile data |
| **TypeScript** | Language | Catches mistakes (wrong field names, etc.) before you ever run the code |
| **Framer Motion** | Animation | Powers the page-turn and book-opening animation in `/owner/read` |
| Plain CSS (`globals.css`) | Styling | Kept dependency-light for this stage; can migrate to TailwindCSS later if you want utility classes |

## Why NOT some things from your original list (and when to revisit)

- **Three.js**: true 3D requires materially more setup (geometry, lighting,
  camera rigs) for a page-flip that Framer Motion's CSS 3D transforms
  already approximate well. Revisit only if you specifically want a
  physically-simulated paper curl, not just a rotation effect.
- **Redis**: only earns its place once you have background jobs or heavy
  caching needs — premature for this scale of app.
- **Django**: FastAPI's async + auto-docs fit better given how
  upload/autosave-heavy this app is.

## Free hosting choices (for the upcoming deployment milestone)

| Layer | Platform | Why |
|---|---|---|
| Frontend | **Vercel** | Built by the Next.js team; zero-config deploys straight from GitHub |
| Backend | **Render** (free web service) | Easiest free Python/FastAPI hosting with a persistent URL |
| Database | **Render PostgreSQL** (free tier) or **Supabase** | Both have generous free tiers; Supabase also gives you a dashboard UI |
| Photo storage | **Cloudinary** | Free tier covers a slam book's realistic media volume |
