// 生成日: 2026-03-25
// 更新日: 2026-03-25
// 概要: Vitestの設定ファイル。テストパターン、カバレッジプロバイダ、モジュール解決を設定。

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    include: ["src/**/__tests__/**/*.test.ts"],
    exclude: ["**/._*", "**/node_modules/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/__tests__/**", "src/**/index.ts", "**/._*"],
    },
  },
});
