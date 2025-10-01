import { test, expect } from "@playwright/test";

/**
 * 认证功能 E2E 测试
 */

// 固定的测试账号（由 scripts/seed-test-users.ts 创建）
const TEST_USER_1 = {
  email: "test_user1@example.com",
  username: "test_user1",
  password: "test123456",
};

const TEST_USER_2 = {
  email: "test_user2@example.com",
  username: "test_user2",
  password: "test123456",
};

// 用于注册测试的动态账号（避免重复）
const timestamp = Date.now();
const testEmail = `test${timestamp}@example.com`;
const testUsername = `t_${timestamp}`;
const testPassword = "test123456";

test.describe("认证功能", () => {
  test.beforeEach(async ({ page }) => {
    // 清除所有 cookies 和 localStorage，确保每个测试都是全新状态
    await page.context().clearCookies();
  });

  test("未登录访问首页应重定向到登录页", async ({ page }) => {
    await page.goto("/");

    // 等待重定向完成
    await page.waitForURL("/login");

    // 验证在登录页
    await expect(page).toHaveURL("/login");
    await expect(page.getByTestId("login-heading")).toBeVisible();
  });

  test("未登录访问 dashboard 应重定向到登录页", async ({ page }) => {
    await page.goto("/dashboard");

    // 等待重定向完成
    await page.waitForURL(/\/login/);

    // 验证在登录页，且有 redirect 参数
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("redirect");
  });

  test("完整的注册流程", async ({ page }) => {
    await page.goto("/login");

    // 点击"立即注册"链接
    await page.getByTestId("signup-link").click();

    // 验证跳转到注册页
    await expect(page).toHaveURL("/signup");
    await expect(page.getByTestId("signup-heading")).toBeVisible();

    // 填写注册表单
    await page.getByTestId("signup-email-input").fill(testEmail);
    await page.getByTestId("signup-username-input").fill(testUsername);
    await page.getByTestId("signup-password-input").fill(testPassword);
    await page.getByTestId("signup-confirm-password-input").fill(testPassword);

    // 提交表单
    await page.getByTestId("signup-submit-button").click();

    // 等待重定向到登录页
    await page.waitForURL("/dashboard", { timeout: 10000 });
  });

  test("注册表单验证", async ({ page }) => {
    await page.goto("/signup");

    // 测试用户名长度验证（少于3个字符）
    await page.getByTestId("signup-email-input").fill("test@example.com");
    await page.getByTestId("signup-username-input").fill("ab"); // 太短
    await page.getByTestId("signup-password-input").fill("123456");
    await page.getByTestId("signup-confirm-password-input").fill("123456");
    await page.getByTestId("signup-submit-button").click();

    await expect(
      page.getByText(/用户名长度必须在 3-20 个字符之间/)
    ).toBeVisible();

    // 测试用户名格式验证（包含非法字符）
    await page.getByTestId("signup-username-input").fill("test@user"); // 包含 @
    await page.getByTestId("signup-submit-button").click();

    await expect(
      page.getByText(/用户名只能包含字母、数字和下划线/)
    ).toBeVisible();

    // 测试密码长度验证
    await page.getByTestId("signup-username-input").fill("validuser");
    await page.getByTestId("signup-password-input").fill("12345"); // 太短
    await page.getByTestId("signup-confirm-password-input").fill("12345");
    await page.getByTestId("signup-submit-button").click();

    await expect(page.getByText(/密码长度至少为 6 个字符/)).toBeVisible();

    // 测试密码不匹配
    await page.getByTestId("signup-password-input").fill("123456");
    await page.getByTestId("signup-confirm-password-input").fill("123457"); // 不匹配
    await page.getByTestId("signup-submit-button").click();

    await expect(page.getByText(/两次输入的密码不一致/)).toBeVisible();
  });

  test("登录功能", async ({ page }) => {
    await page.goto("/login");

    // 使用固定测试账号
    await page.getByTestId("login-email-input").fill(TEST_USER_1.email);
    await page.getByTestId("login-password-input").fill(TEST_USER_1.password);

    // 提交表单
    await page.getByTestId("login-submit-button").click();

    // 等待重定向到 dashboard
    await page.waitForURL("/dashboard", { timeout: 10000 });

    // 验证在 dashboard
    await expect(page.getByTestId("dashboard-welcome-heading")).toBeVisible();
  });

  test("登录失败处理", async ({ page }) => {
    await page.goto("/login");

    // 使用错误的凭据
    await page.getByTestId("login-email-input").fill("wrong@example.com");
    await page.getByTestId("login-password-input").fill("wrongpassword");

    // 提交表单
    await page.getByTestId("login-submit-button").click();

    // 应该显示错误 toast
    await expect(page.getByText(/登录失败|Invalid/i)).toBeVisible({
      timeout: 5000,
    });

    // 应该仍在登录页
    await expect(page).toHaveURL("/login");
  });

  test("登出功能", async ({ page }) => {
    // 首先登录
    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(TEST_USER_1.email);
    await page.getByTestId("login-password-input").fill(TEST_USER_1.password);
    await page.getByTestId("login-submit-button").click();
    await page.waitForURL("/dashboard", { timeout: 10000 });

    // 点击用户头像打开菜单
    await page.getByTestId("user-menu-button").click();

    // 等待菜单出现
    await expect(page.getByTestId("signout-button")).toBeVisible();

    // 点击退出登录
    await page.getByTestId("signout-button").click();

    // 等待 toast 提示
    await expect(page.getByText("已登出")).toBeVisible({ timeout: 5000 });

    // 应该重定向到登录页
    await page.waitForURL("/login", { timeout: 10000 });

    // 尝试访问 dashboard 应该被重定向
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test("已登录用户访问登录页应重定向到 dashboard", async ({ page }) => {
    // 首先登录
    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(TEST_USER_1.email);
    await page.getByTestId("login-password-input").fill(TEST_USER_1.password);
    await page.getByTestId("login-submit-button").click();
    await page.waitForURL("/dashboard", { timeout: 10000 });

    // 尝试访问登录页
    await page.goto("/login");

    // 应该被重定向到 dashboard
    await page.waitForURL("/dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("会话持久化 - 刷新页面保持登录状态", async ({ page }) => {
    // 首先登录
    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(TEST_USER_1.email);
    await page.getByTestId("login-password-input").fill(TEST_USER_1.password);
    await page.getByTestId("login-submit-button").click();
    await page.waitForURL("/dashboard", { timeout: 10000 });

    // 验证在 dashboard
    await expect(page.getByTestId("dashboard-welcome-heading")).toBeVisible();

    // 刷新页面
    await page.reload();

    // 应该仍然在 dashboard（而不是被重定向到登录页）
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByTestId("dashboard-welcome-heading")).toBeVisible();
  });

  test("登录/注册页面切换", async ({ page }) => {
    await page.goto("/login");

    // 验证在登录页
    await expect(page.getByTestId("login-heading")).toBeVisible();

    // 点击"立即注册"
    await page.getByTestId("signup-link").click();

    // 验证在注册页
    await expect(page).toHaveURL("/signup");
    await expect(page.getByTestId("signup-heading")).toBeVisible();

    // 点击"立即登录"
    await page.getByTestId("login-link").click();

    // 验证回到登录页
    await expect(page).toHaveURL("/login");
    await expect(page.getByTestId("login-heading")).toBeVisible();
  });

  test("Loading 状态显示", async ({ page }) => {
    await page.goto("/login");

    // 使用固定测试账号
    await page.getByTestId("login-email-input").fill(TEST_USER_2.email);
    await page.getByTestId("login-password-input").fill(TEST_USER_2.password);

    // 提交表单
    const submitButton = page.getByTestId("login-submit-button");
    await submitButton.click();

    // 验证按钮显示 loading 状态（按钮应该被禁用且显示加载动画）
    await expect(submitButton).toBeDisabled();

    // 等待请求完成
    await page.waitForURL("/dashboard", { timeout: 10000 });
  });
});

/**
 * Dashboard 页面测试
 */
test.describe("Dashboard 页面", () => {
  test.beforeEach(async ({ page }) => {
    // 在每个测试前登录（使用 TEST_USER_1）
    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(TEST_USER_1.email);
    await page.getByTestId("login-password-input").fill(TEST_USER_1.password);
    await page.getByTestId("login-submit-button").click();
    await page.waitForURL("/dashboard", { timeout: 10000 });
  });

  test("Dashboard 页面元素正确显示", async ({ page }) => {
    // 验证导航栏
    await expect(page.getByTestId("navbar-logo")).toBeVisible();

    // 验证用户头像
    await expect(page.getByTestId("user-avatar")).toBeVisible();

    // 验证欢迎标题
    await expect(page.getByTestId("dashboard-welcome-heading")).toBeVisible();

    // 验证用户邮箱显示
    await expect(page.getByTestId("dashboard-user-email")).toContainText(
      TEST_USER_1.email
    );

    // 验证三个功能卡片
    await expect(page.getByTestId("dashboard-card-quickstart")).toBeVisible();
    await expect(page.getByTestId("dashboard-card-recent")).toBeVisible();
    await expect(page.getByTestId("dashboard-card-graph")).toBeVisible();
  });

  test("用户菜单交互", async ({ page }) => {
    // 点击用户头像
    await page.getByTestId("user-menu-button").click();

    // 验证菜单显示
    await expect(page.getByTestId("user-email-display")).toBeVisible();
    await expect(page.getByTestId("signout-button")).toBeVisible();

    // 点击菜单外部关闭菜单
    await page.getByTestId("dashboard-content").click();

    // 验证菜单已关闭
    await expect(page.getByTestId("signout-button")).not.toBeVisible();
  });
});
