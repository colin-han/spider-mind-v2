#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * 开发服务器启动脚本
 * 1. 加载 .env.local 文件获取 PROFILE 和 PORT
 * 2. 使用 environment-loader 加载 YAML 配置文件
 * 3. 将所有配置注入到 process.env
 * 4. 启动 Next.js 开发服务器
 */

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// 加载环境变量文件
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  lines.forEach((line) => {
    // 忽略注释和空行
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    // 解析 KEY=VALUE 格式
    const match = trimmedLine.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();

      // 只设置尚未设置的环境变量
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// 项目根目录
const rootDir = path.resolve(__dirname, "..");

// 1. 首先加载 .env 文件（获取 PROFILE 和 PORT）
loadEnvFile(path.join(rootDir, ".env.local"));
loadEnvFile(path.join(rootDir, ".env"));

// 2. 使用 environment-loader 加载 YAML 配置文件
try {
  // 注册 ts-node 以支持 TypeScript 模块
  require("ts-node/register/transpile-only");

  const {
    loadEnvironmentVariables,
  } = require("../src/lib/config/environment-loader.ts");

  const yamlConfig = loadEnvironmentVariables();

  // 将 YAML 配置注入到 process.env
  Object.entries(yamlConfig).forEach(([key, value]) => {
    // 不覆盖已存在的环境变量（保持优先级）
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  console.log(
    `✅ 已加载环境配置 (PROFILE: ${process.env["PROFILE"] || "local"})`
  );
} catch (error) {
  console.warn("⚠️  警告: 无法加载 YAML 配置文件:", error.message);
  console.warn("将继续使用 process.env 中已有的环境变量");
}

// 获取端口号，默认为 13000
const port = process.env.PORT || "13000";

// 从命令行参数中获取额外的选项（如 --turbo）
const extraArgs = process.argv.slice(2);

// 构建 Next.js 命令参数
const args = ["dev", "-p", port, ...extraArgs];

console.log(`🚀 启动开发服务器，端口: ${port}`);

// 启动 Next.js 开发服务器
const child = spawn("next", args, {
  stdio: "inherit",
  shell: true,
  cwd: rootDir,
});

// 处理进程退出
child.on("exit", (code) => {
  process.exit(code || 0);
});

// 处理 Ctrl+C
process.on("SIGINT", () => {
  child.kill("SIGINT");
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
});
