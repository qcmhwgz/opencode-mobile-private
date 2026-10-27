const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod, withMainActivity, withMainApplication, withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

module.exports = function privateAndroid(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const app = manifest.application[0];
    Object.assign(app.$, {
      'android:allowBackup': 'false', 'android:usesCleartextTraffic': 'false',
      'android:networkSecurityConfig': '@xml/private_network_security',
      'android:fullBackupContent': 'false', 'android:dataExtractionRules': '@xml/private_data_extraction',
    });
    // AGP sets the build-type flag; a literal Manifest flag fails release lint.
    delete app.$['android:debuggable'];
    // No inbound deep links, shares, app links or package discovery.
    delete manifest.queries;
    for (const activity of app.activity ?? []) {
      activity['intent-filter'] = (activity['intent-filter'] ?? []).filter((filter) =>
        (filter.category ?? []).some((category) => category.$?.['android:name'] === 'android.intent.category.LAUNCHER'));
    }
    return mod;
  });
  config = withMainActivity(config, (mod) => {
    const anchor = 'super.onCreate(null)';
    if (!mod.modResults.contents.includes(anchor)) throw new Error('MainActivity anchor changed');
    mod.modResults.contents = mod.modResults.contents.replace(anchor,
      `${anchor}\n    window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)`);
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const anchor = 'super.onCreate()';
    if (!mod.modResults.contents.includes(anchor)) throw new Error('MainApplication anchor changed');
    mod.modResults.contents = mod.modResults.contents.replace(anchor, `${anchor}\n    PrivateNetwork.install(this)`);
    return mod;
  });
  config = withAppBuildGradle(config, (mod) => {
    const source = mod.modResults.contents;
    if (!source.includes('signingConfig signingConfigs.debug')) throw new Error('Release signing template changed; review it');
    // Expo templates otherwise sign release with the bundled debug keystore.
    mod.modResults.contents = source.replace(/(release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/, '$1debuggable false\n            signingConfig = null');
    if (!mod.modResults.contents.includes('signingConfig = null')) throw new Error('Unsigned release patch failed');
    return mod;
  });
  config = withProjectBuildGradle(config, (mod) => {
    mod.modResults.contents += `
// Private Edition: one committed lock per project/configuration.
allprojects {
  dependencyLocking {
    lockAllConfigurations()
    lockMode = providers.gradleProperty("privateFreezeDependencies").isPresent() ? org.gradle.api.artifacts.dsl.LockMode.DEFAULT : org.gradle.api.artifacts.dsl.LockMode.STRICT
    lockFile = rootProject.file("private-locks/" + project.path.replace(":", "_") + ".lockfile")
  }
}
`;
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const root = mod.modRequest.projectRoot;
    const xml = path.join(root, 'android/app/src/main/res/xml');
    fs.mkdirSync(xml, { recursive: true });
    fs.writeFileSync(path.join(xml, 'private_network_security.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">10.0.0.2</domain></domain-config>
</network-security-config>`);
    fs.copyFileSync(path.join(root, 'config/private/data-extraction-rules.xml'), path.join(xml, 'private_data_extraction.xml'));
    const java = path.join(root, 'android/app/src/main/java/app/opencode/mobile/privateedition');
    fs.mkdirSync(java, { recursive: true });
    fs.copyFileSync(path.join(root, 'config/private/PrivateNetwork.kt'), path.join(java, 'PrivateNetwork.kt'));
    return mod;
  }]);
};
