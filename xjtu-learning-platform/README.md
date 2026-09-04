# 智能商务分析与实践 · 在线学习平台源码

西安交通大学管理学院单门课程学习平台。实际使用地址：[进入课程平台](https://xjtu-learning-pilot.pages.dev/)。

此目录是代码与维护说明，不是 GitHub Pages 的登录入口。正式网站运行于 Cloudflare Pages/Workers，账号和教学记录存入 D1，上传的资料与作业存入私有 R2。上传代码到 GitHub 不会自动部署，也不会同步学生数据。

## 从哪里开始

- [平台维护与部署说明](learning-platform/README.md)：教师操作、权限、限额、备份和迁移。
- [课程内容维护指南](docs/内容维护指南.md)：课程目录与静态内容维护。
- `learning-platform/`：真实登录、教师管理、作业、讨论、资料管理、账号导出及后端。
- `components/`、`app/globals.css`：共享页面组件与样式。
- `data/`、`public/`：课程目录、界面资源与原有公开静态课程材料。
- `cloudflare-worker/`：原 Mini TA 服务；API Key 只配置在云端密钥中。

## 开发检查

使用 Node.js 24 和 pnpm，在本目录运行：

```sh
pnpm install --frozen-lockfile
pnpm platform:check
pnpm platform:build
node learning-platform/test-roster.mjs
node learning-platform/test-form-buttons.mjs
node learning-platform/test-materials.mjs
```

最后三个测试不创建线上学生账号。运行真实平台集成测试、首次初始化、管理员恢复脚本或部署前，务必先读维护说明并确认目标环境。不要对已有线上数据库重复执行初始化或清理测试数据脚本。

生产配置绑定当前维护者的 Cloudflare 资源。接手者需要账户授权与单独交接的密钥；另建环境时须更换资源标识和域名，不能直接套用生产配置。现有数据库迁移文件不可修改，只能追加迁移。

仓库中保留的旧 GitHub 展示站与 Sites 构建配置属于历史入口。新版平台使用 `platform:*` 命令，不需要依赖 GitHub Pages 运行。当前没有自动部署工作流。

## 严禁上传到 GitHub

`learning-platform/private/`、`.env*`、`.dev.vars*`、`.wrangler/`、构建文件和本机备份均应保持忽略。临时密码、API Key、Cloudflare 凭据、数据库导出、学生作业和成绩不得进入公开仓库。源代码备份不能替代 D1/R2 数据备份。
