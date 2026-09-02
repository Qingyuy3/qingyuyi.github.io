# 课程助教公网入口

这个目录保存中国网络可访问的 `pages.dev` 公网入口。入口不保存 DeepSeek Key，也不直接调用 DeepSeek；它通过 Cloudflare Service Binding（服务绑定）在 Cloudflare 内部调用 `cloudflare-worker/` 中的课程助教 Worker。

## 文件位置

- `functions/api/ta.ts`：转发课程提问。
- `functions/health.ts`：转发健康检查。
- `public/index.html`：接口根地址的简单说明页。
- `wrangler.jsonc`：Pages 项目和内部 Worker 服务绑定。

课程资料检索、限流、CORS、DeepSeek 调用和 Secret 仍统一维护在 `cloudflare-worker/` 中，避免出现两份课程逻辑。

