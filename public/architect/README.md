# CoC Scenario Architect v1.9

クトゥルフ神話TRPG向け、**発想拡張／背景と因果関係／NPCの神話知識の出所／多方向の案の発展／確定設定と時系列の保護／再帰的反証**を統合したAgent Skillです。標準的な `SKILL.md`＋`references/`＋`assets/` 方式で構成しています。

## まず使う
1. `coc-scenario-architect` フォルダをスキルとして利用できる環境に配置する。
2. **やりたいシーンを最初に決める**。`assets/templates/scene-anchor.md` をコピーし、場面・PL体験・固定点と可変点を書く（空欄があってよい）。全体の企画は `scenario-brief.md` に後から整理できる。
3. 確定設定を `assets/templates/canon.md` または `project-state.json` に記録する。**候補と確定を分離**する。
4. AIへ「このスキルで○○の因果関係を検証して」「案を異なる3方向に広げて、重大な弱点を内部で解消してから出して」と依頼する。
5. 採用した設定だけを正史に反映し、重要NPCについて知識の来歴と時系列を追う。

## Codexへインストールする例
- **プロジェクト単位**：作業フォルダ内の `.agents/skills/coc-scenario-architect/` にこの一式を配置する。
- **全体で使用**：ホームディレクトリの `~/.agents/skills/coc-scenario-architect/` に置く。
- Codexで `$coc-scenario-architect` を指定するか、内容に合う依頼で自動的に認識させる。初回に認識されなければCodexを再起動する。
- ChatGPTや他のAgent Skills対応環境では、提供されている技能追加方法に従う。ZIPをアップロードしただけで自動インストールされたとは限らない。

## どのファイルをいつ読むか
| ファイル | 役割 |
|---|---|
| `SKILL.md` | 統括、必須ルール、適切な専門手順への振り分け |
| `references/scene-diversity.md` | **シーン未選択時の必須ゲート**。場面・PC行動・葛藤・異常操作の多様化 |
| `references/scene-first.md` | 選んだシーンから成立条件・背景・導線・分岐を逆算 |
| `references/idea-divergence.md` | ありきたりな案を避け、構造的に異なる発想を広げる |
| `references/causal-architect.md` | 事件・背景・動機の因果鎖を構築する |
| `references/npc-provenance.md` | 人間NPCの知識の入手／理解／信用／使用／来歴 |
| `references/idea-evolution.md` | 深化・分岐・再構築を使い分ける |
| `references/canon-guardian.md` | 確定／候補／却下の管理と改稿時の影響確認 |
| `references/adversarial-review.md` | 弱点→修正→再検証を繰り返す合格ゲート |
| `references/coc-design.md` | CoCの探索・情報・恐怖・安全性・ルールへの配慮 |

## 依頼の例
- 「既存の確定設定は変えず、黒幕がPCを狙う理由を3通り構築して。NPCの知識の由来まで追い、重大な穴を解消した案だけ提示して」
- 「このNPCが呪文を使える理由を、伝授者の来歴まで再帰的に検証して。なぜ今この行動をするのかも確認して」
- 「この導入が陳腐なので、事件原因とPL体験が異なる案を作って。確定設定は維持して」
- 「正史を維持したまま新案を出し、どの設定に影響するか一覧にして」
- 「前の案の弱点だけでなく、弱点解消案の弱点も検出し続けて」

## プロジェクトJSONによる任意の形式検査
テンプレートをコピー：

```bash
cp assets/templates/project-state.json project-state.json
python scripts/validate_project.py project-state.json
python scripts/validate_project.py project-state.json --gate
```

`--gate` は構造上の重大欠落や未解決の重大問題がある場合、終了コード1を返します。**空の台帳は「作品完成」ではなく「下書き」です。** JSON内のID参照・習得より前の知識使用・呪文来歴の必須項目などを検査します。文章自体の説得力は人間／AIの批評が必須です。

実用例：`examples/sample-project.json`。弱点が残る失敗例：`examples/broken-project.json`。

