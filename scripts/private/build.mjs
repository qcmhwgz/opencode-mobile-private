import { spawnSync } from 'node:child_process';
import { existsSync, cpSync, mkdirSync } from 'node:fs';
const env = { ...process.env, EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1', EXPO_PUBLIC_E2E_MODE: '0', EXPO_APP_VARIANT: 'production', EXPO_PUBLIC_FOSS: '1' };
for (const key of Object.keys(env)) if (/KEYSTORE|KEY_PASSWORD|SIGNING/.test(key)) delete env[key];
const freeze = process.argv.includes('--freeze-dependencies');
if (!freeze && !existsSync('config/private/gradle-locks')) throw new Error('Native locks missing. First run: npm run private:build -- --freeze-dependencies');
let result = spawnSync(process.execPath, ['scripts/private/prebuild.mjs'], { env, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
result = spawnSync(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', ['--no-daemon', ':app:assembleRelease', '-PreactNativeArchitectures=arm64-v8a', ...(freeze ? ['--write-locks', '--write-verification-metadata', 'sha256', '-PprivateFreezeDependencies=true'] : ['--dependency-verification=strict'])], { cwd: 'android', env, stdio: 'inherit' });
if (result.status === 0 && freeze) {
  mkdirSync('config/private', { recursive: true });
  cpSync('android/private-locks', 'config/private/gradle-locks', { recursive: true });
  cpSync('android/gradle/verification-metadata.xml', 'config/private/verification-metadata.xml');
}
process.exit(result.status ?? 1);
