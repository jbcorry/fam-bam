# fam-bam

Story making app for family and friends to have fun together.

## Get started

1. Install dependencies
   ```bash
   npm install
   ```
2. Start the app
   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a development build, Android emulator, iOS simulator, or Expo Go. The app uses file-based routing under the `app` directory.

## Firebase setup (story + players persistence)

1. Create a Firebase project and enable Cloud Firestore.
2. In the Firebase console, add a Web app to grab the config values.
3. Create a `.env` file in the project root with:

   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   EXPO_PUBLIC_FIREBASE_APP_ID=...
   # Google auth (create OAuth client IDs in Firebase console)
   EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
   ```

4. Restart `npx expo start` so the env vars are picked up. The app will connect to Firestore and sync the shared session (`shared-story`) across devices.

## Reset to a blank app

Run:

```bash
npm run reset-project
```

This moves the starter code to `app-example` and creates a blank `app` directory to build from scratch.

## Learn more

- [Expo docs](https://docs.expo.dev/)
- [File-based routing](https://docs.expo.dev/router/introduction)
- [React Native docs](https://reactnative.dev/)
