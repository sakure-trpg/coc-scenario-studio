#!/usr/bin/env python3
"""Validate explicitly annotated conversational control flow in a CoC v1.7 turn.

This intentionally cannot judge actual narrative quality or inferred intent.
"""
import argparse
import json
import sys
from pathlib import Path

INTENTS = {"continue", "selection", "issue", "options", "other", "evaluation", "revise"}
STATES = {"open", "resolved", "false_alarm", "opportunity", "minor"}
LEVELS = {"none", "minor", "major", "blocker"}


def validate(data):
    errors = []
    warnings = []

    intent = data.get("user_intent")
    if intent not in INTENTS:
        errors.append(f"user_intent must be one of {sorted(INTENTS)}")
    if intent in {"continue", "selection"} and not data.get("material_progress"):
        errors.append("continue/selection must include actual new progress (self-annotation; verify manually)")

    explicit = data.get("user_requested_options") is True
    fork = data.get("is_structural_fork") is True
    choice = data.get("asks_user_to_choose") is True
    options = data.get("options", [])
    if not isinstance(options, list):
        errors.append("options must be a list")
        options = []
    if choice and not (explicit or fork):
        errors.append("asking user to choose without explicit request or structural fork is micro-choice escalation")
    if choice and len(options) != 3:
        errors.append("choice point requires 3 genuinely distinct options (semantic distinction checked manually)")
    if options and not (explicit or fork):
        errors.append("options provided even though no user request or structural fork exists")
    if options and len(options) != 3:
        errors.append("when presenting selectable alternatives, use 3 alternatives in this protocol")
    if choice and intent in {"selection", "continue"} and not fork and not explicit:
        errors.append("do not ask another small question immediately after a selection/continue")

    facts = data.get("confirmed_facts", [])
    if not isinstance(facts, list):
        errors.append("confirmed_facts must be a list")
        facts = []
    factids = {f.get("id") for f in facts if isinstance(f, dict)}
    if len(factids) != len(facts) or None in factids:
        errors.append("confirmed_facts must have unique, nonblank ids")
    for issue in data.get("issues", []):
        if not isinstance(issue, dict):
            errors.append("issue must be an object")
            continue
        iid = issue.get("id", "(unnamed)")
        status = issue.get("status")
        severity = issue.get("severity", "none")
        if status not in STATES or severity not in LEVELS:
            errors.append(f"{iid}: invalid status/severity")
        for fid in issue.get("relevant_fact_ids", []):
            if fid not in factids:
                errors.append(f"{iid}: unknown relevant fact {fid}")
        if status in {"resolved", "false_alarm", "opportunity"} and severity in {"major", "blocker"}:
            errors.append(f"{iid}: resolved/false_alarm/opportunity cannot be a current major/blocker")
        if status in {"resolved", "false_alarm"} and issue.get("reported_as_current_problem"):
            errors.append(f"{iid}: already resolved/false alarm but repeated as a current problem")
        if status in {"open", "minor"} and severity in {"major", "blocker"} and not issue.get("concrete_counterexample"):
            errors.append(f"{iid}: serious issue requires a concrete counterexample")

    source = data.get("spell_source", {})
    if source.get("claimed_verified") and not source.get("source_refs"):
        errors.append("cannot claim verified spell rules without grounded source references")
    if source.get("claimed_complete") and not source.get("claimed_verified"):
        errors.append("unverified spell cannot be marked complete")

    text = data.get("response_text", "")
    if not isinstance(text, str):
        errors.append("response_text must be text")
    elif data.get("short_requested") and len(text) > 420:
        errors.append(f"user asked for brevity; response has {len(text)} characters (>420)")
    elif len(text) > 900 and not data.get("detail_requested"):
        warnings.append(f"response is long ({len(text)} characters); recheck need for detail")

    return errors, warnings


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file")
    parser.add_argument("--gate", action="store_true")
    args = parser.parse_args()
    data = json.loads(Path(args.file).read_text(encoding="utf-8"))
    errs, warns = validate(data)
    for e in errs:
        print("ERROR:", e)
    for w in warns:
        print("WARNING:", w)
    if not errs:
        print("PASS: structural conversation checks (narrative quality not assessed)")
    return 1 if errs and args.gate else 0


if __name__ == "__main__":
    sys.exit(main())
