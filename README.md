# Calesthenics APP

Application Android personnelle pour guider et enregistrer des séances de callisthénie.

Stack : React Native + Expo SDK 54 (TypeScript), Expo Router, SQLite locale (`expo-sqlite`).

## Développement

```bash
npm install
npx expo start
```

Puis scanner le QR code avec Expo Go.

## Build APK

```bash
npx expo-doctor
eas build -p android --profile preview
```
