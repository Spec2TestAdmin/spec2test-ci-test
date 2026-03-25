// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: config.ts のユニットテスト。APIキー解決・設定テンプレート生成・設定ファイル読み込みを検証。

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveApiKey, generateConfigTemplate, loadConfig } from "../config.js";

describe("resolveApiKey", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("CLI引数のAPIキーを最優先で返す", () => {
    process.env.OPENAI_API_KEY = "env-key";
    const result = resolveApiKey("cli-key", "config-key");
    expect(result).toBe("cli-key");
  });

  it("CLI引数がない場合、設定ファイルのAPIキーを返す", () => {
    process.env.OPENAI_API_KEY = "env-key";
    const result = resolveApiKey(undefined, "config-key");
    expect(result).toBe("config-key");
  });

  it("CLI引数も設定ファイルもない場合、環境変数のAPIキーを返す", () => {
    process.env.OPENAI_API_KEY = "env-key";
    const result = resolveApiKey(undefined, undefined);
    expect(result).toBe("env-key");
  });

  it("すべて未設定の場合、エラーをスローする", () => {
    expect(() => resolveApiKey(undefined, undefined)).toThrow(
      "OpenAI APIキーが設定されていません"
    );
  });

  it("エラーメッセージに設定方法の案内が含まれる", () => {
    expect(() => resolveApiKey(undefined, undefined)).toThrow(
      "環境変数: export OPENAI_API_KEY"
    );
  });

  it("空文字のCLI引数はフォールバックする", () => {
    process.env.OPENAI_API_KEY = "env-key";
    const result = resolveApiKey("", undefined);
    expect(result).toBe("env-key");
  });
});

describe("generateConfigTemplate", () => {
  it("デフォルトの設定テンプレートを返す", () => {
    const template = generateConfigTemplate();
    expect(template).toEqual({
      apiKey: "",
      model: "o3-mini",
      format: "playwright",
      lang: "ja",
      outputDir: "./tests/generated",
    });
  });

  it("apiKeyは空文字で初期化される", () => {
    const template = generateConfigTemplate();
    expect(template.apiKey).toBe("");
  });
});

describe("loadConfig", () => {
  it("設定ファイルが見つからない場合、空オブジェクトを返す", async () => {
    // /tmp には設定ファイルが存在しないため空が返る
    const config = await loadConfig("/tmp/nonexistent-dir-12345");
    expect(config).toEqual({});
  });
});
