# Turning on cloud saves (Firebase)

The 3D game can save each pilot's name and mission stars to Firebase, so progress follows them across devices. Without Firebase the game still works and saves in the browser.

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

## 4. Deploy the security rules

```bash
firebase deploy --only firestore:rules
```

[`firestore.rules`](../firestore.rules) lets each signed-in pilot read and write only their own document, `pilots/{uid}`, holding a name of up to 24 characters and their progress.

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
