# Spec2Test CLI

> AI-powered test code generator — 仕様書からテストコードを自動生成するCLIツール

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 特徴

- 🧪 **仕様書 → テストコード自動生成**: 自然言語の仕様書からPlaywright/Jestテストコードを自動生成
- 🔄 **コード → 仕様書逆生成**: 既存のソースコードから要件定義書をリバースエンジニアリング
- 🤖 **OpenAI o3-mini搭載**: 推論特化モデルによる高品質な出力
- 🔧 **CI/CD統合**: GitHub Actionsで仕様変更時にテストを自動生成
- 🌐 **日本語対応**: 日本語の仕様書をそのまま入力可能

## インストール

```bash
npm install -g @liot/spec2test
```

または、npxでの一時実行:

```bash
npx @liot/spec2test generate spec.md -o tests/login.test.ts
```

## クイックスタート

### 1. 初期設定

```bash
# 設定ファイルを生成
spec2test init
```

`.spec2testrc.json` が作成されます:

```json
{
  "apiKey": "",
  "model": "o3-mini",
  "format": "playwright",
  "lang": "ja",
  "outputDir": "./tests/generated"
}
```

環境変数でAPIキーを設定するか、設定ファイルに記述してください:

```bash
export OPENAI_API_KEY=sk-...
```

### 2. テストコード生成

```bash
# ファイルから生成
spec2test generate docs/login-spec.md -o tests/login.test.ts

# モデル・フォーマットを指定
spec2test generate spec.md -m gpt-4o -f jest -o tests/unit.test.ts

# パイプで入力
cat spec.md | spec2test generate --stdin -o tests/output.test.ts

# 標準出力に表示
spec2test generate spec.md
```

### 3. 仕様書逆生成

```bash
# ソースコードから要件定義書を生成
spec2test reverse src/app.ts -o docs/requirements.md

# 英語で出力
spec2test reverse src/app.ts -l en -o docs/requirements-en.md
```

## コマンドリファレンス

### `spec2test generate [file]`

仕様書からテストコードを生成します。

| オプション              | 説明                             | デフォルト     |
|-------------------------|----------------------------------|----------------|
| `-o, --output <path>`   | 出力先ファイルパス               | 標準出力       |
| `-m, --model <model>`   | AIモデル                         | `o3-mini`      |
| `-f, --format <format>` | 出力フォーマット                 | `playwright`   |
| `-l, --lang <lang>`     | 出力言語 (ja/en)                 | `ja`           |
| `--stdin`               | 標準入力から読み取り             | -              |
| `--api-key <key>`       | OpenAI APIキー                   | 環境変数       |

### `spec2test reverse [file]`

ソースコードから要件定義書を逆生成します。

| オプション            | 説明                 | デフォルト     |
|-----------------------|----------------------|----------------|
| `-o, --output <path>` | 出力先ファイルパス   | 標準出力       |
| `-m, --model <model>` | AIモデル             | `o3-mini`      |
| `-l, --lang <lang>`   | 出力言語 (ja/en)     | `ja`           |
| `--stdin`             | 標準入力から読み取り | -              |
| `--api-key <key>`     | OpenAI APIキー       | 環境変数       |

### `spec2test init`

`.spec2testrc.json` 設定ファイルを生成します。

## GitHub Actions 連携

PRで仕様書が変更された際に、テストコードを自動生成するワークフローを設定できます。

### セットアップ

1. `.github/workflows/spec2test.yml` をリポジトリにコピー
2. GitHub Repository Secrets に `OPENAI_API_KEY` を設定
3. 仕様書のパスパターンをカスタマイズ

### Secrets の設定方法

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions** を開く
2. **New repository secret** をクリック
3. 以下を設定:

| Name             | Value                            |
|------------------|----------------------------------|
| `OPENAI_API_KEY` | OpenAI APIキー（`sk-proj-...`）  |

4. **Add secret** をクリックして保存

### ワークフロー例

```yaml
name: Auto Generate Tests
on:
  pull_request:
    paths:
      - "docs/specs/**/*.md"
jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./050.CLI  # or published action path
        with:
          spec-path: "docs/specs/login.spec.md"
          output-path: "tests/login.test.ts"
          openai-api-key: ${{ secrets.OPENAI_API_KEY }}
```

### CI/CDテスト手順

実環境でのワークフロー動作検証を行う場合:

1. テスト用GitHubリポジトリを作成（例: `spec2test-ci-test`）
2. CLI一式を push
3. `OPENAI_API_KEY` をSecretに設定
4. `docs/specs/` にサンプル仕様書を追加するPRを作成
5. ワークフローが自動実行され、テストコードが生成されることを確認

## 設定ファイル

以下の場所から設定を自動検索します（優先順位順）:

1. `.spec2testrc.json`
2. `.spec2testrc.yaml` / `.spec2testrc.yml`
3. `spec2test.config.js` / `spec2test.config.cjs`
4. `package.json` の `"spec2test"` キー

## 開発

```bash
git clone <repo>
cd 050.CLI
npm install
npm run build
node dist/cli/index.js --help
```

## ライセンス

MIT License - [Liot LLC](https://liot-partner.com)
