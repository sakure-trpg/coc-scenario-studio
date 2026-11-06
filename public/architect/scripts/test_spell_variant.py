#!/usr/bin/env python3
"""spell variant structural validator の基本テスト"""
import copy
import json
import unittest
from pathlib import Path
from validate_spell_variant import check

class SpellTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.valid=json.loads((Path(__file__).parent.parent/"examples/sample-spell-variant.json").read_text(encoding="utf8"))
    def test_valid(self):
        self.assertEqual(check(self.valid,gate=True),[])
    def test_no_change(self):
        v=copy.deepcopy(self.valid);v["changes"]=[]
        self.assertTrue(check(v,gate=True))
    def test_no_tradeoff(self):
        v=copy.deepcopy(self.valid);v["compensations"]=[]
        self.assertTrue(any("強化" in x for x in check(v,gate=True)))
    def test_buff_only(self):
        v=copy.deepcopy(self.valid);v["changes"]=[v["changes"][0]]
        self.assertTrue(any("弱化は1〜2" in x for x in check(v,gate=True)))
    def test_nerf_only(self):
        v=copy.deepcopy(self.valid);v["changes"]=[v["changes"][1]]
        self.assertTrue(any("強化は1〜2" in x for x in check(v,gate=True)))
    def test_three_buffs(self):
        v=copy.deepcopy(self.valid)
        for i in range(3):
            c=copy.deepcopy(v["changes"][0]);c["id"]=f"B-{i}";v["changes"].append(c)
        self.assertTrue(any("強化は1〜2" in x for x in check(v,gate=True)))
    def test_three_nerfs(self):
        v=copy.deepcopy(self.valid)
        for i in range(2):
            c=copy.deepcopy(v["changes"][1]);c["id"]=f"N-{i}";v["changes"].append(c)
        self.assertTrue(any("弱化は1〜2" in x for x in check(v,gate=True)))
    def test_neutral_change_rejected(self):
        v=copy.deepcopy(self.valid);v["changes"][0]["direction"]="neutral"
        self.assertTrue(any("中立" in x for x in check(v,gate=True)))
    def test_two_buffs_two_nerfs(self):
        v=copy.deepcopy(self.valid)
        buff=copy.deepcopy(v["changes"][0]);buff.update(id="M-03",axis="range",before="5m",after="10m")
        nerf=copy.deepcopy(v["changes"][1]);nerf.update(id="M-04",axis="mp",before="3MP",after="6MP")
        v["changes"].extend([buff,nerf])
        v["compensations"].append({"buff_id":"M-03","nerf_id":"M-04","why_effective":"MPが毎回消費される","loophole_check":"補給不能"})
        self.assertEqual(check(v,gate=True),[])
    def test_not_verified(self):
        v=copy.deepcopy(self.valid);v["source_verified"]=False
        self.assertTrue(check(v,gate=True))
    def test_blocker(self):
        v=copy.deepcopy(self.valid);v["review"]["major_issues"]=["代償を無視できる"]
        self.assertTrue(check(v,gate=True))
if __name__=="__main__": unittest.main()
