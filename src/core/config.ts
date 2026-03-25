// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: cosmiconfigを使った設定ファイル読み込みと環境変数からのAPIキー取得を行うモジュール。

import { cosmiconfig } from "cosmiconfig";
import type { Spec2TestConfig } from "./types.js";

const MODULE_NAME = "spec2test";

/**
 * 設定ファイルを探索し読み込む
 * 探索対象:
 *   - .spec2testrc.json
 *   - .spec2testrc.yaml
 *   - .spec2testrc.yml
 *   - spec2test.config.js
 *   - spec2test.config.cjs
 *   - package.json の "spec2test" キー
 */
export async function loadConfig(searchFrom?: string): Promise<Spec2TestConfig> {
  const explorer = cosmiconfig(MODULE_NAME);

  try {
    const result = searchFrom
      ? await explorer.search(searchFrom)
      : await explorer.search();

    if (result && !result.isEmpty) {
      return result.config as Spec2TestConfig;
    }
  } catch {
    // 設定ファイルが見つからない場合は空の設定を返す
  }

  return {};
}

/**
 * APIキーを解決する（優先順位: 引数 > 設定ファイル > 環境変数）
 */
export function resolveApiKey(
  cliApiKey?: string,
  configApiKey?: string
): string {
  const key = cliApiKey || configApiKey || process.env.OPENAI_API_KEY;

  if (!key) {
    throw new Error(
      "OpenAI APIキーが設定されていません。\n" +
        "以下のいずれかの方法で設定してください:\n" +
        "  1. 環境変数: export OPENAI_API_KEY=sk-...\n" +
        "  2. 設定ファイル: .spec2testrc.json の apiKey フィールド\n" +
        "  3. spec2test init コマンドで初期設定"
    );
  }

  return key;
}

/**
 * デフォルトの設定ファイルテンプレートを生成
 */
export function generateConfigTemplate(): Spec2TestConfig {
  return {
    apiKey: "",
    model: "o3-mini",
    format: "playwright",
    lang: "ja",
    outputDir: "./tests/generated",
  };
}
