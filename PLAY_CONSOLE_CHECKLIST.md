# Play Console checklist

## Manifest / permissions
- [x] Keep only `CAMERA` in Android permissions.
- [x] Block `READ_MEDIA_IMAGES`.
- [x] Block `RECORD_AUDIO`.
- [x] Ask camera permission only when user taps camera.
- [x] Stop requesting gallery permission before opening gallery picker.

## In-app privacy
- [x] Updated in-app privacy screen.
- [x] Added public-policy draft in `PRIVACY_POLICY_FOR_PLAY_CONSOLE.md`.

## Console declarations to verify manually
- [ ] Store listing privacy-policy URL points to the final public page.
- [ ] App content > Data safety matches AdMob and Billing usage.
- [ ] App content > Ads = Yes.
- [ ] If an older track still uses `READ_MEDIA_IMAGES`, deactivate or replace that release too.
- [ ] Upload a fresh AAB with a higher version code after running a clean prebuild.

## Suggested clean rebuild steps
1. Delete old native folders if present.
2. Run `npm install` to sync dependencies.
3. Run `npx expo prebuild --clean`.
4. Inspect generated `AndroidManifest.xml` and confirm `READ_MEDIA_IMAGES` / `RECORD_AUDIO` are absent.
5. Build a new AAB and upload that version code to Play Console.
