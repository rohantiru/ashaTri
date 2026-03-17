# Asha for Education — Swag Portal

A full-stack swag management app for the Asha triathlon program. Built with React + Vite + Firebase + Tailwind CSS, deployed on Vercel.

---

## Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6
- **Backend**: Firebase (Firestore + Auth)
- **Auth**: Google Sign-In
- **Deploy**: Vercel (frontend) + Firebase (rules/indexes)

---

## First-Time Setup

### 1. Clone & install

```bash
git clone <your-repo>
cd asha-swag
npm install
```

### 2. Create a Firebase project

1. Go to https://console.firebase.google.com → **Add project**
2. Name it `asha-swag` (or similar)
3. Enable **Google Analytics** if you want (optional)

### 3. Enable Firebase services

In your Firebase project:

**Authentication**
- Go to Build → Authentication → Get started
- Sign-in method → Enable **Google**
- Add your Vercel domain to **Authorized domains** once deployed

**Firestore**
- Go to Build → Firestore Database → Create database
- Start in **production mode**
- Choose a region (us-central1 recommended)

### 4. Get your Firebase config

- Project Settings (gear icon) → Your apps → Add app → Web
- Register app, copy the config object

### 5. Create your `.env` file

```bash
cp .env.example .env
```

Fill in your values:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 6. Deploy Firestore rules & indexes

```bash
npm install -g firebase-tools
firebase login
firebase use --add   # select your project
firebase deploy --only firestore
```

### 7. Run locally

```bash
npm run dev
```

---

## Deploying to Vercel

### Option A: Via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add all your `VITE_*` keys.

### Option B: Via Vercel Dashboard

1. Push your repo to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. Framework: **Vite**
4. Add all `VITE_*` environment variables from your `.env`
5. Deploy

### After deploying

Add your Vercel domain to Firebase Auth authorized domains:
- Firebase Console → Authentication → Settings → Authorized domains → Add domain
- Add `your-app.vercel.app`

---

## Making Someone a Coordinator

Coordinators are set manually in Firestore (by design — you don't want athletes self-promoting):

1. Go to Firebase Console → Firestore Database
2. Open the `users` collection
3. Find the user by their UID (visible after they log in for the first time)
4. Edit their document → change `role` from `"athlete"` to `"coordinator"`

That's it. They'll see the coordinator view on next login.

---

## Firestore Data Model

### `users/{uid}`
```
{
  uid: string,
  name: string,
  email: string,
  photoURL: string,
  role: "athlete" | "coordinator",
  createdAt: timestamp
}
```

### `swagItems/{itemId}`
```
{
  name: string,
  description: string,
  type: "interest" | "inventory",
  hasSizes: boolean,
  sizes: string[],          // e.g. ["S", "M", "L", "XL"]
  inventory: {              // only used when type = "inventory"
    S: number,
    M: number,
    ...
  },
  isActive: boolean,        // controls athlete visibility
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `swagResponses/{responseId}`
```
{
  athleteId: string,        // uid
  itemId: string,
  size: string,
  status: "interested" | "ordered" | "ready" | "picked_up",
  createdAt: timestamp,
  orderedAt: timestamp,     // set when coordinator advances to ordered
  readyAt: timestamp,       // set when coordinator marks ready
  picked_upAt: timestamp    // set when coordinator marks collected
}
```

---

## Status Flow

```
interested → ordered → ready → picked_up
```

- **interested**: Athlete submitted interest / claimed item
- **ordered**: Coordinator placed bulk order with vendor
- **ready**: Items arrived, athlete can come collect
- **picked_up**: Collected — done

Athletes can only withdraw from `interested` status. All other advances are coordinator-only.

---

## Adding Future Modules

This app is intentionally structured so new modules (e.g. Race Registration, Training Plans, Equipment Loans) can be added as new route groups under `/coord/` and `/athlete/` with their own Firestore collections.

The `AuthContext`, `Navbar`, and role-based routing are all built to scale with additional pages.
