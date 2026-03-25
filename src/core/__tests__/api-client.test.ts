// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: api-client.ts のユニットテスト。OpenAI APIをモックし、リトライ・タイムアウト・エラーハンドリングを検証。

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import OpenAI from "openai";

// config のAPIキー解決をモック
const { mockResolveApiKey } = vi.hoisted(() => ({
  mockResolveApiKey: vi.fn().mockReturnValue("test-api-key"),
}));
vi.mock("../config.js", () => ({
  resolveApiKey: mockResolveApiKey,
}));

import { createApiClient, callWithRetry, Spec2TestApiError, _internals } from "../api-client.js";

/** モック用のOpenAIクライアントを作成するヘルパー */
function createMockClient(createFn: ReturnType<typeof vi.fn>) {
  return {
    chat: {
      completions: {
        create: createFn,
      },
    },
  } as unknown as OpenAI;
}

/** APIError を生成するヘルパー */
function createAPIError(status: number, message: string): OpenAI.APIError {
  return new OpenAI.APIError(status, { message }, message, {});
}

describe("createApiClient", () => {
  it("APIキーを解決してOpenAIクライアントを生成する", () => {
    const client = createApiClient("my-api-key");
    expect(client).toBeInstanceOf(OpenAI);
    expect(mockResolveApiKey).toHaveBeenCalledWith("my-api-key", undefined);
  });

  it("configApiKeyも渡せる", () => {
    createApiClient("cli-key", "config-key");
    expect(mockResolveApiKey).toHaveBeenCalledWith("cli-key", "config-key");
  });
});

