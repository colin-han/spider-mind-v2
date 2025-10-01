#!/usr/bin/env node

/**
 * 环境检查脚本
 * 检查开发环境的配置和依赖是否正确
 */

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// 颜色定义
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

// 日志函数
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
};

class EnvironmentChecker {
  constructor() {
    this.issues = [];
    this.warnings = [];
  }

  // 检查 Node.js 版本
  checkNodeVersion() {
    log.info("检查 Node.js 版本...");
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.substring(1).split(".")[0]);

    if (majorVersion >= 18) {
      log.success(`Node.js 版本: ${nodeVersion} ✓`);
    } else {
      this.issues.push(`Node.js 版本过低: ${nodeVersion}，需要 >= 18.0.0`);
    }
  }

  // 检查包管理器
  checkPackageManager() {
    log.info("检查包管理器...");
    try {
      const yarnVersion = execSync("yarn --version", {
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
      log.success(`Yarn 版本: v${yarnVersion} ✓`);

      // 检查是否使用了正确的包管理器
      if (fs.existsSync("yarn.lock") && fs.existsSync("package-lock.json")) {
        this.warnings.push(
          "同时存在 yarn.lock 和 package-lock.json，建议只使用一种包管理器"
        );
      }
    } catch (error) {
      this.issues.push("Yarn 未安装或无法执行");
    }
  }

  // 检查环境变量文件
  checkEnvironmentFiles() {
    log.info("检查环境变量文件...");

    const envFiles = [".env.local", ".env.local.example"];
    const existingFiles = envFiles.filter((file) => fs.existsSync(file));

    if (existingFiles.includes(".env.local")) {
      log.success(".env.local 存在 ✓");

      // 检查环境变量内容
      const envContent = fs.readFileSync(".env.local", "utf8");
      const requiredVars = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ];

      const missingVars = requiredVars.filter(
        (varName) => !envContent.includes(varName)
      );
      if (missingVars.length > 0) {
        this.warnings.push(`缺少环境变量: ${missingVars.join(", ")}`);
      }
    } else {
      if (existingFiles.includes(".env.local.example")) {
        this.warnings.push(".env.local 不存在，请从 .env.local.example 复制");
      } else {
        this.warnings.push("环境变量文件缺失");
      }
    }
  }

  // 检查关键依赖
  checkDependencies() {
    log.info("检查关键依赖...");

    if (!fs.existsSync("node_modules")) {
      this.issues.push("node_modules 不存在，请运行 yarn install");
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
    const criticalDeps = ["next", "react", "@playwright/test", "jest"];

    criticalDeps.forEach((dep) => {
      const isInstalled = fs.existsSync(path.join("node_modules", dep));
      if (isInstalled) {
        log.success(`${dep} 已安装 ✓`);
      } else {
        this.issues.push(`关键依赖 ${dep} 未安装`);
      }
    });
  }

  // 检查 TypeScript 配置
  checkTypeScriptConfig() {
    log.info("检查 TypeScript 配置...");

    if (fs.existsSync("tsconfig.json")) {
      log.success("tsconfig.json 存在 ✓");

      try {
        const tsconfigContent = fs.readFileSync("tsconfig.json", "utf8");
        JSON.parse(tsconfigContent); // 验证 JSON 格式
        log.success("tsconfig.json 格式正确 ✓");
      } catch (error) {
        this.issues.push("tsconfig.json 格式错误");
      }
    } else {
      this.issues.push("tsconfig.json 不存在");
    }
  }

  // 检查代码质量工具配置
  checkCodeQualityTools() {
    log.info("检查代码质量工具...");

    const configs = [
      { file: ".eslintrc.json", name: "ESLint" },
      { file: ".prettierrc", name: "Prettier" },
      { file: "jest.config.js", name: "Jest" },
      { file: "playwright.config.ts", name: "Playwright" },
    ];

    configs.forEach(({ file, name }) => {
      if (fs.existsSync(file)) {
        log.success(`${name} 配置存在 ✓`);
      } else {
        this.warnings.push(`${name} 配置文件 ${file} 不存在`);
      }
    });
  }

  // 检查 Git 配置
  checkGitConfig() {
    log.info("检查 Git 配置...");

    if (fs.existsSync(".git")) {
      log.success("Git 仓库初始化 ✓");

      // 检查 Husky
      if (fs.existsSync(".husky")) {
        log.success("Husky Git hooks 配置 ✓");
      } else {
        this.warnings.push("Husky Git hooks 未配置，运行 yarn prepare");
      }

      // 检查 .gitignore
      if (fs.existsSync(".gitignore")) {
        log.success(".gitignore 存在 ✓");
      } else {
        this.warnings.push(".gitignore 不存在");
      }
    } else {
      this.warnings.push("不是 Git 仓库");
    }
  }

  // 检查端口可用性
  checkPortAvailability() {
    log.info("检查默认端口可用性...");

    const net = require("net");
    const ports = [3000, 3001]; // Next.js 常用端口

    ports.forEach((port) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        log.success(`端口 ${port} 可用 ✓`);
      });

      server.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          this.warnings.push(`端口 ${port} 被占用`);
        }
      });
    });
  }

  // 运行所有检查
  async runAllChecks() {
    console.log("🔍 环境检查开始");
    console.log("=================\n");

    this.checkNodeVersion();
    this.checkPackageManager();
    this.checkEnvironmentFiles();
    this.checkDependencies();
    this.checkTypeScriptConfig();
    this.checkCodeQualityTools();
    this.checkGitConfig();
    this.checkPortAvailability();

    // 等待异步检查完成
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 显示结果
    this.showResults();
  }

  // 显示检查结果
  showResults() {
    console.log("\n📋 检查结果");
    console.log("=============");

    if (this.issues.length === 0 && this.warnings.length === 0) {
      log.success("✨ 环境检查完成，未发现问题！");
    } else {
      if (this.issues.length > 0) {
        console.log(`\n${colors.red}严重问题:${colors.reset}`);
        this.issues.forEach((issue) => log.error(issue));
      }

      if (this.warnings.length > 0) {
        console.log(`\n${colors.yellow}警告:${colors.reset}`);
        this.warnings.forEach((warning) => log.warning(warning));
      }

      console.log("\n🔧 建议操作:");
      if (this.issues.length > 0) {
        console.log("1. 解决上述严重问题");
        console.log("2. 运行 yarn dev:setup 重新设置环境");
      }
      if (this.warnings.length > 0) {
        console.log("3. 根据警告信息优化配置");
      }
    }

    console.log("\n💡 提示: 运行 yarn dev:setup 可以自动修复大部分问题");
  }
}

// 主执行
if (require.main === module) {
  const checker = new EnvironmentChecker();
  checker.runAllChecks().catch((error) => {
    log.error(`检查过程中发生错误: ${error.message}`);
    process.exit(1);
  });
}

module.exports = EnvironmentChecker;
