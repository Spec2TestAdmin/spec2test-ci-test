// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: CLI (cli/index.ts) のテスト。子プロセスとしてCLIを実行し、オプションパースとエラーハンドリングを検証。

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

const CLI_PATH = path.resolve(import.meta.dirname, "../../../dist/cli/index.js");
const FIXTURES_DIR = path.resolve(import.meta.dirname, "fixtures");

describe("CLI: spec2test", () => {
  beforeAll(() => {
    // テスト用フィクスチャディレクトリを作成
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }
    // テスト用の仕様書ファイルを作成
    fs.writeFileSync(
      path.join(FIXTURES_DIR, "sample-spec.md"),
      "# ログイン仕様\n\n- ユーザーはメールアドレスでログインできる\n",
      "utf-8"
    );
    // テスト用の空ファイルを作成
    fs.writeFileSync(path.join(FIXTURES_DIR, "empty.md"), "", "utf-8");
  });

  afterAll(() => {
    // フィクスチャをクリーンアップ
    if (fs.existsSync(FIXTURES_DIR)) {
      fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
  });

  function runCli(args: string[]): { stdout: string; exitCode: number } {
    try {
      const stdout = execFileSync("node", [CLI_PATH, ...args], {
        encoding: "utf-8",
        timeout: 5000,
        env: { ...process.env, OPENAI_API_KEY: undefined },
      });
      return { stdout, exitCode: 0 };
    } catch (err: any) {
      return {
        stdout: (err.stdout || "") + (err.stderr || ""),
        exitCode: err.status ?? 1,
      };
    }
  }

  describe("メインコマンド", () => {
    it("--versionでバージョンを表示する", () => {
      const { stdout, exitCode } = runCli(["--version"]);
      expect(exitCode).toBe(0);
      expect(stdout.trim()).toBe("0.1.0");
    });

    it("--helpでヘルプを表示する", () => {
      const { stdout, exitCode } = runCli(["--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("spec2test");
      expect(stdout).toContain("generate");
      expect(stdout).toContain("reverse");
      expect(stdout).toContain("init");
    });
  });

  describe("generateサブコマンド", () => {
    it("ファイル未指定かつ--stdinなしでエラーを返す", () => {
      const { stdout, exitCode } = runCli(["generate"]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("エラー");
    });

    it("存在しないファイルを指定するとエラーを返す", () => {
      const { stdout, exitCode } = runCli(["generate", "nonexistent.md"]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("ファイルが見つかりません");
    });

    it("空ファイルを指定するとエラーを返す", () => {
      const { stdout, exitCode } = runCli([
        "generate",
        path.join(FIXTURES_DIR, "empty.md"),
      ]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("空です");
    });

    it("generate --helpがオプション一覧を表示する", () => {
      const { stdout, exitCode } = runCli(["generate", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--output");
      expect(stdout).toContain("--model");
      expect(stdout).toContain("--format");
      expect(stdout).toContain("--lang");
      expect(stdout).toContain("--stdin");
      expect(stdout).toContain("--api-key");
    });
  });

  describe("reverseサブコマンド", () => {
    it("ファイル未指定かつ--stdinなしでエラーを返す", () => {
      const { stdout, exitCode } = runCli(["reverse"]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("エラー");
    });

    it("存在しないファイルを指定するとエラーを返す", () => {
      const { stdout, exitCode } = runCli(["reverse", "nonexistent.ts"]);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("ファイルが見つかりません");
    });

    it("reverse --helpがオプション一覧を表示する", () => {
      const { stdout, exitCode } = runCli(["reverse", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("--output");
      expect(stdout).toContain("--model");
      expect(stdout).toContain("--lang");
      expect(stdout).toContain("--stdin");
    });
  });

  describe("initサブコマンド", () => {
    const testConfigPath = path.resolve("/tmp/spec2test-init-test/.spec2testrc.json");
    const testDir = path.dirname(testConfigPath);

    beforeAll(() => {
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
    });

    afterAll(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
      }
    });

    it("init --helpがヘルプを表示する", () => {
      const { stdout, exitCode } = runCli(["init", "--help"]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain(".spec2testrc.json");
    });
  });
});
