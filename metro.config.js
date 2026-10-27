// Private Edition changes: see NOTICE and README.private.zh-CN.md.
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const pkg = require('./package.json');

const config = getDefaultConfig(__dirname);

// The FOSS (F-Droid) build excludes the native expo-iap and expo-camera
// modules from autolinking (see package.json `expo.autolinking.exclude`, set by
// scripts/build-android-release.mjs or the fdroiddata recipe). Importing either
// package loads a native module that is absent in this build, so redirect their
// JS entrypoints to local stubs. Cloud Link is disabled at runtime for FOSS, so
// the stubs are never exercised.
const fossExcludes = pkg.expo?.autolinking?.exclude ?? [];
// Kept package metadata drives Expo native exclusion as well as JS stubbing.
void fossExcludes;

{ // All builds of this fork omit cloud, store, notification and speech modules.
  const stubs = {
    'expo-sharing': path.resolve(__dirname, 'lib/private/sharing-stub.ts'),
    'expo-background-task': path.resolve(__dirname, 'lib/private/background-stub.ts'),
    'expo-task-manager': path.resolve(__dirname, 'lib/private/background-stub.ts'),
    'react-native-android-widget': path.resolve(__dirname, 'lib/private/widgets-stub.ts'),
    'expo-notifications': path.resolve(__dirname, 'lib/private/notifications-stub.ts'),
    'expo-speech-recognition': path.resolve(__dirname, 'lib/private/speech-stub.ts'),
    'expo-speech': path.resolve(__dirname, 'lib/private/speech-stub.ts'),
    'expo-application': path.resolve(__dirname, 'lib/private/application-stub.ts'),
    'expo-web-browser': path.resolve(__dirname, 'lib/private/browser-stub.ts'),
    'expo-iap': path.resolve(__dirname, 'lib/foss/expo-iap-stub.ts'),
    'expo-camera': path.resolve(__dirname, 'lib/foss/expo-camera-stub.tsx'),
    'expo-store-review': path.resolve(__dirname, 'lib/foss/expo-store-review-stub.ts'),
  };
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    const stub = stubs[moduleName];
    if (stub && (platform === 'android' || process.env.EXPO_PUBLIC_E2E_MODE !== '1')) {
      return context.resolveRequest(context, stub, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
