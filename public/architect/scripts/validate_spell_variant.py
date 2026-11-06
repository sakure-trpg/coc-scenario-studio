#!/usr/bin/env python3
"""呪文派生版の構造上の完了ゲート。バランスの実質判断は別途必須。"""
import argparse
import json
from pathlib import Path

DIRECTIONS = {"buff", "nerf"}

def filled(x):
    return isinstance(x, str) and bool(x.strip())

def check(v, gate=False):
    errors = []
    if not isinstance(v, dict):
        return ["ルートはJSONオブジェクトが必要"]
    if v.get("house_rule") is not True:
        errors.append("house_rule=true が必須：改変版を原典扱いしない")
    if v.get("source_verified") is not True:
        errors.append("元呪文の参照・照合が完了していない")
    base=v.get("base_spell",{})
    if not isinstance(base,dict):
        base={};errors.append("base_spell がオブジェクトではない")
    for k in ("name","source_file","effect","casting_time","mp_cost","san_cost","targets_and_limits"):
        if not filled(base.get(k)):
            errors.append(f"base_spell.{k} 未確認／未記録")
    for k in ("variant_id","variant_name","narrative_purpose"):
        if not filled(v.get(k)):
            errors.append(f"{k} が空です")
    changes=v.get("changes",[])
    if not isinstance(changes,list):
        errors.append("changes は配列が必要")
        changes=[]
    if len(changes) < 2 or len(changes) > 4:
        errors.append("実質的改変は合計2〜4項目（強化1〜2、弱化1〜2）に限定")
    ids={}; buffs=set(); nerfs=set()
    for i,c in enumerate(changes):
        if not isinstance(c,dict):
            errors.append(f"changes[{i}] がオブジェクトではない");continue
        ident=c.get("id")
        if not filled(ident) or ident in ids:
            errors.append(f"changes[{i}].id が空または重複");continue
        ids[ident]=c
        for k in ("axis","before","after","table_impact"):
            if not filled(c.get(k)):
                errors.append(f"{ident}.{k} が空です")
        if c.get("before")==c.get("after"):
            errors.append(f"{ident}: 前後が同一で改変になっていません")
        direction=c.get("direction")
        if direction not in DIRECTIONS:
            errors.append(f"{ident}.direction は buff/nerf のみ。中立の実質改変は不可")
        if direction=="buff": buffs.add(ident)
        elif direction=="nerf": nerfs.add(ident)
    if not 1 <= len(buffs) <= 2:
        errors.append(f"強化は1〜2項目が必須（現在{len(buffs)}項目）")
    if not 1 <= len(nerfs) <= 2:
        errors.append(f"弱化は1〜2項目が必須（現在{len(nerfs)}項目）")
    compensations=v.get("compensations",[])
    if not isinstance(compensations,list):
        errors.append("compensations は配列");compensations=[]
    covered=set()
    for i,c in enumerate(compensations):
        if not isinstance(c,dict):
            errors.append(f"compensations[{i}] がオブジェクトではない");continue
        b,n=c.get("buff_id"),c.get("nerf_id")
        if b not in buffs or n not in nerfs:
            errors.append(f"compensations[{i}]: 強化と実在する弱体化の対応が必要")
        else:
            covered.add(b)
        for k in ("why_effective","loophole_check"):
            if not filled(c.get(k)):
                errors.append(f"compensations[{i}].{k} が空です")
    for b in sorted(buffs-covered):
        errors.append(f"強化 {b} に有効な弱体化・代償の紐づけがない")
    if buffs and not nerfs:
        errors.append("強化に対し弱体化／代償の増加がない")
    for field,keys in {
        "npc_provenance":("base_acquisition","variant_development","learned_before_use","resources_and_tests"),
        "counterplay":("pc_options","repeat_use_and_limits","boundary_cases"),
    }.items():
        obj=v.get(field,{})
        if not isinstance(obj,dict):
            errors.append(f"{field} はオブジェクト");continue
        for k in keys:
            if not filled(obj.get(k)):
                errors.append(f"{field}.{k} が空です")
    review=v.get("review",{})
    if not isinstance(review,dict):
        review={};errors.append("review はオブジェクト")
    if gate:
        for k in ("blocking_issues","major_issues"):
            a=review.get(k)
            if not isinstance(a,list):
                errors.append(f"review.{k} は配列")
            elif a:
                errors.append(f"review.{k} が未解決です：{len(a)}件")
        if not filled(review.get("independent_review")):
            errors.append("review.independent_review が空です")
    return errors

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("path",type=Path)
    p.add_argument("--gate",action="store_true")
    args=p.parse_args()
    try:
        v=json.loads(args.path.read_text(encoding="utf-8"))
    except (OSError,ValueError) as e:
        p.error(str(e))
    errors=check(v,gate=args.gate)
    for x in errors: print("ERROR:",x)
    if errors: print(f"不合格：{len(errors)}件")
    else: print("形式検証通過（効果と代償の実効性は人間／AIの検証が必要）")
    raise SystemExit(bool(errors))
if __name__=="__main__":
    main()
