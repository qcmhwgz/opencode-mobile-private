#!/usr/bin/env python3
"""Artifact checks, not a penetration test or proof of zero external traffic."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile
from apk_policy import backup_failures, network_failures, resource_failures

p = argparse.ArgumentParser()
p.add_argument('apk', type=Path)
p.add_argument('--apkanalyzer', default='apkanalyzer')
sdk = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
p.add_argument('--aapt2', default=str(Path(sdk) / 'build-tools/36.0.0/aapt2') if sdk else 'aapt2')
p.add_argument('--report', type=Path, default=Path('private-apk-audit.json'))
args = p.parse_args()
android = '{http://schemas.android.com/apk/res/android}'
manifest = subprocess.run([args.apkanalyzer, 'manifest', 'print', str(args.apk)], check=True, capture_output=True).stdout
root = ET.fromstring(manifest)
app = root.find('application')
failures = []
permissions = [n.get(android + 'name') for n in root.findall('uses-permission')]
allowed = {'android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE',
           'app.opencode.mobile.privateedition.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'}
for permission in permissions:
    if permission not in allowed:
        failures.append('Unexpected permission: ' + str(permission))
for key in ['allowBackup', 'debuggable', 'usesCleartextTraffic', 'fullBackupContent']:
    if app.get(android + key) != 'false':
        failures.append(key + ' must be false')
if app.get(android + 'networkSecurityConfig') is None:
    failures.append('Network security configuration missing')
resource_checks = {}
table = subprocess.run([args.aapt2, 'dump', 'resources', str(args.apk)], check=True, capture_output=True, text=True).stdout
for resource, checker in [('private_network_security', network_failures), ('private_data_extraction', backup_failures)]:
    try:
        decoded = subprocess.run([args.apkanalyzer, 'resources', 'xml', '--file', 'res/xml/' + resource + '.xml', str(args.apk)], check=True, capture_output=True).stdout
        if resource == 'private_network_security':
            binary_tree = subprocess.run([args.aapt2, 'dump', 'xmltree', '--file', 'res/xml/' + resource + '.xml', str(args.apk)], check=True, capture_output=True, text=True).stdout
            issues = checker(decoded, binary_tree)
        else:
            issues = checker(decoded)
        attribute = 'networkSecurityConfig' if resource == 'private_network_security' else 'dataExtractionRules'
        issues.extend(resource_failures(app.get(android + attribute), table, resource))
        resource_checks[resource] = {'failures': issues}
        failures.extend(issues)
    except (subprocess.CalledProcessError, ET.ParseError) as error:
        failures.append('Unable to validate compiled XML: ' + resource)
        resource_checks[resource] = {'error': type(error).__name__}
if root.get('package') != 'app.opencode.mobile.privateedition':
    failures.append('Unexpected package ID')
exported = []
for node in app:
    if node.get(android + 'exported') == 'true':
        name = node.get(android + 'name')
        exported.append(name)
        if name not in {'.MainActivity', 'app.opencode.mobile.privateedition.MainActivity'}:
            failures.append('Unexpected exported component: ' + str(name))
denied = [b'com/google/firebase/', b'com/android/billingclient/', b'com/google/mlkit/',
          b'com/android/installreferrer/', b'expo/modules/updates/', b'app/getopencode/updates/',
          b'expo/modules/devlauncher/', b'expo/modules/devmenu/', b'io/sentry/', b'com/posthog/']
with zipfile.ZipFile(args.apk) as apk:
    for name in apk.namelist():
        if name.endswith('.dex'):
            data = apk.read(name)
            for needle in denied:
                if needle in data:
                    failures.append('Forbidden DEX namespace: ' + needle.decode())
    abis = sorted({name.split('/')[1] for name in apk.namelist() if name.startswith('lib/') and name.endswith('.so')})
    if abis != ['arm64-v8a']:
        failures.append('Unexpected ABIs: ' + ','.join(abis))
report = {'apk': args.apk.name, 'sha256': hashlib.sha256(args.apk.read_bytes()).hexdigest(),
          'permissions': permissions, 'exported': exported, 'abis': abis, 'resource_checks': resource_checks, 'failures': failures,
          'limitations': ['No device traffic capture, authenticated server acceptance or signer verification in this check.']}
args.report.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
raise SystemExit(bool(failures))