## 設計上の限界
- 無限に「なぜ」を問うと停止できないため、運用上は同一案3巡の改稿後に構造変更・棄却・ユーザー判断へ移ります。**打ち切りを合格扱いしません。**
- 神話的現象の根源は不可知にできても、人間NPCの知識取得や行動理由は省略できません。
- 出典未確認のCoC公式ルール／呪文／神話存在の性質を勝手に断定しません。
- AIによる反証は完全な無矛盾の数学的証明ではありません。検証可能な範囲と限界を明示します。

## 出典・形式
標準的なAgent Skillsのファイル構造とCodexの利用方法を基準に作成しました。参考：
- https://agentskills.io/specification
- https://learn.chatgpt.com/docs/build-skills

このフレームワーク自体のシナリオ設計ルールは、本プロジェクト向けに定義した独自の運用仕様です。

## v1.1 呪文一覧からの発案
呪文に関係する案では `references/spell-ideation.md` を使用します。以前作成した `呪文一覧.md` は現時点で同梱できていないため、入手後に `references/呪文一覧.md` として配置してください。配置前は参照済みとみなさず、呪文名・効果・コスト・詠唱時間を捏造しません。


## v1.2 呪文の必須改変とトレードオフ検証
**シナリオで使用するすべての呪文は、`呪文一覧.md` で照合した既存呪文をベースにシナリオ用の派生版へ実質改変します。** 名前・演出の変更だけでは不可。強化・効果範囲／対象解釈の拡大・MP/SAN/時間軽減・条件緩和は、実際に不利となる代償（時間・MP/SAN増加、他性能の弱体化、儀式条件・反動など）と必ず釣り合わせます。

参照手順：`references/spell-ideation.md` → **`references/spell-customization.md`** → `references/npc-provenance.md` → `references/adversarial-review.md`。出力様式は `assets/templates/spell-variant.md`、構造データは `assets/templates/spell-variant.json` を使用します。

派生版 JSON の**形式検査**：

```bash
python scripts/validate_spell_variant.py path/to/spell-variant.json --gate
python scripts/test_spell_variant.py
```

`--gate` は参照済みフラグ・実質差分・強化ごとの弱体化対応・NPC来歴・主要問題残件を検査します。**「強化分と代償の妥当性」を自動で数学的に証明するものではありません。** AIによる反証／プレイテストで、実際に代償が作用するか必ず再確認してください。`examples/sample-spell-variant.json` は**架空の形式テストデータ**です。実在呪文の性能や公式データではありません。

**注意**：従来の `呪文一覧.md` の実体は未取得です。このZIPにも同梱していません。参照ファイルがなければ原典との照合は保留とし、適当な数値を補って完了扱いしません。


## v1.3 呪文の変更項目数を厳格化
呪文の全要素を書き換えない。**強化1〜2項目、弱化1〜2項目（合計2〜4項目）のみ改変**し、その他は元呪文の仕様を維持する。中立の実質改変、強化／弱化が0件、各方向3件以上はいずれも不合格。MP削減・対象拡大などは強化、MP増加・詠唱時間延長などは弱化に分類する。各強化には弱化を実際に効く代償として対応させる（1件の弱化が2件の強化を制約する場合は両方への実効性を説明する）。

`python scripts/validate_spell_variant.py examples/sample-spell-variant.json --gate` で件数の形式検査ができる。**数値面の完全な釣り合いまでは自動保証されない。**


## v1.4 シーン先行制作（標準フロー）
最初に**「やりたいシーン」**を置く。次の順で進める：

`場面の核 → 必要な成立条件 → NPCの行動／神話要素／知識の来歴を逆算 → 過去から順方向の整合確認 → 手掛かり・前後のシーン → PCの予想外の選択への分岐 → 再帰的批評 → 提案・採用`

- シーンの核を守りつつ、PCに特定の選択・感情・敗北を強制しない。阻止・回避・別経路により予定のシーンが変わることを正当な展開として設計する。
- 重要シーンが複数ある場合は `assets/templates/scene-chain.md` で、場面間の**因果と情報導線**をつなぐ。
- 単独シーンのテンプレートは `assets/templates/scene-anchor.md`。説明用例は `examples/scene-first-example.md`。
- 呪文を使うシーンでは、従来の呪文一覧参照・強化1〜2・弱化1〜2を厳守。呪文の登場自体は強制しない。

