import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// 加载 Next.js 环境变量（包括 .env.local）
loadEnvConfig(process.cwd());

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试目录
  testDir: "./tests/e2e",

  // 每个测试的超时时间（30秒）
  timeout: 30 * 1000,

  // 并行运行所有测试
  fullyParallel: true,

  // CI 环境下失败时不允许重试，本地开发允许
  forbidOnly: !!process.env["CI"],

  // CI 环境下失败重试次数，本地开发不重试
  retries: process.env["CI"] ? 2 : 0,

  // CI 环境下限制并行进程数，本地使用 CPU 核心数的一半
  workers: process.env["CI"] ? 1 : 2,

  // 测试报告配置
  reporter: [
    ["html", { outputFolder: "./playwright-report", open: "never" }],
    ["json", { outputFile: "./test-results/results.json" }],
    process.env["CI"] ? ["github"] : ["list"],
  ],

  // 全局测试配置
  use: {
    // 基础 URL，开发环境默认端口
    baseURL: process.env["PLAYWRIGHT_BASE_URL"] || "http://localhost:3000",

    // 失败时收集 trace 信息
    trace: "on-first-retry",

    // 失败时截图
    screenshot: "only-on-failure",

    // 失败时录制视频
    video: "retain-on-failure",

    // 浏览器视口大小
    viewport: { width: 1280, height: 720 },

    // 忽略 HTTPS 证书错误（开发环境）
    ignoreHTTPSErrors: true,

    // 等待元素出现的默认超时时间
    actionTimeout: 10 * 1000,

    // 等待导航完成的超时时间
    navigationTimeout: 15 * 1000,
  },

  // 测试项目配置 - 多浏览器支持
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Chrome 特定配置
        launchOptions: {
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
          ],
        },
      },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    // 移动设备测试
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },

    // 针对不同屏幕尺寸的测试
    {
      name: "Desktop Large",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],

  // 开发服务器配置
  // 注释掉，因为已经手动启动了服务器
  // webServer: {
  //   command: "yarn dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env["CI"],
  //   timeout: 120 * 1000,
  //   env: {
  //     NODE_ENV: "test",
  //   },
  // },

  // 输出目录配置
  outputDir: "./test-results/",

  // 全局设置 - 在本地开发时可以启用
  // globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  // globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),

  // 期望配置
  expect: {
    // 断言超时时间
    timeout: 5 * 1000,

    // 截图比较阈值
    toHaveScreenshot: {
      threshold: 0.3,
      animations: "disabled",
    },

    // 视觉比较阈值
    toMatchSnapshot: {
      threshold: 0.3,
    },
  },

  // 测试文件匹配模式
  testMatch: ["**/*.spec.ts", "**/*.test.ts", "**/*.e2e.ts"],

  // 忽略文件
  testIgnore: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
});
