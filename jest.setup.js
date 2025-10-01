// Jest 设置文件
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("@testing-library/jest-dom");

// 模拟 Next.js 组件
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("next/image", () => {
  const MockedImage = (props) => {
    const { src, alt, ...rest } = props;
    return Object.assign(document.createElement("img"), {
      src,
      alt,
      ...rest,
    });
  };
  return {
    __esModule: true,
    default: MockedImage,
  };
});

// 模拟环境变量
process.env.NODE_ENV = "test";

// 全局测试配置
global.console = {
  ...console,
  // 在测试中禁用某些日志级别
  warn: jest.fn(),
  error: jest.fn(),
};

// 设置测试数据库连接（如果需要）
beforeAll(async () => {
  // 测试前的全局设置
});

afterAll(async () => {
  // 测试后的全局清理
});

beforeEach(() => {
  // 每个测试前的设置
  jest.clearAllMocks();
});

afterEach(() => {
  // 每个测试后的清理
  jest.clearAllTimers();
});

// 模拟 window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// 模拟 IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}

  disconnect() {
    return null;
  }

  observe() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// 模拟 ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}

  disconnect() {
    return null;
  }

  observe() {
    return null;
  }

  unobserve() {
    return null;
  }
};

// 设置 fetch 模拟（如果需要）
global.fetch = jest.fn();
