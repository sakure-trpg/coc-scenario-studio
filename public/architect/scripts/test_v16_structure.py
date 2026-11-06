#!/usr/bin/env python3
"""v1.6構造検証のユニットテスト（標準ライブラリのみ）。"""
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_v16_structure import check


def base(mode):
    return {
        "schema_version": "1.6", "scenario_id": "S-test",
        "pc_involvement": {
            "mode": mode, "classification_reason": "PCの事件との因果的接続で判断",
            "background_links": [{"pc_background_fact": "PCがかつて儀式を止めた", "causal_link_to_incident": "残された媒介を黒幕が利用", "discovery_route": "古い調書", "choices_available": "暴露／封鎖を選択"}],
            "npc_mediated": {"baseline_progression": [
                {"npc_action": "NPCが実験を準備", "consequence": "資源を収集する"},
                {"npc_action": "NPCが儀式を実行", "consequence": "別世界に影響が出る"}],
                "contact": {"npc_id": "N-1", "circumstance": "知人が相談", "npc_motive": "同級生を探す", "pc_entry_reason": "依頼を受け得る"},
                "causal_changes": [{"pc_action": "証拠を提示する", "affected_event_or_npc": "N-1の協力方針", "resulting_difference": "儀式が早期露見", "why_npc_alone_cannot": "観察記録が分散している", "info_route": "観察記録を比較する"}],
                "refusal_or_failure_response": "NPCは調査を独自に続ける"}},
        "magicians": []}


class V16Test(unittest.TestCase):
    def test_direct_needs_no_bad_ending_or_counterfactual(self):
        self.assertEqual(check(base("direct_background")), [])

    def test_external_requires_real_delta(self):
        data = base("npc_mediated")
        self.assertEqual(check(data), [])
        del data["pc_involvement"]["npc_mediated"]["causal_changes"][0]["resulting_difference"]
        self.assertTrue(any("resulting_difference" in e for e in check(data)))

    def test_hybrid_requires_both(self):
        data = base("hybrid")
        self.assertEqual(check(data), [])
        data["pc_involvement"]["background_links"] = []
        self.assertTrue(check(data))

    def test_unknown_not_completion(self):
        self.assertTrue(check(base("undetermined")))

    def test_magician_requires_goal_risk_and_decision(self):
        data = base("direct_background")
        data["magicians"] = [{"npc_id":"M", "core_goal":"次元の克服", "obsession_origin":"初回実験成功", "priority_over_life":"完成が生存より上位", "sacrifice_scope":"自他の命を犠牲にできる", "risk_known":"捕食者による死を認識", "critical_decisions":[{"situation":"怪物が接近", "choice":"実験継続", "goal_consistency":"成果優先", "evidence_or_consequence":"実験記録が残る"}]}]
        self.assertEqual(check(data), [])
        del data["magicians"][0]["critical_decisions"][0]["goal_consistency"]
        self.assertTrue(check(data))

    def test_normal_npc_no_magician_forced(self):
        self.assertEqual(check(base("direct_background")), [])


if __name__ == "__main__":
    unittest.main()
