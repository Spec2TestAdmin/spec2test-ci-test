// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: reverser.ts のユニットテスト。OpenAI APIをモックし、逆生成プロンプトと応答パースを検証。

import { describe, it, expect, vi, beforeEach } from "vitest";

// api-client モジュールをモック
const { mockCallWithRetry } = vi.hoisted(() => ({
  mockCallWithRetry: vi.fn(),
}));
vi.mock("../api-client.js", () => ({
  createApiClient: vi.fn().mockReturnValue({}),
  callWithRetry: mockCallWithRetry,
}));

import { reverseSpecFromCode } from "../reverser.js";
import type { ReverseOptions } from "../types.js";

describe("reverseSpecFromCode", () => {
  const baseOptions: ReverseOptions = {
    model: "o3-mini",
    lang: "ja",
    apiKey: "test-key",
  };

  beforeEach(() => {
    mockCallWithRetry.mockReset();
    mockCallWithRetry.mockResolvedValue({
      choices: [
        {
          message: {
            content: "# 要件定義書\n\n## システム概要\nテスト用の要件定義書です。",
          },
        },
      ],
      usage: { total_tokens: 2000 },
    });
  });

  it("正常に要件定義書を生成して結果を返す", async () => {
    const result = await reverseSpecFromCode("const x = 1;", baseOptions);
    expect(result.content).toContain("要件定義書");
    expect(result.model).toBe("o3-mini");
    expect(result.tokensUsed).toBe(2000);
  });

  it("APIに正しいモデル名を渡す", async () => {
    await reverseSpecFromCode("const x = 1;", baseOptions);
    expect(mockCallWithRetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ model: "o3-mini" })
    );
  });

  it("日本語指定時、プロンプトに日本語の指示が含まれる", async () => {
    await reverseSpecFromCode("const x = 1;", { ...baseOptions, lang: "ja" });
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("日本語");
  });

  it("英語指定時、プロンプトに英語の指示が含まれる", async () => {
    await reverseSpecFromCode("const x = 1;", { ...baseOptions, lang: "en" });
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("English");
  });

  it("システムプロンプトにリバースエンジニアリングの指示が含まれる", async () => {
    await reverseSpecFromCode("const x = 1;", baseOptions);
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("リバースエンジニアリング");
  });

  it("システムプロンプトに必須出力セクションの指示が含まれる", async () => {
    await reverseSpecFromCode("const x = 1;", baseOptions);
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("システム概要");
    expect(systemMsg.content).toContain("主要機能と処理フロー");
    expect(systemMsg.content).toContain("制約・条件分岐");
    expect(systemMsg.content).toContain("依存技術");
  });

  it("ユーザープロンプトにソースコードが含まれる", async () => {
    const code = "export function hello() { return 'world'; }";
    await reverseSpecFromCode(code, baseOptions);
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain(code);
  });

  it("APIレスポンスのcontentが空の場合、空文字を返す", async () => {
    mockCallWithRetry.mockResolvedValue({
      choices: [{ message: { content: "" } }],
      usage: { total_tokens: 50 },
    });
    const result = await reverseSpecFromCode("code", baseOptions);
    expect(result.content).toBe("");
  });

  it("APIレスポンスにusageがない場合、tokensUsedはundefined", async () => {
    mockCallWithRetry.mockResolvedValue({
      choices: [{ message: { content: "spec" } }],
    });
    const result = await reverseSpecFromCode("code", baseOptions);
    expect(result.tokensUsed).toBeUndefined();
  });
});
