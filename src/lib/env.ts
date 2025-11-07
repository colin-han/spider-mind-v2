/**
 * 环境变量验证和配置工具
 *
 * 此模块提供了用于验证和获取应用程序所需环境变量的实用函数。
 * 它确保所有必要的配置都已正确设置，并提供类型安全的环境变量访问。
 */

/**
 * 必需的环境变量接口定义
 */
interface RequiredEnvVars {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
  NEXT_PUBLIC_DEFAULT_AI_MODEL: string;
}

/**
 * 可选的环境变量接口定义
 */
interface OptionalEnvVars {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  DATABASE_URL?: string;
  NODE_ENV?: "development" | "production" | "test";
}

/**
 * 完整的环境变量接口定义
 */
export interface EnvConfig extends RequiredEnvVars, OptionalEnvVars {}

/**
 * 环境变量验证错误类
 */
export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvValidationError";
  }
}

/**
 * 验证单个环境变量是否存在且非空
 *
 * @param name - 环境变量名称
 * @param value - 环境变量值
 * @throws {EnvValidationError} 当环境变量缺失或为空时抛出错误
 */
function validateEnvVar(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") {
    throw new EnvValidationError(
      `Missing required environment variable: ${name}. Please check your .env.local file.`
    );
  }
  return value.trim();
}

/**
 * 验证环境变量的值是否为有效的 URL
 *
 * @param name - 环境变量名称
 * @param value - 环境变量值
 * @throws {EnvValidationError} 当 URL 格式无效时抛出错误
 */
function validateUrl(name: string, value: string): string {
  try {
    new URL(value);
    return value;
  } catch {
    throw new EnvValidationError(
      `Invalid URL format for environment variable: ${name}. Value: ${value}`
    );
  }
}

/**
 * 验证 Supabase URL 格式
 *
 * @param url - Supabase URL
 * @throws {EnvValidationError} 当 URL 不符合 Supabase 格式时抛出错误
 */
function validateSupabaseUrl(url: string): string {
  const validatedUrl = validateUrl("NEXT_PUBLIC_SUPABASE_URL", url);

  // 检查是否为典型的 Supabase URL 格式
  if (
    !validatedUrl.includes(".supabase.co") &&
    !validatedUrl.includes("localhost")
  ) {
    console.warn(
      `Warning: NEXT_PUBLIC_SUPABASE_URL doesn't appear to be a standard Supabase URL: ${validatedUrl}`
    );
  }

  return validatedUrl;
}

/**
 * 验证 Supabase 匿名密钥格式
 *
 * @param key - Supabase 匿名密钥
 * @throws {EnvValidationError} 当密钥格式无效时抛出错误
 */
function validateSupabaseAnonKey(key: string): string {
  // Supabase 匿名密钥通常是 JWT 格式，包含两个点
  if (!key.includes(".") || key.split(".").length !== 3) {
    throw new EnvValidationError(
      "Invalid NEXT_PUBLIC_SUPABASE_ANON_KEY format. Expected JWT format with two dots."
    );
  }

  return key;
}

/**
 * 验证并获取所有必需的环境变量
 *
 * @returns {EnvConfig} 验证后的环境配置对象
 * @throws {EnvValidationError} 当任何必需的环境变量缺失或无效时抛出错误
 */
export function validateEnvironment(): EnvConfig {
  try {
    // 验证必需的环境变量
    const supabaseUrl = validateSupabaseUrl(
      validateEnvVar(
        "NEXT_PUBLIC_SUPABASE_URL",
        process.env["NEXT_PUBLIC_SUPABASE_URL"]
      )
    );

    const supabaseAnonKey = validateSupabaseAnonKey(
      validateEnvVar(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
      )
    );

    const siteUrl = validateUrl(
      "NEXT_PUBLIC_SITE_URL",
      validateEnvVar(
        "NEXT_PUBLIC_SITE_URL",
        process.env["NEXT_PUBLIC_SITE_URL"]
      )
    );

    // 获取可选的环境变量
    const supabaseServiceRoleKey =
      process.env["SUPABASE_SERVICE_ROLE_KEY"] || undefined;
    const databaseUrl = process.env["DATABASE_URL"] || undefined;
    const nodeEnv =
      (process.env["NODE_ENV"] as "development" | "production" | "test") ||
      "development";

    return {
      NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey,
      NEXT_PUBLIC_SITE_URL: siteUrl,
      ...(supabaseServiceRoleKey && {
        SUPABASE_SERVICE_ROLE_KEY: supabaseServiceRoleKey,
      }),
      ...(databaseUrl && { DATABASE_URL: databaseUrl }),
      NODE_ENV: nodeEnv,
      NEXT_PUBLIC_DEFAULT_AI_MODEL: validateEnvVar(
        "NEXT_PUBLIC_DEFAULT_AI_MODEL",
        process.env["NEXT_PUBLIC_DEFAULT_AI_MODEL"]
      ),
    };
  } catch (error) {
    if (error instanceof EnvValidationError) {
      throw error;
    }
    throw new EnvValidationError(
      `Environment validation failed: ${String(error)}`
    );
  }
}

/**
 * 获取验证后的环境配置（缓存单例）
 */
let cachedEnv: EnvConfig | null = null;

export function getEnvConfig(): EnvConfig {
  if (cachedEnv === null) {
    cachedEnv = validateEnvironment();
  }
  return cachedEnv;
}

/**
 * 检查是否在开发环境中运行
 */
export function isDevelopment(): boolean {
  return getEnvConfig().NODE_ENV === "development";
}

/**
 * 检查是否在生产环境中运行
 */
export function isProduction(): boolean {
  return getEnvConfig().NODE_ENV === "production";
}

/**
 * 检查是否在测试环境中运行
 */
export function isTest(): boolean {
  return getEnvConfig().NODE_ENV === "test";
}

/**
 * 获取 Supabase 配置对象
 */
export function getSupabaseConfig(): {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
} {
  const env = getEnvConfig();
  const config: {
    url: string;
    anonKey: string;
    serviceRoleKey?: string;
  } = {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    config.serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  }

  return config;
}

// 在模块加载时进行基础验证（仅在非测试环境中）
if (
  typeof window !== "undefined" ||
  (!isTest() && process.env.NODE_ENV !== "test")
) {
  try {
    validateEnvironment();
  } catch (error) {
    console.error("Environment validation failed:", error);
    // 在开发环境中，我们希望应用程序继续运行以便开发者可以看到错误
    if (isProduction()) {
      throw error;
    }
  }
}
