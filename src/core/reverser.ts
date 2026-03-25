// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: ソースコードから要件定義書を逆生成（リバースエンジニアリング）するコアモジュール。OpenAI APIを使用。

import type { ReverseOptions, GenerateResult } from "./types.js";
import { createApiClient, callWithRetry } from "./api-client.js";

/**
 * 出力言語に応じたプロンプトの言語指示を返す
 */
function getLangInstruction(lang: ReverseOptions["lang"]): string {
  return lang === "ja"
    ? "出力はすべて日本語で行ってください。"
    : "Output everything in English.";
}

/**
 * ソースコードから要件定義書を逆生成する
 */
export async function reverseSpecFromCode(
  code: string,
  options: ReverseOptions
): Promise<GenerateResult> {
  const client = createApiClient(options.apiKey);

  const langInst = getLangInstruction(options.lang);

  const systemPrompt = `あなたは世界最高レベルのITアーキテクトおよびフルスタックエンジニアです。
ユーザーから提供されたソースコードを詳細に解析し、このシステムがどのような仕様・要件で動いているかを「自然言語の要件定義書（Markdown形式）」として逆生成（リバースエンジニアリング）してください。

出力は以下の構成に従い、技術に詳しくない人間でも理解しやすいように、かつ網羅的に作成してください。
1. **システム概要**: このコードが解決する課題と目的の推測
2. **主要機能と処理フロー**: ユーザーのアクションからデータがどう処理されるかの流れ
3. **制約・条件分岐（エッジケース）**: エラーハンドリング、バリデーション、特異な条件設定の詳細
4. **依存技術・利用コンポーネント**: 推測されるスタックやライブラリ群

${langInst}`;

  const response = await callWithRetry(client, {
    model: options.model,
    messages: [
      { role: "developer", content: systemPrompt },
      {
        role: "user",
        content: `以下のソースコードを解析し、完璧な要件定義書を作成してください。\n\n${code}`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content || "";
  const tokensUsed = response.usage?.total_tokens;

  return {
    content,
    model: options.model,
    tokensUsed,
  };
}

