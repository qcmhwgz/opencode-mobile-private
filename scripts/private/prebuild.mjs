import './prepare-native.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, cpSync, mkdirSync } from 'node:fs';

// Avoid inherited .env settings changing a release build.
const env = { ...process.env, EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', CI: '1',
  EXPO_PUBLIC_E2E_MODE: '0', EXPO_APP_VARIANT: 'production', EXPO_PUBLIC_FOSS: '1' };
const result = spawnSync(process.execPath, ['node_modules/expo/bin/cli', 'prebuild', '--platform', 'android', '--clean', '--no-install'], { env, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
// Fail closed if generated release uses any signing config.
const gradle = readFileSync('android/app/build.gradle', 'utf8');
if (!gradle.includes('signingConfig = null')) throw new Error('Unsigned release configuration missing');
const properties = 'android/gradle.properties';
writeFileSync(properties, readFileSync(properties, 'utf8') + '\nreactNativeArchitectures=arm64-v8a\n');
console.log('Private Android project generated. No APK has been built yet.');

const locked = 'config/private/gradle-locks';
if (existsSync(locked)) cpSync(locked, 'android/private-locks', { recursive: true });
if (existsSync('config/private/verification-metadata.xml')) {
  mkdirSync('android/gradle', { recursive: true });
  cpSync('config/private/verification-metadata.xml', 'android/gradle/verification-metadata.xml');
}
// Verify the Gradle distribution itself before any dependency is executed.
const wrapper = 'android/gradle/wrapper/gradle-wrapper.properties';
const expected = JSON.parse(readFileSync('private-toolchain.json', 'utf8'));
const wrapperText = readFileSync(wrapper, 'utf8').replace('networkTimeout=10000', 'networkTimeout=60000');
if (!wrapperText.includes('gradle-' + expected.gradle + '-bin.zip')) throw new Error('Gradle version changed');
writeFileSync(wrapper, wrapperText + '\ndistributionSha256Sum=' + expected.gradleSha256 + '\n');
