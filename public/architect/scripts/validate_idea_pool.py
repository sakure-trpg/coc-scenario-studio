#!/usr/bin/env python3
"""シーン候補のラベル・集中度の形式検証。意味の独創性は保証しない。"""
import argparse
from collections import Counter
import json
import math
from pathlib import Path

FIELDS = ('scene_role','pc_primary_action','dramatic_engine','anomaly_operation',
          'core_stakes','story_action','player_choice')
DIVERSITY = ('scene_role','pc_primary_action','dramatic_engine','anomaly_operation')
FIXED_FLAGS = {
    'scene_role':'scene_roles_fixed_by_user',
    'pc_primary_action':'pc_actions_fixed_by_user',
    'dramatic_engine':'dramatic_engines_fixed_by_user',
    'anomaly_operation':'anomaly_operations_fixed_by_user',
}

def check(data, gate=False):
    errors, warnings = [], []
    pool=data.get('candidates')
    if not isinstance(pool,list) or not pool:
        return ['candidates は1件以上の配列である必要があります。'], warnings
    ids=[]
    for i,c in enumerate(pool,1):
        if not isinstance(c,dict):
            errors.append(f'候補{i}: オブジェクトではありません。'); continue
        cid=c.get('id')
        if not isinstance(cid,str) or not cid.strip(): errors.append(f'候補{i}: id がありません。')
        else: ids.append(cid.strip())
        for fld in FIELDS:
            if not isinstance(c.get(fld),str) or not c[fld].strip():
                errors.append(f'{cid or i}: {fld} が空です。')
        # This is deliberately shallow: creative quality needs human critique.
    if len(ids)!=len(set(ids)): errors.append('候補IDが重複しています。')
    if len(pool)<3:
        warnings.append('候補2件以下は集合多様性を評価できません（ユーザー指定なら可）。')
        return errors,warnings
    fixed=data.get('constraints',{})
    for fld in DIVERSITY:
        if isinstance(fixed,dict) and fixed.get(FIXED_FLAGS[fld]) is True: continue
        values=[c.get(fld,'').strip() for c in pool if isinstance(c.get(fld),str) and c.get(fld).strip()]
        counts=Counter(values)
        minimum=2 if len(pool)==3 else 3
        if len(counts)<minimum:
            msg=f'{fld}: {len(counts)}種類のみ（目安{minimum}種類以上）。同型候補が集中。'
            (errors if gate else warnings).append(msg)
        if counts:
            high_label,high_count=counts.most_common(1)[0]
            if high_count>math.ceil(len(pool)*.5):
                msg=f'{fld}: 「{high_label}」に{high_count}/{len(pool)}件が集中。'
                (errors if gate else warnings).append(msg)
    # User-fixed axes are exempt from comparing candidates; assess only free axes.
    free_axes=[fld for fld in DIVERSITY if not (isinstance(fixed,dict) and fixed.get(FIXED_FLAGS[fld]) is True)]
    if not free_axes:
        warnings.append('ユーザー指定で4軸すべて固定：集合の多様性ゲートを省略します。')
    for i,a in enumerate(pool):
        if not isinstance(a,dict): continue
        for b in pool[i+1:]:
            if not isinstance(b,dict):continue
            change=sum(a.get(fld)!=b.get(fld) for fld in free_axes)
            if free_axes and change<min(2,len(free_axes)):
                msg=f'{a.get("id",i)} / {b.get("id",i)}: 非固定軸の差異は{change}件。同型の疑い。'
                (errors if gate else warnings).append(msg)
    return errors,warnings

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('path',type=Path);p.add_argument('--gate',action='store_true')
    a=p.parse_args()
    try: data=json.loads(a.path.read_text(encoding='utf-8'))
    except (OSError,json.JSONDecodeError) as e: p.error(str(e))
    errors,warnings=check(data,a.gate)
    for x in errors: print('ERROR:',x)
    for x in warnings: print('WARN:',x)
    if not errors:print('PASS: ラベルと構造的多様性の形式チェックに合格（内容の新規性は未保証）。')
    raise SystemExit(1 if errors else 0)
if __name__=='__main__': main()
