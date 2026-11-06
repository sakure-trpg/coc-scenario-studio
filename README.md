# CoC Scenario Studio

ChatGPT本体と別ウィンドウで使う、CoCシナリオ制作室。

## 実装した操作

- 1280×720のシーンにテキスト、画像、共通素材を配置。ドラッグ移動、右下ハンドルでサイズ変更、本文のダブルクリック編集、右クリック操作、複製・削除。
- ページの作成、種類・設計メモの編集、並び替え、複製・削除。
- NPC・アイテム・呪文・神話存在の共通設定、画像アップロード、知識の来歴と動機の編集。
- 時系列、人物関係、確定／候補／却下／未決定の設定、未解決課題。
- D1で自動保存、20回分の保存履歴と取り消し、同じ制作室向けのJSON本文バックアップ・復元。画像ファイルはR2に保存し、JSONには参照URLを記録。
- MCPで最新版・選択ページ・設定・v1.9原文を読み、変更候補を登録。ユーザーがWeb上で差分を確認して採用。
- MCPが利用できない場合の相談文コピー、提案JSONの取込。

## 連携

Sitesにより作成されるCoC Scenario Studioプラグインを接続する。MCP endpointは `/mcp`。`get_project_context` → `get_architect_rules` → 関連情報の読取 → `validate_proposal` → `propose_changes` の順で利用。

AIは確定データを直接更新できない。採用はWeb APIのみ。最新contentRevisionとの照合と重大未解決問題のゲートを通す。形式検査はNPCの心理や物語の意味の妥当性を保証しない。AIによるレビュー結果は自己申告であり、ユーザーが確認する。

## 保存とアクセス

所有者のみが利用する非公開Siteとして公開。共有データへのAPIとMCPはSitesの所有者限定アクセス境界で保護する。公開／共同利用へ変更する場合は、先にアプリ側の権限処理を追加する。

- `DB`: studioテーブル、シナリオごとの文書・提案・履歴。version列によるCASで更新競合を検出。
- `BUCKET`: 画像。最大8MB/ファイル、PNG/JPEG/WebP/GIF。
- 選択ページは studio_selection に分離して保存。ChatGPTがツールを呼んだ時点に取得。Webは6秒ごとに提案等を更新。編集中はサーバーの取得で上書きしない。

## 制作規則

ユーザーの `coc-scenario-architect-v1.9.zip` を取得して展開した原文を `public/architect/` に保持。MCP用の同一Markdown本文は `lib/architect.ts`。変更時は両方を同時に更新する。

外部の生成AI APIは利用しない。ChatGPT本体で案を考え、MCPまたはJSONで取り込む。

## 開発・検証

依存関係導入後：

```
node node_modules/typescript/bin/tsc --noEmit
node scripts/test-model.mjs
node scripts/test-store.mjs
npm run db:generate
npm run build
```

DBスキーマ更新はDrizzle migrationを追加。適用済みSQLは変更しない。

## GitHub版のデータ

本番のシナリオや画像、呪文資料の原文は同梱していません。シナリオは空のテンプレートから始まります。
