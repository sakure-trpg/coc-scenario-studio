#!/usr/bin/env python3
"""候補の類似性検出のリグレッション検査。"""
import json
from pathlib import Path
from validate_idea_pool import check
root=Path(__file__).resolve().parents[1]
good=json.loads((root/'examples/scene-pool-diverse.json').read_text(encoding='utf-8'))
bad=json.loads((root/'examples/scene-pool-homogeneous.json').read_text(encoding='utf-8'))
errors, warnings=check(good,gate=True)
assert not errors,(errors,warnings)
errors, warnings=check(bad,gate=True)
assert errors,'一方向に偏った候補を不合格にすること'
assert any('scene_role' in err for err in errors)
assert any('anomaly_operation' in err for err in errors)
# Intentional narrow user constraint should exempt corresponding diversity axes.
constrained={**bad,'constraints':{k:True for k in ('scene_roles_fixed_by_user','pc_actions_fixed_by_user','dramatic_engines_fixed_by_user','anomaly_operations_fixed_by_user')}}
errors,_=check(constrained,gate=True)
assert not errors, 'ユーザーが4軸すべて固定した場合は多様性ゲートを強制しない'
assert any('省略' in x for x in _), '免除した場合は警告を出す'
print('TESTS OK: diversified pool passes; homogeneous pool fails; user constraints recognized.')
