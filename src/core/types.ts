// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: Spec2Test CLIで使用する共通型定義。生成オプション、設定、出力フォーマット等を定義。

/**
 * AIモデルの選択肢
 */
export type ModelName = "o3-mini" | "gpt-4o" | "gpt-4o-mini";

/**
 * 出力フォーマットの選択肢
 */
export type OutputFormat = "playwright" | "jest" | "markdown";

/**
 * 出力言語の選択肢
 */
export type OutputLang = "ja" | "en";

/**
 * テストコード生成オプション
 */
export interface GenerateOptions {
  /** 使用するAIモデル */
  model: ModelName;
  /** 出力フォーマット */
  format: OutputFormat;
  /** 出力言語 */
  lang: OutputLang;
  /** OpenAI APIキー（環境変数より優先） */
  apiKey?: string;
}

/**
 * 仕様書逆生成オプション
 */
export interface ReverseOptions {
  /** 使用するAIモデル */
  model: ModelName;
  /** 出力言語 */
  lang: OutputLang;
  /** OpenAI APIキー（環境変数より優先） */
  apiKey?: string;
}

/**
 * 設定ファイルの型定義
 */
export interface Spec2TestConfig {
  /** OpenAI APIキー */
  apiKey?: string;
  /** デフォルトのAIモデル */
  model?: ModelName;
  /** デフォルトの出力フォーマット */
  format?: OutputFormat;
  /** デフォルトの出力言語 */
  lang?: OutputLang;
  /** デフォルトの出力先ディレクトリ */
  outputDir?: string;
}

/**
 * 生成結果の型
 */
export interface GenerateResult {
  /** 生成されたコンテンツ */
  content: string;
  /** 使用したモデル */
  model: ModelName;
  /** 使用したトークン数（概算） */
  tokensUsed?: number;
}