依頼例：「このシーンを必ず見せたい。確定設定は保ち、NPCの動機と呪文知識の経緯まで逆算して、探索者が妨害した場合も成立する構造を3案作って。重大な因果の穴を塞いでから提示して」


## v1.5 シーン候補の多様化と同型案の排除
シーンの選択前に、`references/scene-diversity.md` で**場面の役割／PCの主行為／葛藤の駆動力／異常の操作法**を分散させる。舞台や名詞だけ変更した「存在しない〇〇」「〇〇のない△△」の連発、導入で異常を見る場面だけの連発を不合格にする。

- ラフ候補を内部で複数生成し、表面の素材ではなく**体験・場面機能・PCの選択**で比較して差し替える。
- シーン選択前は「企画の種」であり、個別の背景を完成済みと誤認させない。ユーザーがシーンを選んだあと、シーン先行の因果構築と再帰的検証を実施する。
- ユーザーが「逃走シーンだけ」など明確に指定した場合は、多様性を押し付けず要求を優先する。
- 意味的な重複は人間またはAIが検証する。以下のスクリプトは**自己申告ラベルの偏り**を検出するのみで、創造性や因果整合性を保証しない。

```bash
python scripts/validate_idea_pool.py examples/scene-pool-diverse.json --gate
python scripts/validate_idea_pool.py examples/scene-pool-homogeneous.json --gate
python scripts/test_idea_pool.py
```

使うテンプレート：`assets/templates/scene-candidate-pool.json`。シーンの偏りを検査したあとに、`assets/templates/scene-anchor.md` で選択済みの場面を掘り下げる。**NPC・呪文・確定設定・弱点を再帰的に修正する従来のルールは変更していない。**

---

## v1.6: PC関与類型と魔術師の人物原理（2026-10-23）

### 追加した設計思想
- **自由なアイデア生成**：AIの独断による「ギミックの面白さの保護」は行わず、制作者が判断する。ユーザー確定／却下設定の変更履歴はこれまで通り厳密に区別する。
- **魔術師NPCの目的優先**：命や一般倫理を犠牲にしてでも最上位目的を達成する意思を持たせる。研究の停止・撤退も、目的に資する行動なら許容し、目的と矛盾する恐怖による中止を安易に書かない。
- **PC関与の2+1類型**：背景当事者型はPCの背景との因果、外部介入型はPC不在時の進行と介入による明確な変化、複合型は両方を検証する。幸福な結末を強制しない。

### 新規ファイル
| ファイル | 用途 |
|---|---|
| `references/pc-involvement.md` | 背景当事者型／外部介入型／複合型の判定と専用検証 |
| `references/magician-psychology.md` | 魔術師NPCの目的、倫理、犠牲許容、危険下での行動 |
| `references/demo-regression-v1.6.md` | 2回のデモから作った再発防止テスト（人間が評価） |
| `assets/templates/pc-involvement.md` | PC関与構造を記入するシート |
| `assets/templates/magician-sheet.md` | 魔術師の行動原理を記入するシート |
| `assets/templates/scenario-structure-v1.6.json` | 新ルールの補助台帳（既存 `project-state.json` と併用） |
| `scripts/validate_v16_structure.py` | PC関与と魔術師の必須欄の**形式**検査 |
| `scripts/test_v16_structure.py` | 上記検査のユニットテスト |
| `examples/v16-pc-direct.json` | 背景当事者型の例 |
| `examples/v16-pc-external-magician.json` | 外部介入型＋魔術師の例 |

### 最短の利用方法
1. `scene-anchor.md` に実現したいシーンを記入し、`references/scene-first.md` で背景へ逆算する。
2. `pc-involvement.md` で背景当事者／外部介入／複合を分類し、該当欄を記入する。構想段階では未決定でもよい。
3. 魔術師がいる場合は `magician-sheet.md` を追加し、危険下の判断と最上位目的を接続する。
4. `adversarial-review.md` で因果・知識・PCの行動余地を厳しく反証する。
5. 追加の構造化検証を行う場合だけ、補助JSONを記入して以下を実行する。

