import sys
from pathlib import Path
import unittest
import xml.etree.ElementTree as ET

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT / 'scripts/private'))
from apk_policy import backup_failures, network_failures, resource_failures

NETWORK = b'<network-security-config><base-config cleartextTrafficPermitted="false"/><domain-config cleartextTrafficPermitted="true"><domain includeSubdomains="false">10.0.0.2</domain></domain-config></network-security-config>'
BACKUP = (PROJECT / 'config/private/data-extraction-rules.xml').read_bytes()


class CompiledResourcePolicyTests(unittest.TestCase):
    def test_complete_backup_exclusions(self):
        self.assertEqual(backup_failures(BACKUP), [])

    def test_missing_exclusions_are_rejected_in_each_mode(self):
        for mode in ('cloud-backup', 'device-transfer'):
            for index in range(9):
                with self.subTest(mode=mode, index=index):
                    root = ET.fromstring(BACKUP)
                    section = root.find(mode)
                    section.remove(section[index])
                    self.assertTrue(backup_failures(ET.tostring(root)))

    def test_backup_includes_and_cross_platform_opt_in_are_rejected(self):
        for target in ('cloud-backup', 'device-transfer', None):
            root = ET.fromstring(BACKUP)
            parent = root.find(target) if target else root
            ET.SubElement(parent, 'include' if target else 'cross-platform-transfer')
            self.assertTrue(backup_failures(ET.tostring(root)))

    def test_only_private_destination_is_allowed(self):
        self.assertEqual(network_failures(NETWORK), [])
        for mutation in (
            NETWORK.replace(b'10.0.0.2', b'10.0.0.3'),
            NETWORK.replace(b'includeSubdomains="false"', b'includeSubdomains="true"'),
            NETWORK.replace(b'cleartextTrafficPermitted="false"', b'cleartextTrafficPermitted="true"'),
            NETWORK.replace(b'</domain-config>', b'<domain>external.example</domain></domain-config>'),
        ):
            self.assertTrue(network_failures(mutation))

    def test_missing_scopes_are_rejected(self):
        self.assertTrue(backup_failures(b'<data-extraction-rules/>'))
        self.assertTrue(network_failures(b'<network-security-config/>'))

    def test_manifest_must_reference_the_decoded_resource_without_alternates(self):
        table = '    resource 0x7f010001 xml/private_network_security\n      () (file) res/xml/private_network_security.xml type=XML\n'
        self.assertEqual(resource_failures('@ref/0x7f010001', table, 'private_network_security'), [])
        self.assertTrue(resource_failures('@ref/0x7f010000', table, 'private_network_security'))
        self.assertTrue(resource_failures('@ref/0x7f010001', table + '      (v36) (file) res/xml-v36/other.xml type=XML\n', 'private_network_security'))

    def test_omitted_text_requires_aapt2_text_inside_the_domain(self):
        omitted = NETWORK.replace(b'10.0.0.2', b'')
        tree = "E: network-security-config\n    E: domain-config\n        E: domain\n          A: includeSubdomains=false\n            T: '10.0.0.2'\n"
        self.assertTrue(network_failures(omitted))
        self.assertEqual(network_failures(omitted, tree), [])
        self.assertTrue(network_failures(omitted, tree.replace('10.0.0.2', '10.0.0.3')))
        self.assertTrue(network_failures(omitted, "E: network-security-config\n  T: '10.0.0.2'\n    E: domain-config\n        E: domain\n"))


if __name__ == '__main__':
    unittest.main()
