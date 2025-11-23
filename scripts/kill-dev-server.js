#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * 终止开发服务器脚本
 * 1. 加载 .env.local 文件获取 PROFILE 和 PORT
 * 2. 使用 environment-loader 加载 YAML 配置文件
 * 3. 查找占用 PORT 的进程
 * 4. 终止该进程
 */

const { execSync } = require("child_process");
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

console.log(`🔍 查找端口 ${port} 上运行的进程...`);

try {
  // 使用 lsof 查找占用端口的进程 PID
  // -t 选项只返回 PID，-i:PORT 指定端口
  const pidOutput = execSync(`lsof -ti:${port}`, {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();

  if (!pidOutput) {
    console.log(`✅ 端口 ${port} 没有被占用`);
    process.exit(0);
  }

  // 可能有多个进程占用同一端口
  const pids = pidOutput.split("\n").filter((pid) => pid);

  console.log(`📋 找到 ${pids.length} 个进程: ${pids.join(", ")}`);

  // 获取每个进程的详细信息
  pids.forEach((pid) => {
    try {
      const processInfo = execSync(`ps -p ${pid} -o pid,command`, {
        encoding: "utf-8",
      });
      console.log(`\n进程信息:\n${processInfo}`);
    } catch (_error) {
      // 进程可能已经结束
    }
  });

  // 询问用户确认
  console.log(`\n⚠️  准备终止以上进程，是否继续？ (y/N)`);

  // 在脚本中直接终止，不需要用户交互
  // 如果需要用户确认，可以使用 readline 模块
  const shouldKill =
    process.argv.includes("--force") || process.argv.includes("-f");

  if (!shouldKill) {
    console.log(`ℹ️  使用 --force 或 -f 参数可以跳过确认直接终止进程`);
    console.log(`\n取消操作`);
    process.exit(0);
  }

  // 终止所有找到的进程
  pids.forEach((pid) => {
    try {
      console.log(`\n🔪 正在终止进程 ${pid}...`);
      execSync(`kill ${pid}`);
      console.log(`✅ 进程 ${pid} 已终止`);
    } catch (error) {
      console.error(`❌ 终止进程 ${pid} 失败:`, error.message);

      // 尝试强制终止
      try {
        console.log(`🔪 尝试强制终止进程 ${pid}...`);
        execSync(`kill -9 ${pid}`);
        console.log(`✅ 进程 ${pid} 已强制终止`);
      } catch (forceError) {
        console.error(`❌ 强制终止进程 ${pid} 失败:`, forceError.message);
      }
    }
  });

  console.log(`\n✅ 端口 ${port} 上的服务已终止`);
} catch (error) {
  // lsof 命令失败（通常是因为没有进程占用端口）
  if (error.status === 1 && !error.stdout && !error.stderr) {
    console.log(`✅ 端口 ${port} 没有被占用`);
    process.exit(0);
  }

  console.error(`❌ 查找或终止进程时出错:`, error.message);
  process.exit(1);
}
