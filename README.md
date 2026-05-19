# Task Manager (Firebase + React + Swagger UI)

A task management web app with Google sign-in, Firestore-backed tasks (real-time), and a Swagger UI page that documents the service-layer API.

## Features

- Google Authentication (Firebase Auth)
- Create tasks (title only)
- Real-time task list per user (Firestore `onSnapshot`)
- Update status: `Planned` | `In Progress` | `Complete`
- Task priority: `High` | `Medium` | `Low`
- Delete tasks (with confirmation)
- Usability enhancements: status colors + dot, summary counts, empty/loading states, completed strikethrough
- Filter bar, search, and sort options (client-side)
- Dashboard card + progress bar + completion donut chart
- Toast notifications for create/update/delete
- In-app API docs via Swagger UI

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Firebase Auth (Google provider)
- Firestore (NoSQL, realtime listeners)
- Swagger UI (`swagger-ui-react`) + spec in `swagger.config.js`

## Environment Variables

Create or update `.env.local` in the project root (`task-manager/.env.local`) with:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

> Vite only exposes env vars prefixed with `VITE_`.

## Run Locally

From the `task-manager/` folder:

```bash
npm install
npm run dev
```

Open the URL shown in the terminal.

## Swagger / API Docs

- Sign in
- Click the **📄 API Docs** button in the header to toggle Swagger UI

The spec is defined in `swagger.config.js`, and service-layer functions are implemented in `src/services/taskService.js`.

## REST API (for Postman / Swagger Execute)

This repo includes real HTTP endpoints under `/api/*` so Swagger "Execute" and Postman can create/update/delete tasks.

Base URL (local):
- If you run `npm run dev` (Vite), only the UI runs at `http://localhost:5173`.
- For API routes locally, run via Vercel (recommended): `npx vercel dev` (usually `http://localhost:3000`).

Endpoints:
- `GET /api/tasks` (auth required)
- `POST /api/tasks` (auth required) — body: `{ "title": "...", "priority": "High" | "Medium" | "Low" }` (priority optional)
- `PATCH /api/tasks/:id/status` (auth required) — body: `{ "status": "Planned" | "In Progress" | "Complete" }`
- `DELETE /api/tasks/:id` (auth required)

### Auth (Bearer token)

All `/api/*` endpoints require:

`Authorization: Bearer <FIREBASE_ID_TOKEN>`

To get a token during local dev:
1) Run the app, sign in.
2) Open DevTools Console and run:

```js
await import('/src/firebase.js')
  .then((m) => m.auth.currentUser.getIdToken())
  .then((t) => console.log(t))
```

Copy the printed token into Postman → Authorization → Bearer Token.

### Firebase Admin credentials (server-side)

The REST API uses `firebase-admin` and needs service-account credentials.

Option A (recommended): one env var
- `FIREBASE_SERVICE_ACCOUNT_KEY` = the entire service account JSON as a single string

Option B: three env vars
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY` (paste with `\n` for newlines)

**Local dev:** add these to `task-manager/.env.local` (safe: Vite will NOT expose them because they do not start with `VITE_`).

**Vercel:** Project → Settings → Environment Variables → add the same variables for Production/Preview.

## Data Model

Firestore collection: `tasks`

```js
{
  id: string,
  title: string, // max 200 chars
  status: "Planned" | "In Progress" | "Complete",
  priority: "High" | "Medium" | "Low",
  userId: string,
  createdAt: Timestamp
}
```

## Assumptions Implemented

- Tasks are user-isolated: query filters by `userId == auth.uid`
- Newest tasks first (`orderBy('createdAt', 'desc')`)
- Title is read-only after creation; only status is editable
- Status can move freely between all three values

## Required Firestore Index

The app (and the REST API) queries tasks like this:
- `where('userId', '==', <uid>)`
- `orderBy('createdAt', 'desc')`

Firestore typically requires a **composite index** for that query.

Create it in Firebase Console:
- Firestore Database → **Indexes** → **Composite** → **Add index**
- Collection: `tasks`
- Fields:
  - `userId` **Ascending**
  - `createdAt` **Descending**

Wait until the index status becomes **Enabled**, then reload the app.
