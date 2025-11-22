/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Next.js 配置文件
 *
 * 在配置加载前，先从 YAML 文件加载环境变量并注入到 process.env
 * 这样 Next.js 在构建时就能访问到这些变量
 */

// 1. 加载环境变量（如果存在 .env.local）
const fs = require("fs");
const path = require("path");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// 加载 .env.local
loadDotEnv(path.join(__dirname, ".env.local"));

// 2. 加载 YAML 配置
try {
  require("ts-node/register/transpile-only");
  const {
    loadEnvironmentVariables,
  } = require("./src/lib/config/environment-loader.ts");

  const yamlConfig = loadEnvironmentVariables();

  // 将 YAML 配置注入到 process.env（不覆盖已存在的值）
  Object.entries(yamlConfig).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });

  console.log(
    `✅ Next.js config: 已加载环境配置 (PROFILE: ${process.env.PROFILE || "local"})`
  );

  // 调试：检查关键变量是否存在
  const criticalVars = [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  console.log("🔍 Next.js config: 检查关键环境变量:");
  criticalVars.forEach((key) => {
    const value = process.env[key];
    if (value) {
      const display =
        value.length > 50 ? value.substring(0, 50) + "..." : value;
      console.log(`   ✅ ${key}: ${display}`);
    } else {
      console.log(`   ❌ ${key}: undefined`);
    }
  });
} catch (error) {
  console.warn("⚠️  警告: next.config.js 无法加载 YAML 配置:", error.message);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用 TypeScript 严格模式
  typescript: {
    // 在构建时检查 TypeScript 错误
    ignoreBuildErrors: false,
  },

  // ESLint 配置
  eslint: {
    // 在构建时检查 ESLint 错误
    ignoreDuringBuilds: false,
  },

  // TypeScript 路由类型支持
  typedRoutes: true,

  // 服务端外部包配置
  serverExternalPackages: [],

  // 实验性功能配置
  experimental: {
    // 优化包导入
    optimizePackageImports: ["@supabase/supabase-js"],
  },

  // 编译器配置
  compiler: {
    // 移除生产环境中的 console.log
    removeConsole: process.env.NODE_ENV === "production",
  },

  // 图片优化配置
  images: {
    // 允许的图片域名（添加 Supabase 域名）
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
    // 图片格式优化
    formats: ["image/webp", "image/avif"],
    // 设备尺寸配置
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // 图片尺寸配置
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // 性能优化配置
  poweredByHeader: false, // 移除 X-Powered-By 头部
  generateEtags: false, // 禁用 ETags 生成

  // 环境变量配置
  // 注意: NEXT_PUBLIC_* 变量会自动暴露给客户端
  // 但为了确保它们在所有情况下都可用，我们在这里显式声明
  env: {
    // 从 YAML 配置加载的公共变量
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
    NEXT_PUBLIC_DEFAULT_AI_MODEL: process.env.NEXT_PUBLIC_DEFAULT_AI_MODEL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_ENABLE_DEBUG: process.env.NEXT_PUBLIC_ENABLE_DEBUG,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENV_NAME: process.env.NEXT_PUBLIC_ENV_NAME,
  },

  // 重写规则配置
  async rewrites() {
    return [];
  },

  // 重定向规则配置
  async redirects() {
    return [];
  },

  // 头部配置
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  // Webpack 配置
  webpack: (config, { isServer }) => {
    // 客户端构建时,排除服务端专用模块
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = config.resolve.fallback || {};

      // 阻止在客户端打包 Node.js 模块
      config.resolve.fallback.fs = false;
      config.resolve.fallback.path = false;
      config.resolve.fallback["server-only"] = false;
    }

    return config;
  },

  // 跟踪文件配置
  trailingSlash: false,

  // 输出配置说明：
  // - Vercel 部署：不需要任何 output 配置
  // - Docker 部署：使用 output: 'standalone'
  // - 静态托管 (OSS/CDN)：使用 output: 'export'（需移除 Server Actions）
};

module.exports = nextConfig;
