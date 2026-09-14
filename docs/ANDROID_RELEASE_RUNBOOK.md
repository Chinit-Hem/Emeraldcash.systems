# Android production release runbook

## One-time setup

1. Install JDK 21 (or JDK 17) and confirm `java -version` works in Terminal.
2. From the project root, create the private keystore. This command asks for passwords interactively; do not put them in chat, Git, or screenshots.

   ```bash
   mkdir -p android/release
   keytool -genkeypair -v \
     -keystore android/release/emeraldcash-release.jks \
     -alias emeraldcash \
     -keyalg RSA -keysize 4096 -validity 10000
   ```

3. Copy `android/keystore.properties.example` to `android/keystore.properties` and replace the two password placeholders with the passwords chosen above.
4. Store a backup of both `emeraldcash-release.jks` and its passwords in a secure password manager or company-controlled encrypted storage. The same key is required for future app updates.

## Generate release files

```bash
npx cap sync android
cd android && bash ./gradlew :app:assembleRelease
cd android && bash ./gradlew :app:bundleRelease
```

Artifacts:

- APK for direct installation: `android/app/build/outputs/apk/release/app-release.apk`
- AAB for Google Play Console: `android/app/build/outputs/bundle/release/app-release.aab`

## Before distribution

- Install the APK on a real Android device and verify login, VMS, LMS, SMS, user roles, and logout.
- Confirm the app reaches `https://emeraldcash-systems.vercel.app` on Wi-Fi and mobile data.
- Update version code/name in `android/app/build.gradle` for every public release.
- Upload the AAB to Google Play Console for Play Store distribution. Use the APK only for direct/internal distribution.
