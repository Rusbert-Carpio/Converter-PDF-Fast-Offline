# Build fix notes

This project was cleaned up to fix Android build failures related to AdMob + Gradle.

## What was changed

- Removed deprecated `expo-ads-admob`.
- Kept the app on `react-native-google-mobile-ads`, which is what the source code already uses.
- Replaced the Expo plugin config from `expo-ads-admob` to `react-native-google-mobile-ads` in `app.json`.
- Enabled `delayAppMeasurementInit` for AdMob initialization safety.
- Updated Android build properties to `compileSdkVersion: 36` and `targetSdkVersion: 36` to match Expo SDK 54 / RN 0.81 expectations and current Play requirements more closely.
- Removed explicit web-only dependencies from `package.json`:
  - `react-dom`
  - `react-native-web`
  - `react-native-webview`
- Removed the stale `package-lock.json` so a fresh install can generate a clean dependency graph.
- Added helper scripts:
  - `npm run prebuild`
  - `npm run android:prebuild`
  - `npm run build:aab`

## Important

Your uploaded zip did **not** include `android/` or `ios/` because `.gitignore` excludes them.
That is actually helpful here: the safest path is to regenerate native projects cleanly.

## Recommended commands on Windows

Run these from the project root:

```powershell
rd /s /q node_modules
npm install
npx expo install --fix
npx expo prebuild --clean
npx expo run:android
```

For a production Android App Bundle with EAS:

```powershell
npx eas build -p android --profile production
```

## About `gradlew` on Windows

If you ever run Gradle manually inside `android/`, use:

```powershell
.\gradlew.bat bundleRelease
```

Not just `gradlew`.
