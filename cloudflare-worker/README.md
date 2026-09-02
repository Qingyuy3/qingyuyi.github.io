# 课程助教 Cloudflare Worker

这个目录保存 GitHub 课程网站的 Mini TA 服务器端代码。它负责安全保存 DeepSeek API Key、检索课程资料、调用 DeepSeek，并把中文答案返回给网页。

## 文件位置

- `src/index.ts`：课程助教接口、课程资料检索、CORS 和请求大小限制。
- `wrangler.jsonc`：Cloudflare Worker 名称、运行环境和非敏感配置。
- `src/env.d.ts`：由 Wrangler 根据配置自动生成的运行环境类型。
- DeepSeek Key：仅保存为 Cloudflare Secret，不能写入本目录或 GitHub。

## 对外接口

- `GET /health`：检查 Worker 是否可以访问。
- `POST /api/ta`：接收课程问题并返回 AI 回答和相关资料编号。

## 发布顺序

1. 先部署 Worker 并访问 `/health`。
2. 将 `DEEPSEEK_API_KEY` 保存为 Cloudflare Secret。
3. 从 GitHub 页面发送一条简短问题，检查 CORS 和 DeepSeek 回答。
4. 确认成功后，在 `components/ai-assistant.tsx` 中把远程接口地址替换为 Worker 的 `/api/ta` 地址。

当前只允许 `https://qingyuy3.github.io`、`http://localhost:3000` 和 `http://127.0.0.1:3000` 访问。Cloudflare 原生限流将课程助教限制为每个边缘位置每分钟 20 次请求，用于控制演示费用。

