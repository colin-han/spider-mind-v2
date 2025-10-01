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
    // 允许的图片域名
    domains: [],
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
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
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

  // 注意：Webpack 配置已移除，因为：
  // 1. Turbopack (--turbo) 内置了代码分割和其他优化
  // 2. Next.js 15 的默认配置已经足够优化
  // 3. 移除此配置可消除 Turbopack 警告

  // 输出配置
  output: "standalone",

  // 跟踪文件配置
  trailingSlash: false,

  // 静态导出配置（如需要）
  // output: 'export',
  // distDir: 'dist',
  // trailingSlash: true,
  // skipTrailingSlashRedirect: true,
  // images: { unoptimized: true },
};

module.exports = nextConfig;
