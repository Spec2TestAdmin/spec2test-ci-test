// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: OpenAI APIクライアントのラッパーモジュール。指数バックオフリトライ、タイムアウト、レスポンス検証を提供。

import OpenAI from "openai";
import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions.js";
import { resolveApiKey } from "./config.js";
import * as fs from "node:fs";
import * as path from "node:path";

/** リトライ設定 */
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;
const TIMEOUT_MS = 30000;

/**
 * 内部ヘルパー（テスト時にvi.spyOnでモック可能）
 */
export const _internals = {
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },
};

/** カスタムエラークラス */
export class Spec2TestApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly rawResponse?: string
  ) {
    super(message);
    this.name = "Spec2TestApiError";
  }
}

/**
 * OpenAI APIクライアントを生成する
 */
export function createApiClient(apiKey?: string, configApiKey?: string): OpenAI {
  const key = resolveApiKey(apiKey, configApiKey);
  return new OpenAI({
    apiKey: key,
    timeout: TIMEOUT_MS,
  });
}

/**
 * 指数バックオフ付きでAPI呼び出しを実行する
 */
export async function callWithRetry(
  client: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.chat.completions.create(params);

      // レスポンス検証
      const content = response.choices?.[0]?.message?.content;
      if (content === null || content === undefined) {
        const rawJson = JSON.stringify(response, null, 2);
        saveErrorResponse(rawJson, "empty-content");
        throw new Spec2TestApiError(
          "APIレスポンスのcontentが空です。生レスポンスを保存しました。",
          undefined,
          rawJson
        );
      }

      return response;
    } catch (error: unknown) {
      lastError = error as Error;

      // Spec2TestApiError（レスポンス不正）はリトライしない
      if (error instanceof Spec2TestApiError) {
        throw error;
      }

      // OpenAI APIエラーの場合
      if (error instanceof OpenAI.APIError) {
        const status = error.status;

        // 429: レート制限 → リトライ
        if (status === 429 && attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.error(
            `⏳ レート制限に達しました。${delay / 1000}秒後にリトライします... (${attempt + 1}/${MAX_RETRIES})`
          );
          await _internals.sleep(delay);
          continue;
        }

        // 500系: サーバーエラー → リトライ
        if (status >= 500 && attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.error(
            `⏳ サーバーエラーが発生しました。${delay / 1000}秒後にリトライします... (${attempt + 1}/${MAX_RETRIES})`
          );
          await _internals.sleep(delay);
          continue;
        }

        // 401: 認証エラー → リトライしない
        if (status === 401) {
          throw new Spec2TestApiError(
            "APIキーが無効です。正しいOpenAI APIキーを設定してください。\n" +
              "  1. 環境変数: export OPENAI_API_KEY=sk-...\n" +
              "  2. 設定ファイル: .spec2testrc.json の apiKey フィールド\n" +
              "  3. CLIオプション: --api-key sk-...",
            401
          );
        }

        // その他のAPIエラー
        throw new Spec2TestApiError(
          `OpenAI APIエラー (${status}): ${error.message}`,
          status
        );
      }

      // タイムアウトエラー
      if (
        error instanceof OpenAI.APIConnectionTimeoutError ||
        (error instanceof Error && error.message.includes("timeout"))
      ) {
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.error(
            `⏳ タイムアウトしました（30秒）。${delay / 1000}秒後にリトライします... (${attempt + 1}/${MAX_RETRIES})`
          );
          await _internals.sleep(delay);
          continue;
        }
        throw new Spec2TestApiError(
          "APIリクエストがタイムアウトしました（30秒）。\n" +
            "以下を確認してください:\n" +
            "  - ネットワーク接続\n" +
            "  - 入力テキストのサイズ（大きすぎる場合は分割してください）\n" +
            "  - しばらく待ってから再実行"
        );
      }

      // 接続エラー
      if (error instanceof OpenAI.APIConnectionError) {
        if (attempt < MAX_RETRIES) {
          const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
          console.error(
            `⏳ 接続エラーが発生しました。${delay / 1000}秒後にリトライします... (${attempt + 1}/${MAX_RETRIES})`
          );
          await _internals.sleep(delay);
          continue;
        }
        throw new Spec2TestApiError(
          "OpenAI APIに接続できません。ネットワーク接続を確認してください。"
        );
      }

      // 未知のエラー → リトライしない
      throw error;
    }
  }

  // ここには通常到達しないが、TypeScriptの型安全のため
  throw lastError || new Error("不明なエラーが発生しました");
}

/**
 * エラー時の生レスポンスをファイルに保存する
 */
function saveErrorResponse(rawJson: string, label: string): void {
  try {
    const timestamp = Date.now();
    const filePath = path.join("/tmp", `spec2test-error-${label}-${timestamp}.json`);
    fs.writeFileSync(filePath, rawJson, "utf-8");
    console.error(`📝 生レスポンスを保存しました: ${filePath}`);
  } catch {
    // ファイル保存に失敗しても処理は続行
  }
}

/**
 * 指定ミリ秒間スリープする（テスト時にモック可能）
 */
export function sleep(ms: number): Promise<void> {
  return _internals.sleep(ms);
}
