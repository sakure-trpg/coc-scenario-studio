#!/usr/bin/env python3
"""CoC Scenario Architect project-state.json structural checker.

Not a proof of narrative plausibility. Stdlib only.
Usage: python scripts/validate_project.py project-state.json [--gate]
"""
import argparse
import json
import sys
from pathlib import Path

KINDS = {"mundane", "myth", "spell", "ritual"}
MASTERY = {"hearsay", "aware", "understands", "can_use"}
SEVERITIES = {"blocker", "major", "minor", "intentional_unknown"}
STATUS = {"confirmed", "candidate", "rejected", "undecided"}


def filled(value):
    return isinstance(value, str) and bool(value.strip())


def check(data, gate=False):
    errs, warnings = [], []
    if not isinstance(data, dict):
        return ["ルートはJSONオブジェクトである必要があります"], warnings
    scenario = data.get("scenario", {})
    if not isinstance(scenario, dict):
        errs.append("scenario はオブジェクトである必要があります")
        scenario = {}
    raw_worldlines = scenario.get("worldlines", ["main"])
    if not isinstance(raw_worldlines, list) or not raw_worldlines:
        errs.append("scenario.worldlines は空でない配列にしてください")
        raw_worldlines = ["main"]
    worldlines = set(raw_worldlines)

    names = ("facts", "npcs", "knowledge", "events", "actions", "open_questions", "decision_log")
    collections = {}
    for name in names:
        val = data.get(name, [])
        if not isinstance(val, list):
            errs.append(f"{name} は配列である必要があります")
            val = []
        collections[name] = val

    ids = {}
    for name in names[:-1]:
        for i, obj in enumerate(collections[name]):
            ctx = f"{name}[{i}]"
            if not isinstance(obj, dict):
                errs.append(f"{ctx}: オブジェクトではありません")
                continue
            ident = obj.get("id")
            if not filled(ident):
                errs.append(f"{ctx}: id がありません")
            elif ident in ids:
                errs.append(f"{ctx}: ID '{ident}' が {ids[ident]} と重複しています")
            else:
                ids[ident] = name

    def objs(section):
        return [x for x in collections[section] if isinstance(x, dict)]

    def refer(ident, expected, ctx):
        if not filled(ident):
            errs.append(f"{ctx}: 参照IDが空です")
        elif ids.get(ident) != expected:
            errs.append(f"{ctx}: {expected} に存在しないID '{ident}'")

    def list_refs(obj, key, expected, ctx):
        val = obj.get(key, [])
        if not isinstance(val, list):
            errs.append(f"{ctx}.{key}: 配列にしてください")
            return
        for k, item in enumerate(val):
            refer(item, expected, f"{ctx}.{key}[{k}]")

    for fact in objs("facts"):
        ctx = fact.get("id", "facts(?)")
        if fact.get("status") not in STATUS:
            errs.append(f"{ctx}: status は {', '.join(sorted(STATUS))} から選択")
        if not filled(fact.get("text")):
            errs.append(f"{ctx}: text が空です")
        list_refs(fact, "depends_on", "facts", ctx)

    npcs = {n.get("id"): n for n in objs("npcs")}
    kn = {k.get("id"): k for k in objs("knowledge")}
    ev = {e.get("id"): e for e in objs("events")}
    timeline_by_line = {}
    for e in objs("events"):
        ctx = e.get("id", "events(?)")
        seq = e.get("sequence")
        line = e.get("worldline", "main")
        if line not in worldlines:
            errs.append(f"{ctx}: 未登録の世界線 '{line}'")
        if not isinstance(seq, int) or isinstance(seq, bool) or seq < 0:
            errs.append(f"{ctx}: sequence は0以上の整数である必要があります")
        else:
            pair = (line, seq)
            if pair in timeline_by_line:
                errs.append(f"{ctx}: 同じ世界線・順序が {timeline_by_line[pair]} と重複します")
            timeline_by_line[pair] = ctx
        list_refs(e, "participants", "npcs", ctx)
        list_refs(e, "knowledge_gains", "knowledge", ctx)
        list_refs(e, "knowledge_uses", "knowledge", ctx)
        if not filled(e.get("description")):
            errs.append(f"{ctx}: description がありません")

    for n in objs("npcs"):
        ctx = n.get("id", "npcs(?)")
        if not filled(n.get("name")):
            errs.append(f"{ctx}: name がありません")
        if not isinstance(n.get("human"), bool):
            errs.append(f"{ctx}: human は真偽値にしてください")
        list_refs(n, "knowledge_ids", "knowledge", ctx)
        list_refs(n, "action_ids", "actions", ctx)

    for k in objs("knowledge"):
        ctx = k.get("id", "knowledge(?)")
        holder = k.get("holder_id")
        refer(holder, "npcs", f"{ctx}.holder_id")
        kind = k.get("kind")
        mastery = k.get("mastery")
        if kind not in KINDS:
            errs.append(f"{ctx}: kind が不正です ({kind})")
        if mastery not in MASTERY:
            errs.append(f"{ctx}: mastery が不正です ({mastery})")
        if not filled(k.get("claim")):
            errs.append(f"{ctx}: claim がありません")
        acq = k.get("acquisition_event_id")
        if acq is not None:
            refer(acq, "events", f"{ctx}.acquisition_event_id")
            if acq in ev and ctx not in ev[acq].get("knowledge_gains", []):
                errs.append(f"{ctx}: {acq}.knowledge_gains に {ctx} がありません")
        if holder in npcs and ctx not in npcs[holder].get("knowledge_ids", []):
            errs.append(f"{ctx}: {holder}.knowledge_ids に {ctx} がありません")
        if npcs.get(holder, {}).get("human") and kind in {"myth", "spell", "ritual"}:
            required = ("source_type", "source_detail", "why_exposed", "how_understood", "why_believed", "limits")
            for field in required:
                if not filled(k.get(field)):
                    errs.append(f"{ctx}: 人間NPCの{kind}知識には {field} が必要です")
            if not filled(acq):
                errs.append(f"{ctx}: 知識取得イベントを記録してください")
            prov = k.get("provenance_chain", [])
            if not isinstance(prov, list) or not prov:
                errs.append(f"{ctx}: provenance_chain（出所の来歴）を記録してください")
            else:
                for p in prov:
                    if p not in ids or ids[p] not in {"facts", "events"}:
                        errs.append(f"{ctx}: 来歴に存在しない事実/イベントID {p}")
            if kind in {"spell", "ritual"} and mastery == "can_use":
                for field in ("learning_process", "requirements", "costs", "practice_evidence"):
                    if not filled(k.get(field)):
                        errs.append(f"{ctx}: 実行可能な呪文/儀式には {field} が必要です")

    # Event-level knowledge use must also respect acquisition order (even without a named action).
    for e in objs("events"):
        ctx = e.get("id", "events(?)")
        for kid in e.get("knowledge_uses", []):
            k = kn.get(kid)
            if k is None:
                continue
            acquired = ev.get(k.get("acquisition_event_id"))
            if acquired is None:
                errs.append(f"{ctx}: 使用する知識 {kid} の習得イベントが不明です")
                continue
            if acquired.get("worldline", "main") == e.get("worldline", "main"):
                a_seq, e_seq = acquired.get("sequence"), e.get("sequence")
                if isinstance(a_seq, int) and isinstance(e_seq, int) and a_seq >= e_seq:
                    errs.append(f"{ctx}: 使用した知識 {kid} の習得が使用と同時または未来です")
            else:
                warnings.append(f"{ctx}: {kid} は世界線をまたぐため、主観的な伝達順序を確認してください")

    for a in objs("actions"):
        ctx = a.get("id", "actions(?)")
        actor = a.get("actor_id")
        at_event = a.get("event_id")
        refer(actor, "npcs", f"{ctx}.actor_id")
        refer(at_event, "events", f"{ctx}.event_id")
        if actor in npcs and ctx not in npcs[actor].get("action_ids", []):
            errs.append(f"{ctx}: {actor}.action_ids に {ctx} がありません")
        for field in ("intent", "why_target", "why_now", "why_method", "capability", "evidence_left"):
            if not filled(a.get(field)):
                errs.append(f"{ctx}: 重要行動には {field} が必要です")
        alternatives = a.get("alternatives", [])
        if not isinstance(alternatives, list) or not alternatives:
            errs.append(f"{ctx}: alternatives に代替手段と不採用理由を記録してください")
        else:
            for i, alt in enumerate(alternatives):
                if not isinstance(alt, dict) or not filled(alt.get("method")) or not filled(alt.get("rejected_because")):
                    errs.append(f"{ctx}.alternatives[{i}]: method と rejected_because が必要です")
        list_refs(a, "knowledge_required", "knowledge", ctx)
        action_event = ev.get(at_event)
        for kid in a.get("knowledge_required", []):
            if kid not in kn or not action_event:
                continue
            item = kn[kid]
            if item.get("holder_id") != actor:
                errs.append(f"{ctx}: {kid} は行為者 {actor} の知識として登録されていません")
            acquisition = ev.get(item.get("acquisition_event_id"))
            if acquisition is None:
                errs.append(f"{ctx}: {kid} は習得時期が不明のため使用を検証できません")
            elif acquisition.get("worldline", "main") == action_event.get("worldline", "main"):
                if isinstance(acquisition.get("sequence"), int) and isinstance(action_event.get("sequence"), int) and acquisition["sequence"] >= action_event["sequence"]:
                    errs.append(f"{ctx}: {kid} の習得は使用より前でなければなりません（同イベント使用も不可）")
            else:
                warnings.append(f"{ctx}: {kid} は世界線をまたぐため、主観順序と伝達法を手作業で検証してください")
            if item.get("mastery") == "hearsay" and item.get("kind") in {"spell", "ritual"}:
                errs.append(f"{ctx}: 伝聞レベルの{kid}を実行の前提にしています")
        if at_event in ev and ctx not in ev[at_event].get("action_ids", []):
            errs.append(f"{ctx}: {at_event}.action_ids に {ctx} がありません")

    for q in objs("open_questions"):
        ctx = q.get("id", "open_questions(?)")
        sev = q.get("severity")
        state = q.get("status")
        if sev not in SEVERITIES:
            errs.append(f"{ctx}: severity が不正です")
        if state not in {"open", "resolved", "intentional_unknown"}:
            errs.append(f"{ctx}: status が不正です")
        if state == "intentional_unknown" and sev != "intentional_unknown":
            errs.append(f"{ctx}: 人間の因果欠落等を意図的不可知にできません")
        if state == "open" and sev in {"blocker", "major"}:
            (errs if gate else warnings).append(f"{ctx}: 未解決の重大な問題があります。完成扱いはできません")
        if state == "resolved" and not filled(q.get("resolution")):
            errs.append(f"{ctx}: 解決済みなら resolution が必要です")

    # An empty sheet is a draft, not a validated scenario.
    if not collections["facts"] or not collections["npcs"] or not collections["events"] or not collections["actions"]:
        (errs if gate else warnings).append("台帳は未完成です（主要な事実・NPC・イベント・行動のいずれかが空）")
    if not filled(scenario.get("premise")):
        (errs if gate else warnings).append("scenario.premise（前提・事件の核）が空です")
    return errs, warnings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path)
    parser.add_argument("--gate", action="store_true", help="未完成な記録も失敗扱いにする")
    args = parser.parse_args()
    try:
        obj = json.loads(args.project.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        print(f"ERROR: JSONを読み込めません: {exc}")
        return 2
    errors, warnings = check(obj, gate=args.gate)
    for error in errors:
        print("ERROR:", error)
    for warning in warnings:
        print("WARN:", warning)
    if errors:
        print(f"FAIL: {len(errors)}件のエラー / {len(warnings)}件の警告")
        return 1
    print(f"OK: 形式・参照上のエラーは0件 / 警告{len(warnings)}件。物語の因果合理性の保証ではありません。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
