# Procurement Analytics

An internal spend analysis and category management dashboard built for HelloFresh Strategic Procurement. Designed for workshop use with senior leaders and day-to-day category deep-dives.

---

## Features

- **Spend Analysis** — Weekly actual vs awarded budget by supplier, category, and market
- **Multi-category support** — Bakery, Grocery, and Protein data across DACH, US, DKSE, and BENELUX
- **Interactive bar chart** — Drag the week brush or use quick-select presets (4W / 8W / 13W / All) to zoom into any time window
- **Supplier split** — Ranked by actual spend with utilisation % and at-risk flagging (≥80% utilisation)
- **Smart filters** — Filter by Category, Market, Status (Historical / Forecast), and Category Manager
- **Search** — Full-text search across supplier, SKU, ingredient, and category fields
- **Sortable data table** — Paginated (25 / 50 / 100 rows), click any column header to sort
- **Column tooltips** — Info pills on every column header explain the metric
- **Password protected** — Cookie-based auth; only accessible to authorised users

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | React 19, inline styles + CSS variables |
| Charts | Recharts |
| Auth | Middleware cookie check (`sa-auth`) |
| Hosting | Vercel |

---

## Running Locally

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev
```

You'll be redirected to `/login` on first visit. Use the shared team password.

---

## Deployment

This project auto-deploys to **production** whenever a commit lands on `main`.

**Preferred workflow — always preview before production:**

```bash
# 1. Work on a feature branch
git checkout -b feat/your-change

# 2. Deploy to Vercel Preview (no --prod flag)
npx vercel

# 3. Review the preview URL, then merge to main when happy
git checkout main
git merge feat/your-change
git push origin main   # triggers production deploy
```

> Production URL stays stable across all deploys — share it once and it always points to the latest version.

---

## Project Structure

```
app/
  page.tsx              # Main Spend Analysis dashboard
  layout.tsx            # Root layout + sidebar
  login/page.tsx        # Login page
  api/auth/route.ts     # Auth endpoint
  api/logout/route.ts   # Logout endpoint
  category/
    page.tsx            # Category Overview (coming soon)
    dach/page.tsx       # DACH market view (coming soon)
    us/page.tsx         # US market view (coming soon)
    dkse/page.tsx       # DKSE market view (coming soon)
    benelux/page.tsx    # BENELUX market view (coming soon)
  suppliers/page.tsx    # Supplier Tracker (coming soon)
  contracts/page.tsx    # Contract Monitor (coming soon)
  budget/page.tsx       # Budget Forecast (coming soon)
  reports/page.tsx      # Reports (coming soon)

components/
  sage/Sidebar.tsx      # Navigation sidebar

lib/
  data.ts               # All spend data + compute functions
```

---

## Data

All data is statically embedded in `lib/data.ts` — no database or external API.

- **Bakery / DACH** — Weekly granularity, real-structure synthetic data (~102 rows × 52 weeks)
- **Grocery** — Monthly checkpoint data across DACH, US, DKSE, BENELUX
- **Protein** — Monthly checkpoint data across DACH, US, DKSE, BENELUX

To update or extend data, edit the `BAKERY_ROWS`, `GROCERY_ROWS`, and `PROTEIN_ROWS` arrays in `lib/data.ts`.

---

## Auth

Password is set via the `SPEND_PASSWORD` environment variable in Vercel. To change it:

1. Go to Vercel → Project → Settings → Environment Variables
2. Update `SPEND_PASSWORD`
3. Redeploy

If a colleague gets a `401` error, ensure they're using the current password — the cookie expires after 8 hours.
