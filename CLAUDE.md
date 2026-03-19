# Asha Tri — Claude Context

## Project Overview
Triathlon club management app for **Asha Tri**. React PWA with Firebase backend, deployed on Vercel.

## Stack
- **React 18** + React Router 6 (SPA)
- **Vite 5** (build, dev server, PWA plugin)
- **Tailwind CSS 3** with custom `asha-*` theme
- **Firebase 10** — Firestore (DB), Firebase Auth
- **Strava API** — OAuth + activities (Training Calendar)

## Custom Tailwind Theme (`tailwind.config.js`)
```
asha-orange     #F4622A   (primary CTA, active nav)
asha-orangeLight #FF8A5C
asha-orangeDim  #FDE8DF
asha-dark       #1A1208   (body text)
asha-mid        #3D2E1E
asha-muted      #8C7B6B   (secondary text)
asha-cream      #FAF6F1   (page background)
asha-card       #FFFFFF
asha-border     #EDE5DB
```
Fonts: `font-display` → Syne, `font-body` → DM Sans

## Roles
`athlete` / `coordinator` / `coach` / `owner`
- Athlete and coordinator/coach/owner see different navs and dashboards
- `isOwner` = role is `owner` OR `coordinator`
- Role stored in Firestore `users/{uid}` as `profile.role`

## File Structure
```
src/
  App.jsx                    — routing
  components/
    Navbar.jsx               — sticky nav, mobile drawer (sm: breakpoint)
    StatusBadge.jsx
  pages/
    Login.jsx
    athlete/
      Dashboard.jsx
      Events.jsx, Expenses.jsx, MySwag.jsx, Races.jsx, SwagBrowse.jsx
    coordinator/
      Dashboard.jsx
      Athletes.jsx, Events.jsx, ExpensesSummary.jsx, InterestView.jsx
      PickupManager.jsx, RaceManagement.jsx, Settings.jsx
      SwagItems.jsx, TrainingCalendar.jsx, TrainingPlans.jsx, UserManagement.jsx
  contexts/
    AuthContext.jsx           — useAuth() → { user, profile, loading }
    AppConfigContext.jsx      — useAppConfig() → { config }
  utils/
    cache.js                 — getCached/setCached (session storage)
    format.js                — fmtUSD
    strava.js                — Strava OAuth + activity fetching
    googleCalendar.js
  styles/index.css           — Tailwind directives + scrollbar-hide utility
  firebase.js                — db, auth exports
```

## Responsive / Mobile Patterns
- Primary breakpoint: `sm:` (640px)
- Desktop nav: `hidden sm:flex` | Mobile hamburger drawer: `sm:hidden`
- Standard page container: `max-w-6xl mx-auto px-4 py-8`
- Tables that can't reflow: wrap in `overflow-x-auto`, add `min-w-[Xpx]` to table
- Horizontally scrollable tabs: `overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`
- 7-column calendar: wrapped in `overflow-x-auto` scroll container with `min-w-[480px]` inner div

## Caching Strategy
- `getCached` / `setCached` (session-scoped, `utils/cache.js`) for Firestore collections that don't change often (races, swagItems)
- Strava activities cached per-month in `localStorage` via `utils/strava.js`

## Deployment
- Vercel (frontend) + Firebase (Firestore, Auth)
- API routes in `/api/` (Vercel serverless functions) — used for Strava token exchange
- `vercel.json` rewrites all routes to `/index.html` for SPA routing
- Required env vars: `VITE_STRAVA_CLIENT_ID`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`

## Key Conventions
- Prefer editing existing files over creating new ones
- Keep mobile in mind: use `overflow-x-auto` for wide tables/grids, responsive grid classes for cards
- Color classes must use the `asha-*` palette — no raw Tailwind grays for brand elements
- Firebase reads should go through the session cache where appropriate to reduce Firestore reads
- Strava attribution text ("Powered by Strava") is required by API terms — don't remove it
