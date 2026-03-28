# Mobile Packaging Guide

This repository currently ships a web build only.

It is not yet configured with:

- Capacitor
- native Android or iOS folders
- offline-first service worker support
- a completed safe-area pass for all HUD elements

## If You Want Native Packaging Later

Use this order:

1. Finish the UI and safe-area work from the refactor backlog.
2. Decide whether the project should support:
   - mobile browser only
   - installable PWA
   - Capacitor native wrappers
3. If native wrappers are still desired, then add Capacitor dependencies and platform folders.
4. Build `dist/` with `npm run build` before syncing any native project.

## Capacitor Setup Outline

These commands are future work, not current project setup:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init
npx cap add android
```

For iOS later:

```bash
npm install @capacitor/ios
npx cap add ios
```

## Current Mobile Notes

- Touch controls are present in the web build.
- `touch-action: none` is already applied globally.
- HUD safe-area support still needs a dedicated implementation pass.
