#!/usr/bin/env python3
import getpass
import os
import subprocess
env = os.environ.copy()
env['OPENCODE_PROBE_USERNAME'] = input('Server username [opencode]: ').strip() or 'opencode'
env['OPENCODE_PROBE_PASSWORD'] = getpass.getpass('Existing server password: ')
directory = input('Existing project directory for scoped reads [server default]: ').strip()
if directory:
    env['OPENCODE_PROBE_DIRECTORY'] = directory
session = input('Existing session ID for transcript/diff/form checks [skip]: ').strip()
if session:
    env['OPENCODE_PROBE_SESSION'] = session
try:
    raise SystemExit(subprocess.run(['node', 'scripts/private/probe.mjs'], env=env).returncode)
finally:
    env.pop('OPENCODE_PROBE_PASSWORD', None)