describe("callWithRetry", () => {
  let mockCreate: ReturnType<typeof vi.fn>;
  let sleepSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockCreate = vi.fn();
    // _internals.sleepを即座に解決するようモック
    sleepSpy = vi.spyOn(_internals, "sleep").mockResolvedValue(undefined);
  });

  afterEach(() => {
    sleepSpy.mockRestore();
  });

  // --- 正常系 ---

  it("正常レスポンス時、結果をそのまま返す", async () => {
    const mockResponse = {
      choices: [{ message: { content: "テスト結果" } }],
      usage: { total_tokens: 100 },
    };
    mockCreate.mockResolvedValue(mockResponse);
    const client = createMockClient(mockCreate);

    const result = await callWithRetry(client, {
      model: "o3-mini",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result).toBe(mockResponse);
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(sleepSpy).not.toHaveBeenCalled();
  });

  // --- 不正レスポンス ---

  it("contentがnullの場合、Spec2TestApiErrorをスローする", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: null } }],
    });
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow(Spec2TestApiError);
    expect(mockCreate).toHaveBeenCalledTimes(1); // リトライしない
  });

  it("contentがundefinedの場合、Spec2TestApiErrorをスローする", async () => {
    mockCreate.mockResolvedValue({
      choices: [{ message: {} }],
    });
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("APIレスポンスのcontentが空です");
  });

  // --- 429 レート制限 ---

  it("429エラー時、リトライして成功する", async () => {
    const mockResponse = {
      choices: [{ message: { content: "成功" } }],
      usage: { total_tokens: 100 },
    };
    mockCreate
      .mockRejectedValueOnce(createAPIError(429, "Rate limit exceeded"))
      .mockResolvedValueOnce(mockResponse);

    const client = createMockClient(mockCreate);

    const result = await callWithRetry(client, {
      model: "o3-mini",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result).toBe(mockResponse);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
    expect(sleepSpy).toHaveBeenCalledWith(1000); // 初回: 1秒
  });

  it("429エラーが最大リトライ回数を超えた場合、Spec2TestApiErrorをスローする", async () => {
    mockCreate.mockRejectedValue(createAPIError(429, "Rate limit exceeded"));
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow(Spec2TestApiError);
    expect(mockCreate).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
    expect(sleepSpy).toHaveBeenCalledTimes(3);
    // 指数バックオフ: 1秒, 2秒, 4秒
    expect(sleepSpy).toHaveBeenNthCalledWith(1, 1000);
    expect(sleepSpy).toHaveBeenNthCalledWith(2, 2000);
    expect(sleepSpy).toHaveBeenNthCalledWith(3, 4000);
  });

  // --- 401 認証エラー ---

  it("401エラー時、リトライせずSpec2TestApiErrorをスローする", async () => {
    mockCreate.mockRejectedValue(createAPIError(401, "Invalid API key"));
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("APIキーが無効です");
    expect(mockCreate).toHaveBeenCalledTimes(1); // リトライしない
    expect(sleepSpy).not.toHaveBeenCalled();
  });

  it("401エラーのメッセージに設定方法が含まれる", async () => {
    mockCreate.mockRejectedValue(createAPIError(401, "Invalid API key"));
    const client = createMockClient(mockCreate);

    try {
      await callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      });
    } catch (err) {
      expect(err).toBeInstanceOf(Spec2TestApiError);
      expect((err as Spec2TestApiError).statusCode).toBe(401);
      expect((err as Spec2TestApiError).message).toContain("OPENAI_API_KEY");
    }
  });

  // --- 500系 サーバーエラー ---

  it("500エラー時、リトライして成功する", async () => {
    const mockResponse = {
      choices: [{ message: { content: "成功" } }],
      usage: { total_tokens: 100 },
    };
    mockCreate
      .mockRejectedValueOnce(createAPIError(500, "Internal server error"))
      .mockResolvedValueOnce(mockResponse);

    const client = createMockClient(mockCreate);

    const result = await callWithRetry(client, {
      model: "o3-mini",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result).toBe(mockResponse);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
  });

  it("500エラーが最大リトライ回数を超えた場合、エラーをスローする", async () => {
    mockCreate.mockRejectedValue(createAPIError(500, "Internal server error"));
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow(Spec2TestApiError);
    expect(mockCreate).toHaveBeenCalledTimes(4); // 初回 + 3回リトライ
  });

  it("503エラーもリトライ対象", async () => {
    const mockResponse = {
      choices: [{ message: { content: "OK" } }],
    };
    mockCreate
      .mockRejectedValueOnce(createAPIError(503, "Service unavailable"))
      .mockResolvedValueOnce(mockResponse);

    const client = createMockClient(mockCreate);
    const result = await callWithRetry(client, {
      model: "o3-mini",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result).toBe(mockResponse);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  // --- タイムアウト ---

  it("タイムアウトエラー時、リトライして成功する", async () => {
    const mockResponse = {
      choices: [{ message: { content: "OK" } }],
    };
    const timeoutError = new Error("Request timeout");
    mockCreate
      .mockRejectedValueOnce(timeoutError)
      .mockResolvedValueOnce(mockResponse);

    const client = createMockClient(mockCreate);

    const result = await callWithRetry(client, {
      model: "o3-mini",
      messages: [{ role: "user", content: "test" }],
    });

    expect(result).toBe(mockResponse);
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledTimes(1);
  });

  it("タイムアウトが最大リトライ回数を超えた場合、Spec2TestApiErrorをスローする", async () => {
    const timeoutError = new Error("Request timeout");
    mockCreate.mockRejectedValue(timeoutError);
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("タイムアウト");
    expect(mockCreate).toHaveBeenCalledTimes(4);
    expect(sleepSpy).toHaveBeenCalledTimes(3);
  });

  // --- その他のAPIエラー ---

  it("403エラー時、リトライせずSpec2TestApiErrorをスローする", async () => {
    mockCreate.mockRejectedValue(createAPIError(403, "Forbidden"));
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("OpenAI APIエラー (403)");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  // --- 未知のエラー ---

  it("未知のエラーはリトライせずそのままスローする", async () => {
    const unknownError = new TypeError("Unknown issue");
    mockCreate.mockRejectedValue(unknownError);
    const client = createMockClient(mockCreate);

    await expect(
      callWithRetry(client, {
        model: "o3-mini",
        messages: [{ role: "user", content: "test" }],
      })
    ).rejects.toThrow("Unknown issue");
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});

describe("Spec2TestApiError", () => {
  it("nameがSpec2TestApiErrorである", () => {
    const err = new Spec2TestApiError("test");
    expect(err.name).toBe("Spec2TestApiError");
  });

  it("statusCodeとrawResponseを保持する", () => {
    const err = new Spec2TestApiError("test", 429, '{"error":"rate limit"}');
    expect(err.statusCode).toBe(429);
    expect(err.rawResponse).toBe('{"error":"rate limit"}');
  });

  it("Errorのインスタンスである", () => {
    const err = new Spec2TestApiError("test");
    expect(err).toBeInstanceOf(Error);
  });
});
