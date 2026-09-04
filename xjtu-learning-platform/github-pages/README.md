# 西安交通大学管理学院｜数智课堂 Demo

这是一个单门课程的中文教学网站演示，包含课程概览、课程内容、AI 资料检索、小测、作业上传、讨论区和课程日历。

## 最常修改的位置

- `source/data/course.ts`：课程名称、教师、周次、通知、资料、作业与小测数据。
- `source/public/course-materials/course-001/`：第一门课程的真实课件、讲义和数据文件应放在这里；可继续按 `week-01`、`week-02` 等建立子文件夹。
- `source/components/course-views.tsx`：各功能页面的文字和互动逻辑。
- `source/components/course-shell.tsx`：顶部、左侧导航和整体页面结构。
- `source/app/globals.css`：颜色、字体、圆角等全站视觉样式。
- `source/docs/内容维护指南.md`：给后续维护人员的中文说明。

## 文件夹结构

```text
xjtu-smart-class-demo/
├─ index.html                 # 已发布页面入口，请勿直接手改
├─ assets/                    # 自动生成的网页资源，请勿直接手改
├─ course-materials/          # 页面可直接访问的示例资料
├─ README.md                  # 本说明
└─ source/                    # 可维护的源代码
   ├─ data/course.ts          # 课程数据（最常改）
   ├─ public/course-materials/# 课程文件（按课程与周次分类）
   ├─ components/             # 页面与交互组件
   ├─ app/globals.css         # 全站样式
   ├─ docs/                   # 中文维护文档
   └─ github-pages/           # GitHub 静态网站入口
```

## 本地更新方式

进入 `source` 文件夹，安装依赖后运行 `pnpm build:github`。生成结果位于 `source/github-dist`，将其中内容更新到上一级 `xjtu-smart-class-demo` 发布目录即可。

当前是纯演示版本：AI 检索、提交和讨论功能只在浏览器中模拟，不会保存真实学生数据。
