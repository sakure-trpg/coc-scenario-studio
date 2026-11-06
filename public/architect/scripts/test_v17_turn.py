#!/usr/bin/env python3
import copy
import unittest
from validate_v17_turn import validate

BASE = {
    "user_intent":"selection", "material_progress":True,
    "user_requested_options":False,"is_structural_fork":False,
    "asks_user_to_choose":False,"options":[],
    "short_requested":True,"detail_requested":False,
    "response_text":"B案を採用。古文書からの発見を起点に、Mは再現実験を開始。Vが人体実験の資料を発見した。PCは研究日誌と被験者の証言を追える。",
    "confirmed_facts":[{"id":"F01","text":"裁判開始時の詠唱で場が成立し、裁判中のみ有効"}],
    "issues":[{"id":"Q01","status":"resolved","severity":"none","relevant_fact_ids":["F01"],"reported_as_current_problem":False}],
    "spell_source":{"claimed_verified":False,"claimed_complete":False,"source_refs":[]},
}

class TestFlow(unittest.TestCase):
    def assertFails(self, data):
        errors, _ = validate(data)
        self.assertTrue(errors)
    def test_selection_develops_without_microchoices(self):
        self.assertEqual(validate(BASE)[0],[])
    def test_no_material_progress(self):
        d=copy.deepcopy(BASE);d["material_progress"]=False;self.assertFails(d)
    def test_microchoice_after_selection(self):
        d=copy.deepcopy(BASE);d["asks_user_to_choose"]=True;d["options"]=["A","B","C"];self.assertFails(d)
    def test_three_choices_at_real_fork(self):
        d=copy.deepcopy(BASE);d["is_structural_fork"]=True;d["asks_user_to_choose"]=True;d["options"]=["A","B","C"]
        self.assertEqual(validate(d)[0],[])
    def test_important_choice_needs_three_options(self):
        d=copy.deepcopy(BASE);d["is_structural_fork"]=True;d["asks_user_to_choose"]=True;d["options"]=["A","B"];self.assertFails(d)
    def test_no_resolved_issue_repeated(self):
        d=copy.deepcopy(BASE);d["issues"][0]["reported_as_current_problem"]=True;self.assertFails(d)
    def test_issue_needs_counterexample(self):
        d=copy.deepcopy(BASE);d["issues"][0].update(status="open",severity="major");self.assertFails(d)
    def test_source_claim_is_grounded(self):
        d=copy.deepcopy(BASE);d["spell_source"]["claimed_verified"]=True;self.assertFails(d)
    def test_no_complete_with_unverified_source(self):
        d=copy.deepcopy(BASE);d["spell_source"]["claimed_complete"]=True;self.assertFails(d)
    def test_brevity_requested(self):
        d=copy.deepcopy(BASE);d["response_text"]="冗長"*250;self.assertFails(d)
    def test_unknown_fact_reference(self):
        d=copy.deepcopy(BASE);d["issues"][0]["relevant_fact_ids"]=["F99"];self.assertFails(d)

if __name__ == '__main__':
    unittest.main()
