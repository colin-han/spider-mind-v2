/**
 * 环境变量加载器 (仅服务端)
 *
 * 配置加载优先级 (从高到低):
 * 1. 平台环境变量 (process.env - Vercel/系统设置的)
 * 2. environments.secrets.yaml (本地开发, gitignored)
 * 3. environments.yaml (公开配置, 提交到 Git)
 * 4. .env.local (仅 PROFILE 和 PORT)
 *
 * 注意: 此模块使用 Node.js fs/path,仅能在服务端使用
 * 客户端代码通过 Next.js 自动注入的 process.env 访问环境变量
 *
 * webpack 配置 (next.config.js) 会阻止此模块被打包到客户端 bundle
 *
 * @module environment-loader
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";

/**
 * 环境配置类型定义
 */
interface EnvironmentConfig {
  env: Record<string, string>;
}

interface EnvironmentsYaml {
  common?: EnvironmentConfig;
  local?: EnvironmentConfig;
  development?: EnvironmentConfig;
  production?: EnvironmentConfig;
}

/**
 * 支持的环境类型
 */
type Profile = "local" | "development" | "production";

/**
 * 获取项目根目录
 */
function getProjectRoot(): string {
  // 在 Next.js 项目中, process.cwd() 返回项目根目录
  return process.cwd();
}

/**
 * 从 YAML 文件加载配置
 */
function loadYamlConfig(filePath: string): EnvironmentsYaml | null {
  try {
    if (!existsSync(filePath)) {
      return null;
    }

    const fileContents = readFileSync(filePath, "utf8");
    const config = yaml.load(fileContents) as EnvironmentsYaml;
    return config;
  } catch (error) {
    console.warn(`Failed to load config from ${filePath}:`, error);
    return null;
  }
}

/**
 * 获取当前环境配置档案
 */
function getProfile(): Profile {
  // 优先从环境变量读取
  const profileFromEnv = process.env["PROFILE"] as Profile | undefined;

  if (
    profileFromEnv &&
    ["local", "development", "production"].includes(profileFromEnv)
  ) {
    return profileFromEnv;
  }

  // 如果在 Vercel 环境中, 默认使用 production
  if (process.env["VERCEL"]) {
    return "production";
  }

  // 根据 NODE_ENV 推断
  const nodeEnv = process.env["NODE_ENV"];
  if (nodeEnv === "production") {
    return "production";
  } else if (nodeEnv === "development") {
    return "local";
  }

  // 默认使用 local
  return "local";
}

/**
 * 展开字符串中的环境变量
 * 支持 ${VAR_NAME} 和 $VAR_NAME 两种格式
 *
 * @param value - 要展开的字符串
 * @param env - 环境变量对象（默认使用 process.env）
 * @returns 展开后的字符串
 *
 * @example
 * expandEnvVars("http://localhost:${PORT}", { PORT: "3000" })
 * // => "http://localhost:3000"
 */
function expandEnvVars(
  value: string,
  env: Record<string, string | undefined> = process.env
): string {
  // 替换 ${VAR_NAME} 格式
  let result = value.replace(/\$\{([^}]+)\}/g, (_, varName) => {
    return env[varName] || "";
  });

  // 替换 $VAR_NAME 格式（不包含在花括号中的）
  result = result.replace(/\$([A-Z_][A-Z0-9_]*)/g, (_, varName) => {
    return env[varName] || "";
  });

  return result;
}

/**
 * 展开配置对象中所有字符串值的环境变量
 *
 * @param config - 配置对象
 * @param env - 环境变量对象
 * @returns 展开后的配置对象
 */
function expandConfigVars(
  config: Record<string, string>,
  env: Record<string, string | undefined> = process.env
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(config)) {
    result[key] = expandEnvVars(value, env);
  }

  return result;
}

/**
 * 合并配置对象
 * 后面的配置会覆盖前面的配置
 */
function mergeConfigs(
  ...configs: (Record<string, string> | undefined)[]
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const config of configs) {
    if (config) {
      Object.assign(result, config);
    }
  }

  return result;
}

/**
 * 从 YAML 配置中提取指定环境的配置
 */
function extractEnvConfig(
  yamlConfig: EnvironmentsYaml | null,
  profile: Profile
): Record<string, string> {
  if (!yamlConfig) {
    return {};
  }

  // 合并 common 和 profile 特定的配置
  const commonEnv = yamlConfig.common?.env || {};
  const profileEnv = yamlConfig[profile]?.env || {};

  return mergeConfigs(commonEnv, profileEnv);
}

/**
 * 加载所有环境变量
 *
 * 配置加载流程:
 * 1. 加载 YAML 配置文件
 * 2. 合并 common + profile 配置
 * 3. 展开环境变量（${VAR} 格式）
 * 4. 应用 process.env 优先级
 *
 * @returns 合并后的环境变量配置
 */
export function loadEnvironmentVariables(): Record<string, string> {
  const projectRoot = getProjectRoot();
  const profile = getProfile();

  // 1. 加载公开配置 (environments.yaml)
  const publicConfigPath = join(projectRoot, "environments.yaml");
  const publicConfig = loadYamlConfig(publicConfigPath);
  const publicEnv = extractEnvConfig(publicConfig, profile);

  // 2. 加载敏感配置 (environments.secrets.yaml) - 仅本地开发
  const secretsConfigPath = join(projectRoot, "environments.secrets.yaml");
  const secretsConfig = loadYamlConfig(secretsConfigPath);
  const secretsEnv = extractEnvConfig(secretsConfig, profile);

  // 3. 合并配置 (优先级: secrets > public)
  const mergedConfig = mergeConfigs(publicEnv, secretsEnv);

  // 4. 展开环境变量（支持 ${VAR} 和 $VAR 格式）
  // 这一步会将配置中的 ${PORT} 等替换为 process.env 中的实际值
  const expandedConfig = expandConfigVars(mergedConfig, process.env);

  // 5. 平台环境变量优先 (process.env 中已存在的值不会被覆盖)
  const finalConfig: Record<string, string> = {};

  for (const [key, value] of Object.entries(expandedConfig)) {
    // 如果环境变量已经在 process.env 中存在,使用 process.env 的值
    finalConfig[key] = process.env[key] || value;
  }

  // 6. 添加 PROFILE 和 PORT (如果 process.env 中有)
  if (process.env["PROFILE"]) {
    finalConfig["PROFILE"] = process.env["PROFILE"];
  } else {
    finalConfig["PROFILE"] = profile;
  }

  if (process.env["PORT"]) {
    finalConfig["PORT"] = process.env["PORT"];
  }

  return finalConfig;
}

/**
 * 获取单个环境变量
 */
export function getEnvironmentVariable(key: string): string | undefined {
  // 优先从 process.env 读取 (平台环境变量)
  if (process.env[key]) {
    return process.env[key];
  }

  // 从配置文件加载
  const config = loadEnvironmentVariables();
  return config[key];
}

/**
 * 获取当前环境配置档案名称
 */
export function getCurrentProfile(): Profile {
  return getProfile();
}

/**
 * 验证必需的环境变量是否存在
 */
export function validateRequiredEnvVars(requiredVars: string[]): void {
  const config = loadEnvironmentVariables();
  const missing: string[] = [];

  for (const varName of requiredVars) {
    if (!config[varName]) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
        `Current profile: ${getCurrentProfile()}\n` +
        `Please check your environments.yaml and environments.secrets.yaml files.`
    );
  }
}
