// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: 仕様書からPlaywright/Jestテストコードを自動生成するコアモジュール。OpenAI APIを使用。

import type { GenerateOptions, GenerateResult } from "./types.js";
import { createApiClient, callWithRetry } from "./api-client.js";

/**
 * 出力フォーマットに応じたプロンプトの補足指示を返す
 */
function getFormatInstruction(format: GenerateOptions["format"]): string {
  switch (format) {
    case "playwright":
      return "Playwrightを用いた具体的なE2Eテストコード（TypeScript）を生成してください。";
    case "jest":
      return "Jestを用いたユニットテストコード（TypeScript）を生成してください。";
    case "markdown":
      return "テストシナリオをMarkdownの表形式で出力してください。コードは不要です。";
  }
}

/**
 * 出力言語に応じたプロンプトの言語指示を返す
 */
function getLangInstruction(lang: GenerateOptions["lang"]): string {
  return lang === "ja"
    ? "出力はすべて日本語で行ってください。コメントも日本語で記述してください。"
    : "Output everything in English. Comments should be in English.";
}

/**
 * 仕様書からテストコードを生成する
 */
export async function generateTestFromSpec(
  spec: string,
  options: GenerateOptions
): Promise<GenerateResult> {
  const client = createApiClient(options.apiKey);

  const formatInst = getFormatInstruction(options.format);
  const langInst = getLangInstruction(options.lang);

  const systemPrompt = `あなたは世界最高峰のQAエンジニアであり、テスト自動化スペシャリストです。
以下の仕様書（Spec）を深く論理的に読み解き、以下の2点を出力してください。

1. 【テストシナリオ設計】: 正常系だけでなく、境界値や異常系、エッジケースを含めた網羅的なテストケースを箇条書きで抽出。
2. 【テストコード】: 抽出したシナリオを網羅する、${formatInst}

${langInst}`;

  const response = await callWithRetry(client, {
    model: options.model,
    messages: [
      { role: "developer", content: systemPrompt },
      {
        role: "user",
        content: `以下の仕様書を解析し、網羅的なテストを生成してください。\n\n${spec}`,
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

