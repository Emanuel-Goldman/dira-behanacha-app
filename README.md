# Dira-Behanach

A minimal React + Vite frontend, connected to Firebase project `dira-behanacha`.

## Setup

```bash
npm install
```

### Configure Firebase

The app reads its Firebase config from `.env.local` (gitignored). To create one:

1. Open the Firebase console for the `dira-behanacha` project.
2. Go to **Project settings** -> **Your apps** and click the **Web** icon (`</>`)
   to register a new web app. Pick any nickname (e.g. `dira-behanacha-web`).
   Firebase Hosting is optional and can be skipped for now.
3. Firebase will show a snippet with a `firebaseConfig` object. Keep it open.
4. In this repo, copy the template and fill in the values:

   ```bash
   cp .env.local.example .env.local
   ```

   Then fill in `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_APP_ID` from the
   console (the other values are already pre-filled for this project).

## Develop

```bash
npm run dev
```

Then open the URL printed in the terminal (typically http://localhost:5173).
The page should render and show `Connected to Firebase project: dira-behanacha`.
If a Firebase env var is missing the app will throw on load with a clear message.

## Build

```bash
npm run build
npm run preview
```

## Deploy to Firebase Hosting

The site lives at https://dira-behanacha.web.app once deployed.

Prerequisites (one-time):

```bash
npm install -g firebase-tools
firebase login
```

Then to build and deploy:

```bash
npm run deploy
```

This runs `vite build` and then `firebase deploy --only hosting`, pushing the
contents of `dist/` to the `dira-behanacha` project (configured in `.firebaserc`).
