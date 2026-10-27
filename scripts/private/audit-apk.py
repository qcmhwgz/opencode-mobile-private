#!/usr/bin/env python3
"""Artifact checks, not a penetration test or proof of zero external traffic."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import xml.etree.ElementTree as ET
import zipfile

p = argparse.ArgumentParser()
p.add_argument('apk', type=Path)
p.add_argument('--apkanalyzer', default='apkanalyzer')
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
for key in ['allowBackup', 'debuggable']:
    if app.get(android + key) != 'false':
        failures.append(key + ' must be false')
if app.get(android + 'networkSecurityConfig') is None:
    failures.append('Network security configuration missing')
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
          'permissions': permissions, 'exported': exported, 'abis': abis, 'failures': failures,
          'limitations': ['No device traffic capture, authenticated server acceptance or signer verification in this check.']}
args.report.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
raise SystemExit(bool(failures))
