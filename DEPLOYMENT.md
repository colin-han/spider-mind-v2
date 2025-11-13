# 🚀 快速部署到 Vercel

## 前置条件

- ✅ GitHub 账号
- ✅ Vercel 账号（https://vercel.com）
- ✅ Supabase 账号（https://supabase.com）

## 三步部署

### 1️⃣ 配置 Supabase

```bash
# 创建项目并运行 migration
supabase login
supabase link --project-ref your-project-ref
supabase db push

# 获取 API 密钥
# Dashboard → Settings → API
# 复制: Project URL 和 anon public key
```

### 2️⃣ 推送到 GitHub

```bash
# 提交代码
git add .
git commit -m "feat: 准备 Vercel 部署"

# 推送到 GitHub
git push origin main
```

### 3️⃣ 部署到 Vercel

1. 访问 https://vercel.com/new
2. Import Git Repository → 选择你的仓库
3. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL` = 你的 Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = 你的 Supabase Key
4. 点击 Deploy

**完成！** 🎉

---

## 📚 详细文档

- [完整部署指南](./.claude/logs/2025-11-10-vercel-deployment-guide.md)
- [成本对比分析](./.claude/logs/2025-11-10-deployment-options.md)
- [阿里云 FC 方案](./.claude/logs/2025-11-10-aliyun-fc-deployment.md)

---

## 🌍 区域选择

默认配置使用香港节点 (`hkg1`)，距离中国最近。

可选节点（修改 `vercel.json`）：

- `hkg1` - 香港 ⭐ 推荐
- `sin1` - 新加坡
- `icn1` - 首尔
- `hnd1` - 东京

---

## 💰 成本

**免费版**:

- 100 GB 带宽/月
- 无限部署
- 适合个人项目

**Pro 版** ($20/月):

- 1 TB 带宽/月
- 无冷启动
- 团队协作

---

## ⚡ 性能优化

已配置：

- ✅ Edge CDN
- ✅ 自动 HTTPS
- ✅ 图片优化
- ✅ 代码分割
- ✅ 香港节点

---

## 🔧 故障排查

### 构建失败？

```bash
# 本地测试构建
yarn build

# 检查类型错误
yarn type-check

# 检查代码规范
yarn lint
```

### 环境变量错误？

1. 检查变量名是否正确（区分大小写）
2. 确保在 Production 环境已勾选
3. 重新部署

---

## 📞 获取帮助

- Vercel 文档: https://vercel.com/docs
- Next.js 文档: https://nextjs.org/docs
- Supabase 文档: https://supabase.com/docs

---

**部署时间**: < 5 分钟
**成本**: 免费
**难度**: ⭐☆☆☆☆

祝部署顺利！🎉
