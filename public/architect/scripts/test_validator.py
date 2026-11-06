#!/usr/bin/env python3
"""Simple regression check using shipped fixtures."""
import json
from pathlib import Path
from validate_project import check

root = Path(__file__).resolve().parents[1]
sample = json.loads((root / 'examples/sample-project.json').read_text(encoding='utf-8'))
broken = json.loads((root / 'examples/broken-project.json').read_text(encoding='utf-8'))
assert check(sample, gate=True) == ([], []), check(sample, gate=True)
errors, warnings = check(broken, gate=True)
assert errors, "Broken fixture must not pass"
assert any('習得は使用より前' in e for e in errors), errors
assert any('source_type' in e for e in errors), errors
assert any('未解決' in e for e in errors), errors
print('TESTS OK: valid fixture passes; broken fixture fails provenance, chronology and unresolved issue gates.')
