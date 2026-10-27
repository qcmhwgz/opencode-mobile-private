#!/usr/bin/env python3
"""Local-only signing. Never writes or uploads passwords or private keys."""
import argparse
import getpass
import hashlib
import os
from pathlib import Path
import re
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('--apk', required=True, type=Path)
parser.add_argument('--keystore', required=True, type=Path)
parser.add_argument('--alias', required=True)
parser.add_argument('--build-tools', required=True, type=Path)
parser.add_argument('--expected-cert-sha256', required=True)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
expected = args.expected_cert_sha256.replace(':', '').strip().lower()
if not re.fullmatch('[0-9a-f]{64}', expected):
    parser.error('Expected certificate fingerprint must contain 64 hex characters')
if args.output.exists() or args.apk.resolve() == args.output.resolve():
    parser.error('Choose a new output path; refusing to overwrite')
if args.alias.lower() == 'androiddebugkey':
    parser.error('The Android debug key cannot sign a private release')
env = os.environ.copy()
env['PRIVATE_STORE_PASSWORD'] = getpass.getpass('Keystore password: ')
env['PRIVATE_KEY_PASSWORD'] = getpass.getpass('Key password (blank = same): ') or env['PRIVATE_STORE_PASSWORD']
def run(argv, capture=False):
    return subprocess.run([str(a) for a in argv], env=env, check=True, capture_output=capture)
try:
    cert = run(['keytool', '-exportcert', '-keystore', args.keystore, '-alias', args.alias,
                '-storepass:env', 'PRIVATE_STORE_PASSWORD'], True).stdout
    if hashlib.sha256(cert).hexdigest() != expected:
        raise SystemExit('Certificate fingerprint does not match the trusted value')
    with tempfile.TemporaryDirectory(prefix='opencode-local-sign-') as directory:
        aligned = Path(directory) / 'aligned.apk'
        signed = Path(directory) / 'signed.apk'
        run([args.build_tools / 'zipalign', '-P', '16', '-f', '4', args.apk, aligned])
        run([args.build_tools / 'apksigner', 'sign', '--ks', args.keystore,
             '--ks-key-alias', args.alias, '--ks-pass', 'env:PRIVATE_STORE_PASSWORD',
             '--key-pass', 'env:PRIVATE_KEY_PASSWORD', '--v1-signing-enabled', 'false',
             '--v2-signing-enabled', 'true', '--v3-signing-enabled', 'true', '--out', signed, aligned])
        verification = run([args.build_tools / 'apksigner', 'verify', '--verbose', '--print-certs', signed], True).stdout.decode()
        fingerprints = re.findall(r'Signer #\d+ certificate SHA-256 digest: ([0-9a-fA-F]+)', verification)
        if len(fingerprints) != 1 or fingerprints[0].lower() != expected or 'CN=Android Debug' in verification:
            raise SystemExit('Final APK signer verification failed')
        run([args.build_tools / 'zipalign', '-c', '-P', '16', '4', signed])
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(signed.read_bytes())
        args.output.with_suffix('.signature.txt').write_text(verification)
        digest = hashlib.sha256(args.output.read_bytes()).hexdigest()
        args.output.with_suffix('.apk.sha256').write_text(f'{digest}  {args.output.name}\n')
        print(f'Verified signer: {expected}\nSHA-256: {digest}\nAPK: {args.output}')
finally:
    env.pop('PRIVATE_STORE_PASSWORD', None)
    env.pop('PRIVATE_KEY_PASSWORD', None)
