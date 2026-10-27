"""Validate decoded APK XML against the private edition's resource policy."""
import xml.etree.ElementTree as ET
import re

STORAGE_DOMAINS = {
    'root', 'file', 'database', 'sharedpref', 'external',
    'device_root', 'device_file', 'device_database', 'device_sharedpref',
}


def resource_xml_path(reference, table, name):
    matches = list(re.finditer(r'^\s*resource\s+(0x[0-9a-fA-F]+)\s+xml/' + re.escape(name) + r'\s*$', table, re.M))
    if len(matches) != 1:
        return None, ['Missing or ambiguous resource: ' + name]
    entry = matches[0]
    resource_id = entry.group(1)
    if reference not in {'@ref/' + resource_id, '@' + resource_id, '@xml/' + name}:
        return None, ['Manifest does not reference audited resource: ' + name]
    tail = table[entry.end():]
    next_entry = re.search(r'^\s*resource\s+', tail, re.M)
    block = tail[:next_entry.start()] if next_entry else tail
    configs = re.findall(r'^\s*\(([^)]*)\)\s+([^\n]+)', block, re.M)
    if len(configs) != 1 or configs[0][0] != '':
        return None, ['Unexpected resource variants or alias: ' + name]
    file = re.fullmatch(r'\(file\)\s+(res/(?:[A-Za-z0-9_-]+/)*[A-Za-z0-9_.-]+\.xml)\s+type=XML', configs[0][1].strip())
    if file is None:
        return None, ['Unexpected resource variants or alias: ' + name]
    # R8 may shorten the path. Trust its resource-table binding, then inspect
    # that exact binary XML; a filename alone never proves the policy.
    return file.group(1), []


def resource_failures(reference, table, name):
    return resource_xml_path(reference, table, name)[1]


def backup_failures(xml):
    root = ET.fromstring(xml)
    failures = []
    if root.tag != 'data-extraction-rules' or sorted(n.tag for n in root) != ['cloud-backup', 'device-transfer']:
        failures.append('Unexpected backup modes or cross-platform transfer opt-in')
    for mode in ('cloud-backup', 'device-transfer'):
        section = root.find(mode)
        if section is None:
            failures.append('Missing backup mode: ' + mode)
            continue
        rules = {(n.get('domain'), n.get('path')) for n in section.findall('exclude')}
        if rules != {(domain, '.') for domain in STORAGE_DOMAINS}:
            failures.append('Incomplete storage exclusions: ' + mode)
        if any(n.tag != 'exclude' for n in section):
            failures.append('Unexpected backup inclusion or element: ' + mode)
    return failures


def _private_domain_text(binary_tree):
    lines = binary_tree.splitlines()
    domains = [(index, len(match.group(1))) for index, line in enumerate(lines)
               if (match := re.match(r'(\s*)E: domain(?:\s|$)', line))]
    if len(domains) != 1:
        return False
    index, level = domains[0]
    texts = []
    for line in lines[index + 1:]:
        if not line.strip():
            continue
        if len(line) - len(line.lstrip()) <= level:
            break
        if line.strip().startswith('T:'):
            texts.append(line.strip())
    return texts == ["T: '10.0.0.2'"]


def network_failures(xml, binary_tree=None):
    root = ET.fromstring(xml)
    base = root.find('base-config')
    config = root.find('domain-config')
    failures = []
    if root.tag != 'network-security-config' or sorted(n.tag for n in root) != ['base-config', 'domain-config']:
        failures.append('Unexpected network security scopes')
    if base is None or base.attrib != {'cleartextTrafficPermitted': 'false'} or len(base):
        failures.append('Default network security policy is not restrictive')
    if config is None or config.attrib != {'cleartextTrafficPermitted': 'true'} or len(config) != 1:
        failures.append('Unexpected destination network policy')
    else:
        domain = config[0]
        text = (domain.text or '').strip()
        # Some SDK apkanalyzer versions omit binary XML text nodes. In that
        # case require aapt2 to show the text inside this exact domain node.
        valid_text = text == '10.0.0.2' or (not text and binary_tree is not None and _private_domain_text(binary_tree))
        if binary_tree is not None and not _private_domain_text(binary_tree):
            valid_text = False
        if domain.tag != 'domain' or not valid_text or domain.attrib != {'includeSubdomains': 'false'} or len(domain):
            failures.append('Unexpected cleartext destination')
    return failures


def debug_failures(manifest_value, resolved_value):
    # Missing is Android's false default; the APK analyzer must confirm it.
    if manifest_value not in (None, 'false') or resolved_value != 'false':
        return ['Release APK must resolve to non-debuggable']
    return []
