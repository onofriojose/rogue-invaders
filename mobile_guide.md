# Mobile App Conversion & Publishing Guide

This guide explains how to convert your web game (`nova-starship-survivor`) into a native **Android** and **iOS** app using **Capacitor**, and how to publish it.

## 📱 Prerequisites

1.  **Node.js** (You already have this).
2.  **Android Studio** (For Android builds): [Download Here](https://developer.android.com/studio).
3.  **Xcode** (For iOS builds): Requires a Mac. Download from the Mac App Store.
4.  **Google Play Developer Account** ($25 one-time fee).
5.  **Apple Developer Program** ($99/year).

---

## 🤖 Part 1: Android Conversion

### 1. Install Capacitor
In your project terminal, run:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
```
*(When asked: App Name = "Nova Starship", App ID = "com.yourname.novastarship")*

### 2. Build the Web Assets
We need to generate the static files (`dist/`) that Capacitor will wrap.
```bash
npm run build
```

### 3. Add Android Platform
```bash
npx cap add android
```
This creates an `android/` folder in your project. This IS a real Android Studio project!

### 4. Sync
Whenever you change your React code, run this to update the Android project:
```bash
npm run build
npx cap sync
```

### 5. Open in Android Studio
```bash
npx cap open android
```
This launches Android Studio.

### 6. Build the APK / Bundle
Inside Android Studio:
1.  Wait for Gradle sync to finish.
2.  Go to **Build > Generate Signed Bundle / APK**.
3.  Choose **Android App Bundle (.aab)** (Required for Play Store).
4.  Create a strict **Keystore** (Save this file safely! If you lose it, you can never update your app again).
5.  Click **Finish**. Android Studio will generate a `.aab` file.

---

## 🚀 Part 2: Publishing to Google Play Store

1.  **Go to Google Play Console**: [play.google.com/console](https://play.google.com/console).
2.  **Create App**: Click "Create App". Enter details (Name: Nova Starship Survivor, Language: English, Game).
3.  **Dashboard Setup**: Follow the steps on the dashboard:
    *   **Main Store Listing**: Upload Icon (512x512), Feature Graphic (1024x500), Screenshots.
    *   **Content Rating**: Fill out the questionnaire (it's a game, mild fantasy violence?).
    *   **Privacy Policy**: You need a URL. (You can host a simple one on GitHub Pages).
4.  **Upload Bundle**:
    *   Go to **Production** (or Internal Testing first).
    *   Click "Create new release".
    *   Upload the `.aab` file you built in Android Studio.
5.  **Review & Rollout**: Click "Start Rollout to Production". Google usually reviews new games in 2-4 days.

---

## 🍎 Part 3: iOS Conversion (Mac Only)

1.  **Install iOS Platform**:
    ```bash
    npm install @capacitor/ios
    npx cap add ios
    ```
2.  **Open in Xcode**:
    ```bash
    npx cap open ios
    ```
3.  **Signing**: In Xcode, click the Project root > Signing & Capabilities > Add your Apple ID Team.
4.  **Archive**: Product > Archive.
5.  **Upload**: Use the "Distribute App" button in the Organizer to upload to **App Store Connect**.

---

## 🛠️ Typical "Gotchas"

*   **Touch Delay**: If the joystick feels laggy on mobile, ensure `touch-action: none` is in your CSS for the joystick element (Already added).
*   **Safe Areas**: iPhones have notches. Ensure your UI (`#ui-layer`) has padding or respects safe areas (We added `viewport-fit=cover`).
