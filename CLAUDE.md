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
  App.jsx                    — routing + SidebarProvider wrapper
  components/
    Navbar.jsx               — mobile top bar (sm:hidden at lg+) + tablet nav (sm: to lg:)
    Sidebar.jsx              — desktop collapsible left sidebar (lg:+ only)
    BottomNav.jsx            — mobile-only fixed bottom tab bar (sm:hidden)
    StatusBadge.jsx
  pages/
    More.jsx                 — mobile More screen (athlete + coord)
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
    AppConfigContext.jsx      — useAppConfig() → { config, updateTabs }
    SidebarContext.jsx        — useSidebar() → { collapsed, toggleCollapsed }
  utils/
    cache.js                 — getCached/setCached (session storage)
    format.js                — fmtUSD
    strava.js                — Strava OAuth + activity fetching
    googleCalendar.js
  styles/index.css           — Tailwind directives + scrollbar-hide utility
  firebase.js                — db, auth exports
```

## Breakpoint Strategy (CRITICAL)
Two distinct breakpoints with separate responsibilities — never mix them:

- **`sm:` (640px)** — mobile refinements only (padding, font size, minor layout). All mobile work is complete. Do not use `sm:` for new layout changes.
- **`lg:` (1024px)** — all desktop layout changes (sidebar, two-column grids, data tables, drawers). This is the desktop breakpoint.

There is no `md:` usage in this codebase. Do not introduce it.

## Navigation Architecture
### Mobile (below `lg:`)
- Top bar: `Navbar.jsx` — shows page title + avatar. Hidden at `lg:` via `hidden sm:block lg:hidden`
- Bottom tabs: `BottomNav.jsx` — `sm:hidden fixed bottom-0 z-40`. Config-driven tabs + More
- All pages need `pb-20 sm:pb-0` (handled globally in `App.jsx` main wrapper)

### Desktop (`lg:+`)
- Left sidebar: `Sidebar.jsx` — `hidden lg:flex fixed left-0 top-0 h-screen z-40 bg-asha-dark`
  - Expanded: `w-64` | Collapsed: `w-16` (icon-only with `title` tooltips)
  - Collapse state persisted to `localStorage` key `asha_sidebar_collapsed`
  - Consumed via `useSidebar()` from `SidebarContext.jsx`
- Main content offset: `lg:ml-64` or `lg:ml-16` (dynamic, from `useSidebar()`)

## Desktop Layout Patterns (`lg:` classes only)
- **Two-column page layout**: `lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 lg:items-start` — main content left, sticky right rail
- **Split-pane**: `lg:flex lg:min-h-[600px]` with `lg:w-72 lg:border-r` left + `lg:flex-1 lg:p-6` right
- **Dashboard widget grid**: `grid grid-cols-3 lg:grid-cols-5 gap-3`
- **Data table** (coordinator pages): `hidden lg:block overflow-x-auto` table alongside `lg:hidden` mobile cards
  - `thead`: `bg-asha-cream/50 border-b sticky top-0`, `th`: `text-xs uppercase tracking-wide text-asha-muted`
  - `tbody`: `divide-y divide-asha-border/40`, `tr`: `hover:bg-asha-cream/30 transition-colors group`
- **Right-side Drawer** (for forms with 5+ fields or scrollable sub-components — replaces centered modal at `lg:+`):
  - Overlay: add `lg:items-stretch lg:justify-end` to `flex items-end sm:items-center justify-center`
  - Panel: add `lg:rounded-none lg:h-full lg:max-h-screen lg:w-[480-520px]`
- **Sticky right rail**: `lg:sticky lg:top-8`
- **Full-width pages**: `max-w-full lg:px-6` (Athletes, RaceManagement, TrainingPlans)

## Modal Design Pattern
All modals use **bottom-sheet on mobile, centered on sm+**:
```
overlay: "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
panel:   "bg-white rounded-t-2xl sm:rounded-2xl border border-asha-border w-full max-w-lg max-h-[92vh] flex flex-col"
header:  "flex items-center justify-between p-5 border-b border-asha-border flex-shrink-0"
body:    "p-5 space-y-4 overflow-y-auto flex-1 min-h-0"
footer:  "flex gap-2 p-5 border-t border-asha-border flex-shrink-0"
```
- Modals with 5+ fields or scrollable sub-components become right-side drawers at `lg:+`
- All modals should handle `Escape` key via `useEffect` + `keydown` listener
- Tooltips on icon-only buttons: use native `title` attribute (no library)

## Mobile Card / List Patterns
- Standard card: `bg-white rounded-2xl border border-asha-border overflow-hidden`
- List rows: `divide-y divide-asha-border/50`, row: `flex items-center gap-3 px-4 py-3`
- Page containers need `overflow-x-hidden` when they contain horizontally scrollable tables (prevents iOS fixed-nav displacement)
- Compact stat strip: `grid grid-cols-3 gap-2` with monospace values + uppercase labels

## Training Calendar (Beta Feature)
- Gated by `config.tabs.training` — **default `false`**
- Toggle in Settings → Athlete Tabs section (shows "Beta" badge)
- When disabled: route `/athlete/training` is unmounted, nav links hidden everywhere (Navbar, Sidebar, BottomNav, More page)
- When you ship this as stable: change default to `true` in `AppConfigContext.jsx` and remove the toggle from `Settings.jsx`

### Training Calendar Mobile Chips
Plan sessions and Strava activities use the same left-border-accent shape but are visually distinct:
- **Plan** (scheduled): cream `#FAF6F1` bg, neutral border, 3px solid sport-color left border, `PLAN` micro-label in gray
- **Done** (Strava activity): sport `bg` color, sport-color border, 3px solid sport-color left border, `DONE` micro-label
- When both exist for a day: **side-by-side 2-column grid** (plan left, activity right)
- When only one type: single column stacked

## Config-Driven Features (`AppConfigContext`)
`config.tabs` controls athlete tab visibility — all default `true` except `training`:
```js
{ home, events, races, swag, expenses, training: false }
```
Saved to Firestore `appConfig/main`. Coordinator Settings page has toggles for all of these.

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
- **Never modify `sm:` classes** — mobile is complete. Desktop changes use `lg:` only
- Color classes must use the `asha-*` palette — no raw Tailwind grays for brand elements
- Firebase reads should go through the session cache where appropriate to reduce Firestore reads
- Strava attribution text ("Powered by Strava") is required by API terms — don't remove it
- `overflow-x-hidden` on page containers prevents horizontal overflow from breaking `position: fixed` on iOS Safari
