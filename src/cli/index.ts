#!/usr/bin/env node
// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: spec2test CLIのメインエントリポイント。commander ベースのサブコマンド構成。
//       generate（仕様→テスト）, reverse（コード→仕様）, init（設定初期化）を提供。

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as fs from "node:fs";
import * as path from "node:path";

import { generateTestFromSpec } from "../core/generator.js";
import { reverseSpecFromCode } from "../core/reverser.js";
import { Spec2TestApiError } from "../core/api-client.js";
import {
  loadConfig,
  resolveApiKey,
  generateConfigTemplate,
} from "../core/config.js";
import type { ModelName, OutputFormat, OutputLang } from "../core/types.js";

const program = new Command();

program
  .name("spec2test")
  .description(
    "AI-powered test code generator. 仕様書からテストコードを自動生成するCLIツール。"
  )
  .version("0.1.0");

// ===========================================================================
// generate サブコマンド: 仕様書 → テストコード
// ===========================================================================
program
  .command("generate")
  .description("仕様書ファイルからテストコード（Playwright/Jest等）を自動生成する")
  .argument("[file]", "仕様書ファイルのパス（.md, .txt等）")
  .option("-o, --output <path>", "出力先ファイルパス")
  .option(
    "-m, --model <model>",
    "AIモデル (o3-mini | gpt-4o | gpt-4o-mini)",
    "o3-mini"
  )
  .option(
    "-f, --format <format>",
    "出力フォーマット (playwright | jest | markdown)",
    "playwright"
  )
  .option("-l, --lang <lang>", "出力言語 (ja | en)", "ja")
  .option("--stdin", "標準入力から仕様書を読み取る")
  .option("--api-key <key>", "OpenAI APIキー（環境変数より優先）")
  .action(async (file: string | undefined, opts: Record<string, string | boolean | undefined>) => {
    try {
      // 設定ファイルを読み込み
      const config = await loadConfig();

      // 入力テキストの取得
      let specText: string;

      if (opts.stdin) {
        // 標準入力から読み取り
        specText = await readStdin();
      } else if (file) {
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
          console.error(chalk.red(`エラー: ファイルが見つかりません: ${filePath}`));
          process.exit(1);
        }
        specText = fs.readFileSync(filePath, "utf-8");
      } else {
        console.error(
          chalk.red("エラー: 仕様書ファイルを指定するか、--stdin オプションを使用してください。")
        );
        program.commands.find((c) => c.name() === "generate")?.outputHelp();
        process.exit(1);
        return; // TypeScript の制御フロー解析用
      }

      if (!specText.trim()) {
        console.error(chalk.red("エラー: 仕様書の内容が空です。"));
        process.exit(1);
      }

      // オプションの解決（CLI引数 > 設定ファイル > デフォルト）
      const model: ModelName = (opts.model as ModelName) || config.model || "o3-mini";
      const format: OutputFormat = (opts.format as OutputFormat) || config.format || "playwright";
      const lang: OutputLang = (opts.lang as OutputLang) || config.lang || "ja";

      // APIキーの検証
      try {
        resolveApiKey(opts.apiKey as string | undefined, config.apiKey);
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      // AI生成実行
      const spinner = ora({
        text: chalk.cyan(`テストコードを生成中... (model: ${model}, format: ${format})`),
        spinner: "dots",
      }).start();

      const result = await generateTestFromSpec(specText, {
        model,
        format,
        lang,
        apiKey: opts.apiKey as string | undefined,
      });

      spinner.succeed(
        chalk.green(
          `生成完了！${result.tokensUsed ? ` (トークン使用量: ${result.tokensUsed})` : ""}`
        )
      );

      // 出力
      const outputPath = (opts.output as string) || config.outputDir;
      if (outputPath) {
        const resolvedOutput = path.resolve(outputPath as string);
        const dir = path.dirname(resolvedOutput);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(resolvedOutput, result.content, "utf-8");
        console.log(chalk.green(`✓ 出力先: ${resolvedOutput}`));
      } else {
        // ファイル指定なしの場合は標準出力
        console.log("\n" + result.content);
      }
    } catch (err: unknown) {
      if (err instanceof Spec2TestApiError) {
        console.error(chalk.red(`\nAPIエラー: ${err.message}`));
        if (err.statusCode) {
          console.error(chalk.dim(`ステータスコード: ${err.statusCode}`));
        }
      } else {
        console.error(chalk.red(`\nエラー: ${(err as Error).message}`));
      }
      process.exit(1);
    }
  });

