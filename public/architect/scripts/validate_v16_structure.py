#!/usr/bin/env python3
"""CoC Scenario Architect v1.6 PC関与類型・魔術師の構造検査。

必須欄の形式チェックのみ。因果的正しさ・創作の面白さ・CoCルールの妥当性は判定しない。
Usage: python scripts/validate_v16_structure.py path/to/scenario-structure-v1.6.json [--gate]
"""
import argparse
import json
from pathlib import Path

MODES = {"direct_background", "npc_mediated", "hybrid", "undetermined"}


def filled(x):
    return isinstance(x, str) and bool(x.strip())


def require_text(obj, field, at, problems):
    if not isinstance(obj, dict) or not filled(obj.get(field)):
        problems.append(f"{at}.{field}: 具体的な説明が必要")


def require_list(obj, field, at, problems, minimum=1):
    value = obj.get(field) if isinstance(obj, dict) else None
    if not isinstance(value, list) or len(value) < minimum:
        problems.append(f"{at}.{field}: {minimum}件以上の配列が必要")
        return []
    return value


def check(data):
    errors = []
    if not isinstance(data, dict):
        return ["JSONのルートはオブジェクトである必要があります"]
    if data.get("schema_version") != "1.6":
        errors.append("schema_version: '1.6' が必要")
    require_text(data, "scenario_id", "root", errors)
    pc = data.get("pc_involvement")
    if not isinstance(pc, dict):
        return errors + ["pc_involvement: オブジェクトが必要"]
    mode = pc.get("mode")
    if mode not in MODES:
        return errors + ["pc_involvement.mode: direct_background / npc_mediated / hybrid / undetermined から選択"]
    require_text(pc, "classification_reason", "pc_involvement", errors)
    if mode == "undetermined":
        errors.append("pc_involvement.mode: 'undetermined' は設計途中の仮状態。完成ゲートでは分類を決定")
    if mode in {"direct_background", "hybrid"}:
        for i, link in enumerate(require_list(pc, "background_links", "pc_involvement", errors)):
            at = f"pc_involvement.background_links[{i}]"
            for field in ("pc_background_fact", "causal_link_to_incident", "discovery_route", "choices_available"):
                require_text(link, field, at, errors)
    if mode in {"npc_mediated", "hybrid"}:
        med = pc.get("npc_mediated", {})
        at = "pc_involvement.npc_mediated"
        if not isinstance(med, dict):
            errors.append(f"{at}: オブジェクトが必要")
            med = {}
        for i, step in enumerate(require_list(med, "baseline_progression", at, errors, minimum=2)):
            for field in ("npc_action", "consequence"):
                require_text(step, field, f"{at}.baseline_progression[{i}]", errors)
        contact = med.get("contact", {})
        for field in ("npc_id", "circumstance", "npc_motive", "pc_entry_reason"):
            require_text(contact, field, f"{at}.contact", errors)
        for i, change in enumerate(require_list(med, "causal_changes", at, errors)):
            for field in ("pc_action", "affected_event_or_npc", "resulting_difference", "why_npc_alone_cannot", "info_route"):
                require_text(change, field, f"{at}.causal_changes[{i}]", errors)
        require_text(med, "refusal_or_failure_response", at, errors)
    mages = data.get("magicians", [])
    if not isinstance(mages, list):
        errors.append("magicians: 配列が必要")
        mages = []
    for i, mage in enumerate(mages):
        at = f"magicians[{i}]"
        for field in ("npc_id", "core_goal", "obsession_origin", "priority_over_life", "sacrifice_scope", "risk_known"):
            require_text(mage, field, at, errors)
        for j, decision in enumerate(require_list(mage, "critical_decisions", at, errors)):
            for field in ("situation", "choice", "goal_consistency", "evidence_or_consequence"):
                require_text(decision, field, f"{at}.critical_decisions[{j}]", errors)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--gate", action="store_true", help="未記入の必須項目があれば終了コード1")
    args = parser.parse_args()
    try:
        data = json.loads(args.file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: JSONを読み込めません: {exc}")
        return 2
    problems = check(data)
    if problems:
        print(f"INCOMPLETE: {len(problems)}個の構造上の未記入・誤形式")
        for problem in problems:
            print(f" - {problem}")
        return 1 if args.gate else 0
    print("FORMAT PASS: 類型別の必須欄・魔術師欄は記入されています。意味・面白さ・神話ルール・因果妥当性の検証は別途必要です。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
