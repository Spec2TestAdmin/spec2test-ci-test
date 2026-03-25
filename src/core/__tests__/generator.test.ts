// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: generator.ts のユニットテスト。OpenAI APIをモックし、プロンプト生成ロジックと応答パースを検証。

import { describe, it, expect, vi, beforeEach } from "vitest";

// api-client モジュールをモック
const { mockCallWithRetry } = vi.hoisted(() => ({
  mockCallWithRetry: vi.fn(),
}));
vi.mock("../api-client.js", () => ({
  createApiClient: vi.fn().mockReturnValue({}),
  callWithRetry: mockCallWithRetry,
}));

import { generateTestFromSpec } from "../generator.js";
import type { GenerateOptions } from "../types.js";

describe("generateTestFromSpec", () => {
  const baseOptions: GenerateOptions = {
    model: "o3-mini",
    format: "playwright",
    lang: "ja",
    apiKey: "test-key",
  };

  beforeEach(() => {
    mockCallWithRetry.mockReset();
    mockCallWithRetry.mockResolvedValue({
      choices: [
        {
          message: {
            content: "// Generated test code\ntest('example', () => {});",
          },
        },
      ],
      usage: { total_tokens: 1500 },
    });
  });

  it("正常にテストコードを生成して結果を返す", async () => {
    const result = await generateTestFromSpec("ログイン仕様", baseOptions);
    expect(result.content).toContain("Generated test code");
    expect(result.model).toBe("o3-mini");
    expect(result.tokensUsed).toBe(1500);
  });

  it("APIに正しいモデル名を渡す", async () => {
    await generateTestFromSpec("仕様書", baseOptions);
    expect(mockCallWithRetry).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ model: "o3-mini" })
    );
  });

  it("Playwrightフォーマット指定時、プロンプトにPlaywrightの指示が含まれる", async () => {
    await generateTestFromSpec("仕様書", { ...baseOptions, format: "playwright" });
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("Playwright");
  });

  it("Jestフォーマット指定時、プロンプトにJestの指示が含まれる", async () => {
    await generateTestFromSpec("仕様書", { ...baseOptions, format: "jest" });
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("Jest");
  });

  it("Markdownフォーマット指定時、プロンプトにMarkdownの指示が含まれる", async () => {
    await generateTestFromSpec("仕様書", { ...baseOptions, format: "markdown" });
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("Markdown");
  });

  it("日本語指定時、プロンプトに日本語の指示が含まれる", async () => {
    await generateTestFromSpec("仕様書", { ...baseOptions, lang: "ja" });
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("日本語");
  });

  it("英語指定時、プロンプトに英語の指示が含まれる", async () => {
    await generateTestFromSpec("仕様書", { ...baseOptions, lang: "en" });
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "developer");
    expect(systemMsg.content).toContain("English");
  });

  it("ユーザープロンプトに仕様書テキストが含まれる", async () => {
    await generateTestFromSpec("ログイン画面の仕様", baseOptions);
    const callArgs = mockCallWithRetry.mock.calls[0][1];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain("ログイン画面の仕様");
  });

  it("APIレスポンスのcontentが空の場合、空文字を返す", async () => {
    mockCallWithRetry.mockResolvedValue({
      choices: [{ message: { content: "" } }],
      usage: { total_tokens: 100 },
    });
    const result = await generateTestFromSpec("仕様書", baseOptions);
    expect(result.content).toBe("");
  });

  it("APIレスポンスにusageがない場合、tokensUsedはundefined", async () => {
    mockCallWithRetry.mockResolvedValue({
      choices: [{ message: { content: "test" } }],
    });
    const result = await generateTestFromSpec("仕様書", baseOptions);
    expect(result.tokensUsed).toBeUndefined();
  });
});