// ===========================================================================
// reverse サブコマンド: ソースコード → 要件定義書
// ===========================================================================
program
  .command("reverse")
  .description("ソースコードファイルから要件定義書（Markdown）を逆生成する")
  .argument("[file]", "ソースコードファイルのパス")
  .option("-o, --output <path>", "出力先ファイルパス")
  .option(
    "-m, --model <model>",
    "AIモデル (o3-mini | gpt-4o | gpt-4o-mini)",
    "o3-mini"
  )
  .option("-l, --lang <lang>", "出力言語 (ja | en)", "ja")
  .option("--stdin", "標準入力からコードを読み取る")
  .option("--api-key <key>", "OpenAI APIキー（環境変数より優先）")
  .action(async (file: string | undefined, opts: Record<string, string | boolean | undefined>) => {
    try {
      const config = await loadConfig();

      let codeText: string;

      if (opts.stdin) {
        codeText = await readStdin();
      } else if (file) {
        const filePath = path.resolve(file);
        if (!fs.existsSync(filePath)) {
          console.error(chalk.red(`エラー: ファイルが見つかりません: ${filePath}`));
          process.exit(1);
        }
        codeText = fs.readFileSync(filePath, "utf-8");
      } else {
        console.error(
          chalk.red("エラー: ソースコードファイルを指定するか、--stdin オプションを使用してください。")
        );
        program.commands.find((c) => c.name() === "reverse")?.outputHelp();
        process.exit(1);
        return;
      }

      if (!codeText.trim()) {
        console.error(chalk.red("エラー: ソースコードの内容が空です。"));
        process.exit(1);
      }

      const model: ModelName = (opts.model as ModelName) || config.model || "o3-mini";
      const lang: OutputLang = (opts.lang as OutputLang) || config.lang || "ja";

      try {
        resolveApiKey(opts.apiKey as string | undefined, config.apiKey);
      } catch (err: unknown) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }

      const spinner = ora({
        text: chalk.cyan(`要件定義書を逆生成中... (model: ${model})`),
        spinner: "dots",
      }).start();

      const result = await reverseSpecFromCode(codeText, {
        model,
        lang,
        apiKey: opts.apiKey as string | undefined,
      });

      spinner.succeed(
        chalk.green(
          `生成完了！${result.tokensUsed ? ` (トークン使用量: ${result.tokensUsed})` : ""}`
        )
      );

      const outputPath = (opts.output as string) || config.outputDir;
      if (outputPath) {
        const resolvedOutput = path.resolve(outputPath as string);
        const dir = path.dirname(resolvedOutput);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(resolvedOutput, result.content, "utf-8");
        console.log(chalk.green(`✓ 出力先: ${resolvedOutput}`));
      } else {
        console.log("\n" + result.content);
      }
    } catch (err: unknown) {
      if (err instanceof Spec2TestApiError) {
        console.error(chalk.red(`\nAPIエラー: ${err.message}`));
        if (err.statusCode) {
          console.error(chalk.dim(`ステータスコード: ${err.statusCode}`));
        }
      } else {
        console.error(chalk.red(`\nエラー: ${(err as Error).message}`));
      }
      process.exit(1);
    }
  });

// ===========================================================================
// init サブコマンド: 設定ファイルの初期化
// ===========================================================================
program
  .command("init")
  .description("プロジェクトに .spec2testrc.json 設定ファイルを作成する")
  .action(() => {
    const configPath = path.resolve(".spec2testrc.json");

    if (fs.existsSync(configPath)) {
      console.log(chalk.yellow(`⚠ 設定ファイルは既に存在します: ${configPath}`));
      return;
    }

    const template = generateConfigTemplate();
    fs.writeFileSync(configPath, JSON.stringify(template, null, 2) + "\n", "utf-8");

    console.log(chalk.green(`✓ 設定ファイルを作成しました: ${configPath}`));
    console.log(chalk.dim("\n内容:"));
    console.log(chalk.dim(JSON.stringify(template, null, 2)));
    console.log(
      chalk.cyan(
        "\n💡 apiKey フィールドにOpenAI APIキーを設定するか、環境変数 OPENAI_API_KEY を設定してください。"
      )
    );
  });

// ===========================================================================
// 標準入力のヘルパー
// ===========================================================================
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk: string) => {
      data += chunk;
    });
    process.stdin.on("end", () => {
      resolve(data);
    });
    process.stdin.on("error", reject);
  });
}

// ===========================================================================
// エントリポイント
// ===========================================================================
program.parse();
