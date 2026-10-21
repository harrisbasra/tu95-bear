# Turning on cloud saves (Firebase)

The 3D game can save each pilot's name, mission stars and the whole career (profile, fleet, bank account and statement) to Firebase, so progress follows them across devices. Without Firebase the game still works and saves in the browser.

You need a Google account and Node.js 18 or later. Run these commands from the repository root.

## 1. Install the CLI and sign in

```bash
npm install -g firebase-tools
firebase login
```

`firebase login` opens a browser window for your Google account.

## 2. Create the project, database and web app

Pick a project ID that is unique across Firebase, for example `tu95-bear-harris`.

```bash
firebase projects:create tu95-bear-harris --display-name "Tu-95 Bear"
firebase use tu95-bear-harris
firebase firestore:databases:create "(default)" --location=asia-south1
firebase apps:create web "Tu-95 Bear 3D"
firebase apps:sdkconfig web
```

`firebase use` writes a `.firebaserc` file; it is safe to commit. `asia-south1` is Mumbai, the closest region to Lahore.

## 3. Paste the config into the game

`firebase apps:sdkconfig web` prints an object like `{ apiKey: "…", authDomain: "…", projectId: "…", … }`. Put it in [`3d/firebase-config.js`](../3d/firebase-config.js):

```js
window.TU95_FIREBASE = {
  apiKey: "…",
  authDomain: "tu95-bear-harris.firebaseapp.com",
  projectId: "tu95-bear-harris",
  appId: "…"
};
```

These values identify your project to the browser and are meant to be public. The security rules below are what protect the data.

## 4. Deploy the security rules and index

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

### What's stored

| Path | What's in it |
|---|---|
| `pilots/{uid}` | `name` (up to 24 characters), `progress` (mission stars, last aircraft and airport), `career` (pilot profile, day, balance, fleet, loans, monthly summaries, the flight in progress) and `updatedAt` (server time) |
| `pilots/{uid}/tx/{id}` | One bank transaction each: number, day, description, amount, balance after, kind and which career it belongs to. Written once, never edited |

Transactions are separate documents so the pilot document stays small, far under Firestore's 1 MiB limit, however long a career runs. The composite index in [`firestore.indexes.json`](../firestore.indexes.json) lets the game load a career's latest transactions.

### What the rules allow

[`firestore.rules`](../firestore.rules) lets each signed-in pilot read, write and delete only their own data. They also check every write:

- **Allowed fields:** only the fields above, with the right types and sizes. The name is at most 24 characters; there are at most 40 aircraft, 20 loans and 24 monthly summaries.
- **Timestamps:** the server sets `updatedAt`; a client-chosen time is rejected.
- **Anti-cheat limits:** the balance must stay between −100 million and 2 billion credits. Within one career, a single save can't move the balance by more than 60 million credits, and flight hours never go backwards.
- **Transactions:** they are append-only, with amounts limited to ±30 million credits.

These checks stop obviously broken or tampered saves. They can't stop a determined cheat, because a game that runs in the browser can always be modified (see the README).

### Testing the rules

```bash
npm run test:rules    # 19 checks against the Firestore emulator
npm start             # then, in another terminal:
npm run test:cloud    # the game's own Firebase code: sync, restore on a new browser, offline and back
```

Both need [Java 21 or later](https://adoptium.net/) for the emulators. `test:cloud` opens the game with `?emulator`, which connects to the local emulators and signs in anonymously. That switch only works on `localhost`.

## 5. Turn on Google sign-in (Firebase console)

Two settings aren't available from the CLI:

1. In the [Firebase console](https://console.firebase.google.com/), open the project, then **Authentication → Sign-in method**, and enable **Google**.
2. In **Authentication → Settings → Authorized domains**, add `harrisbasra.github.io`.

## 6. Ship it

```bash
git add 3d/firebase-config.js .firebaserc
git commit -m "Turn on cloud saves"
git push
```

GitHub Pages redeploys automatically. A **Sign in with Google** button then appears under the pilot name on the 3D menu.

## How syncing works

- **Offline:** the game uses Firestore's offline cache, so you can keep flying offline and changes sync when the connection comes back. The menu shows when you're offline or syncing.
- **Batching:** after a flight, the career and its new transactions go up together in one batch.
- **Signing in on a device that already has a local career:** mission stars from both are kept. A career can't be merged safely with a different one, so the more recently played career wins. The other is kept in that browser's storage under `tu95-bear-3d-career-v1-backup`, so nothing is lost.
- **Resetting:** resetting a career in the game deletes it, and its transactions, from the cloud too.
