const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("./tsconfig.json");

/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "jsdom",

  // 模块解析配置
  moduleNameMapper: {
    ...pathsToModuleNameMapper(compilerOptions.paths || {}, {
      prefix: "<rootDir>/",
    }),
    // 处理 CSS 和静态资源文件
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "\\.(gif|ttf|eot|svg|png|jpg|jpeg|webp)$":
      "<rootDir>/__mocks__/fileMock.js",
  },

  // 测试文件匹配模式
  testMatch: [
    "<rootDir>/**/__tests__/**/*.{ts,tsx}",
    "<rootDir>/**/*.(test|spec).{ts,tsx}",
  ],

  // 忽略的文件和目录
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/out/",
    "<rootDir>/.claude/",
    "<rootDir>/tests/e2e/",
  ],

  // 模块搜索路径
  moduleDirectories: ["node_modules", "<rootDir>/"],

  // 文件扩展名
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // 转换配置
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
        },
      },
    ],
  },

  // 设置文件
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // 覆盖率配置
  collectCoverage: false,
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/out/**",
    "!**/__tests__/**",
    "!**/*.test.{ts,tsx}",
    "!**/*.spec.{ts,tsx}",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],

  // 其他配置
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // 测试环境变量
  testEnvironmentOptions: {
    customExportConditions: [""],
  },

  // 全局设置
  globals: {},

  // 详细输出
  verbose: true,

  // 最大并发测试文件数
  maxConcurrency: 5,

  // 测试超时时间
  testTimeout: 30000,
};

module.exports = config;