```bash
python scripts/validate_v16_structure.py examples/v16-pc-direct.json --gate
python scripts/validate_v16_structure.py examples/v16-pc-external-magician.json --gate
python scripts/test_v16_structure.py
```

`--gate` は記入構造が整っているかを調べるのみで、**魔術師の行動が本当に説得力を持つか、PCの選択が本当に事件を変えるか、どの案が面白いかは判定しません。** 人間による反証・プレイテストが必要です。

### Ver.1.5から保持した機能
Scene-First、シーン候補の多様性判定、NPCの知識来歴、因果連鎖の再帰的検証、確定／候補／却下管理、原典呪文の**強化1〜2・弱化1〜2**の改変制限、既存 `project-state.json` 形式検査は維持しています。**v1.6は以前のシナリオを自動で書き換えません**。

### 資料の同梱状況
旧版と同様、原本の `呪文一覧.md` はZIPには含みません。原典の不明な呪文性能を公式仕様として断定しないこと。オプションとして `reference_data/呪文一覧.md` に原本を追加して使用してください。神話生物の正典資料もこのZIPへの自動統合は行っていません。


## v1.8 第3回デモからの対話改善
「進めて」は**新規内容を2〜3段階具体化**する指示として扱います。採用選択の直後に微小な三択を繰り返しません。作品構造を変える重大な分岐・解決問題では、原則3案を短く提示して推奨を添えます。

- `references/dialogue-orchestrator.md`：三択の適切な粒度、採用後の自律進行、短い応答。
- `references/issue-triage.md`：既存設定との突き合わせ、偽陽性の問題指摘の除去。
- `references/trial-climax.md`：裁判中心のセッション、PCによる異議・再審等の自由な提案、心理的敗北と判決の区別。
- `references/demo-regression-v1.8.md`：第3回デモの12件の手動回帰テスト。
- `assets/templates/decision-gate.md`、`assets/templates/issue-ledger.md`：判断と課題の記録。
- `assets/templates/turn-review-v1.8.json`、`scripts/validate_v17_turn.py`：一回の応答に関する**形式面だけ**の事前検査。

**注意**：ユーザーの『呪文一覧.md』は同梱されません。未照合の派生呪文は創作上の暫定案として継続できますが、CoCの公式仕様として断定・完成扱いしません。

```bash
python scripts/validate_v17_turn.py assets/templates/turn-review-v1.8.json
python scripts/test_v17_turn.py
```

### 会話例
`examples/v17-dialogue-patterns.md` に「B案採用の直後」「真の問題を発見」「偽の課題を訂正」「別の角度から進める」の短い良否対照例を収録しました。


## v1.8：ヒロイン・メインNPC行動の品質ルール
重要NPCの「愚かな行動で無理やり事件を進める」作劇を禁止します。典型例は、PCが守ろうとしているのに理由なく妨害する、危険を理解しているボタンや封印に勝手に手を出す、といった行動です。**自己犠牲、初期敵対、信念に基づく対立、情報不足による失敗は許容**します。NPCに無謬性を要求するものではありません。

- 手順：`references/main-npc-agency.md`
- 人物シート：`assets/templates/npc-sheet.md`
- 回帰テスト：`references/demo-regression-v1.8.md`

この検査は人物行動の納得感を人間が最終判断します。機械テストでは内容の品質を保証しません。


## v1.9：メインNPC行動の禁止・許容境界を明文化
v1.8で列挙した行動例を「行動の種類による禁止リスト」と解釈しない。**問題なのは選択の結果ではなく、人物の知識・目的と食い違う脚本都合の判断力低下**である。

- **判定基準**：本人固有の動機／当時の情報・誤認／目的へ向かう選択の筋道／PCの働きかけによる変化。
- **許容**：不完全な情報、切迫、信念、感情、自己犠牲、PCとの衝突による誤り。
- **不採用**：根拠なしに知識や忠告を忘れ、事故を起こす目的だけの行動。PCが適切に介入しても理由なく必ず失敗する強制演出。
- **判断を変える質問**：「GMがトラブルを必要としなくても、そのNPCがその行動を取る理由はあるか？」

詳細：`references/main-npc-agency.md`。回帰テスト：`references/demo-regression-v1.9.md`。
