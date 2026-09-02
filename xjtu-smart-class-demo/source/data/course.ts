export type MaterialType = '课件' | '作业' | '数据' | '代码';

export type Material = {
  id: string;
  title: string;
  chapter: number;
  week: number;
  type: MaterialType;
  format: string;
  size: string;
  path: string;
  summary: string;
  keywords: string[];
};

export type AssignmentTask = {
  id: string;
  title: string;
  module: number;
  stage: string;
  description: string;
  sourcePath: string;
  accepted: string;
};

export const course = {
  code: 'MGT-IA-2024',
  title: '智能分析',
  school: '西安交通大学管理学院',
  term: '历年资料整理版 · 2024 春季学期',
  teacher: '王尧',
  credits: '32 学时',
  schedule: '8 个学习单元',
  location: '在线课程资料库',
  format: '教师授课 + 课程实验 + 小组项目',
  description: '以历年真实教学资料为主线，学习 R 与 Python 数据分析、可视化、机器学习和网络爬虫，并通过配套数据、Notebook 与课程实验完成实践。',
  progress: 63,
};

export const courseObjectives = [
  '理解数据挖掘与现代机器学习方法在管理问题中的作用。',
  '能够使用 R 或 Python 完成数据读取、清洗、可视化与建模。',
  '能够完成“抓取、解析、存储、分析”的数据项目，并清楚说明方法与局限。',
];

export const assessments = [
  { label: '程序实验报告（2–3 份）', weight: 50, color: 'bg-amber-500' },
  { label: '课程大作业（小组）', weight: 50, color: 'bg-primary' },
];

export const modules = [
  { week: 1, chapter: 1, title: '课程概述与智能分析', description: '了解 32 学时课程目标、学习方式、考核要求和智能分析应用场景。', status: '资料齐全', items: ['课程目标与学习地图', '机器学习与数据挖掘概览', '分组与课程实验要求'] },
  { week: 2, chapter: 2, title: 'R 语言基础', description: '认识 R 的数据类型、数据结构与基础操作，为描述分析做准备。', status: '资料齐全', items: ['R 参考小卡片', '数据类型与数据结构', '数据导入与基本操作'] },
  { week: 3, chapter: 3, title: 'R 数据可视化与词云', description: '使用图形理解数据规律，并借助中文分词完成词云练习。', status: '含练习', featured: true, items: ['描述分析与常用图形', '单变量与多变量可视化', '中文分词与词云实验'] },
  { week: 4, chapter: 4, title: 'Python 与数据科学基础', description: '比较 R 与 Python，学习 Python 基础语法、NumPy 数组与科学计算。', status: '资料齐全', items: ['Python 与 R 的应用差异', 'Python 数据结构与控制流', 'NumPy 数组与数学运算'] },
  { week: 5, chapter: 5, title: 'Pandas 与透视表实践', description: '完成数据读取、清洗、连接、汇总，并使用 Tips 与 Titanic 数据练习。', status: '含数据与代码', featured: true, items: ['Pandas 数据框与外部数据', '数据清洗、合并与汇总', '透视表作业与 Notebook'] },
  { week: 6, chapter: 6, title: '集成学习算法', description: '从决策树出发，理解随机森林与 Boosting 的组合建模思路。', status: '资料齐全', items: ['决策树', '随机森林', 'Boosting'] },
  { week: 7, chapter: 7, title: '静态网页爬虫', description: '学习 HTTP 请求、requests、lxml 与 BeautifulSoup，并完成豆瓣电影任务。', status: '含作业', featured: true, items: ['爬虫的“抓、析、存”流程', 'requests 与页面解析', '豆瓣电影静态爬虫练习'] },
  { week: 8, chapter: 8, title: '动态爬虫与综合项目', description: '围绕商品评论等动态页面完成抓取、整理与可视化分析。', status: '项目实践', items: ['动态页面与接口数据', '京东商品评论抓取', '结果可视化与课程大作业'] },
];

const base = 'https://qingyuy3.github.io/qingyuyi.github.io/xjtu-smart-class-demo/course-materials/course-001/former-semester-2024';

export const materials: Material[] = [
  { id: 'm01', title: '课程概述（2024）', chapter: 1, week: 1, type: '课件', format: 'PDF', size: '14.3 MB', path: `${base}/课件/0智能分析1(2024-1).pdf`, summary: '课程目标、32 学时安排、学习小组、实验报告与课程大作业要求。', keywords: ['第一章', '第一周', '课程概述', '课程要求', '考核', '智能分析', '机器学习', '数据挖掘'] },
  { id: 'm02', title: 'R 语言基本介绍', chapter: 2, week: 2, type: '课件', format: 'PDF', size: '6.3 MB', path: `${base}/课件/1智能分析2(2024-2).pdf`, summary: 'R 语言参考资料、数据类型、数据结构与基础分析操作。', keywords: ['第二章', '第二周', 'R语言', '数据类型', '数据结构', '基础'] },
  { id: 'm03', title: 'R 语言数据可视化', chapter: 3, week: 3, type: '课件', format: 'PDF', size: '8.9 MB', path: `${base}/课件/1智能分析3(2024-3).pdf`, summary: '描述分析、柱状图、箱线图、散点图、折线图与多变量可视化。', keywords: ['第三章', '第三周', 'R语言', '可视化', '描述分析', '图表'] },
  { id: 'm04', title: '中文分词与词云练习', chapter: 3, week: 3, type: '作业', format: 'PDF', size: '6.4 MB', path: `${base}/作业/词云生成练习作业.pdf`, summary: '使用 jiebaR 与 wordcloud2 完成中文分词和词云图绘制，并介绍大模型辅助编程。', keywords: ['第三章', '词云', '中文分词', 'jiebaR', 'wordcloud2', '作业', '大模型辅助编程'] },
  { id: 'm05', title: 'Python 数据科学概述', chapter: 4, week: 4, type: '课件', format: 'PDF', size: '11.2 MB', path: `${base}/课件/2Python数据科学概述(2024-6).pdf`, summary: '比较 Python 与 R 的生态、学习路径和数据科学应用场景。', keywords: ['第四章', 'Python', 'R语言', '数据科学', '对比', '学习路径'] },
  { id: 'm06', title: 'Python 基础', chapter: 4, week: 4, type: '课件', format: 'PDF', size: '3.4 MB', path: `${base}/课件/2Python基础(2023-6).pdf`, summary: 'Python 安装、数据结构、控制流、字符串处理和自定义函数。', keywords: ['第四章', 'Python基础', '安装', '数据结构', '控制流', '函数'] },
  { id: 'm07', title: 'NumPy 模块的使用', chapter: 4, week: 4, type: '课件', format: 'PDF', size: '1.0 MB', path: `${base}/课件/2Numpy模块的使用(2023-8).pdf`, summary: '数组创建与运算、统计函数、线性代数和伪随机数。', keywords: ['第四章', 'NumPy', '数组', '线性代数', '随机数', 'Python'] },
  { id: 'm08', title: 'Pandas 模块的使用', chapter: 5, week: 5, type: '课件', format: 'PDF', size: '3.2 MB', path: `${base}/课件/2Pandas模块的使用(2023-7).pdf`, summary: '序列与数据框、外部数据读取、清洗、连接和汇总。', keywords: ['第五章', '第五周', 'Pandas', '数据框', '数据清洗', '数据合并', '汇总'] },
  { id: 'm09', title: '透视表练习作业', chapter: 5, week: 5, type: '作业', format: 'PDF', size: '90 KB', path: `${base}/作业/透视表练习作业.pdf`, summary: '围绕餐厅账单数据分析日期、人数、性别、吸烟情况与顾客满意度。', keywords: ['第五章', '透视表', '餐厅', 'Tips', '作业', '顾客满意度'] },
  { id: 'm10', title: 'Tips 餐厅账单数据', chapter: 5, week: 5, type: '数据', format: 'CSV', size: '11 KB', path: `${base}/数据/tips.csv`, summary: '244 条餐厅账单记录，包含消费、小费、性别、吸烟、日期、时段和人数。', keywords: ['第五章', 'Tips', 'CSV', '餐厅', '透视表', '数据集', '244条'] },
  { id: 'm11', title: 'Titanic 乘客数据', chapter: 5, week: 5, type: '数据', format: 'CSV', size: '60 KB', path: `${base}/数据/titanic.csv`, summary: '891 条乘客记录，适合练习分组汇总、缺失值检查和透视表分析。', keywords: ['第五章', 'Titanic', '泰坦尼克', 'CSV', '透视表', '数据集', '891条'] },
  { id: 'm12', title: 'Tips 透视表 Notebook', chapter: 5, week: 5, type: '代码', format: 'IPYNB', size: '20 KB', path: `${base}/代码/透视表(Tips).ipynb`, summary: '包含 12 个 Python 代码单元的 Tips 数据透视表示例。', keywords: ['第五章', 'Tips', 'Notebook', 'Jupyter', 'Python', '透视表', '代码'] },
  { id: 'm13', title: 'Titanic 透视表 Notebook', chapter: 5, week: 5, type: '代码', format: 'IPYNB', size: '24 KB', path: `${base}/代码/透视表(Titanic).ipynb`, summary: '包含 13 个 Python 代码单元的 Titanic 数据透视表示例。', keywords: ['第五章', 'Titanic', 'Notebook', 'Jupyter', 'Python', '透视表', '代码'] },
  { id: 'm14', title: '集成学习算法', chapter: 6, week: 6, type: '课件', format: 'PDF', size: '4.2 MB', path: `${base}/课件/2python集成学习(2023-10).pdf`, summary: '从决策树延伸到随机森林和 Boosting，强调分类、预测与模型解释。', keywords: ['第六章', '集成学习', '决策树', '随机森林', 'Boosting', '机器学习'] },
  { id: 'm15', title: 'R 爬虫简介', chapter: 7, week: 7, type: '课件', format: 'PDF', size: '10.1 MB', path: `${base}/课件/3智能分析5(爬虫2024-5).pdf`, summary: '介绍网页爬虫的“抓、析、存”三个阶段以及静态网页抓取思路。', keywords: ['第七章', '网络爬虫', 'R爬虫', '静态网页', '抓析存', '数据采集'] },
  { id: 'm16', title: 'Python 网络爬虫课件', chapter: 7, week: 7, type: '课件', format: 'PDF', size: '4.0 MB', path: `${base}/课件/3网络爬虫课件-11.pdf`, summary: 'requests、HTTP、lxml、BeautifulSoup、正则表达式、数据存储与 Scrapy。', keywords: ['第七章', 'Python爬虫', 'requests', 'HTTP', 'lxml', 'BeautifulSoup', 'Scrapy'] },
  { id: 'm17', title: '豆瓣电影静态爬虫练习', chapter: 7, week: 7, type: '作业', format: 'PDF', size: '3.0 MB', path: `${base}/作业/静态爬虫练习作业.pdf`, summary: '抓取西安正在上映电影的名称、评分、时长、演员、导演和海报地址。', keywords: ['第七章', '静态爬虫', '豆瓣电影', '西安', 'lxml', '作业'] },
  { id: 'm18', title: '豆瓣请求示例代码', chapter: 7, week: 7, type: '代码', format: 'PY', size: '< 1 KB', path: `${base}/代码/爬虫(Douban).py`, summary: '使用 requests 和 User-Agent 请求豆瓣 Top 250 页面的最小 Python 示例。', keywords: ['第七章', 'Python代码', '豆瓣', 'requests', 'User-Agent', '爬虫示例'] },
  { id: 'm19', title: '京东评论动态爬虫练习', chapter: 8, week: 8, type: '作业', format: 'PDF', size: '2.4 MB', path: `${base}/作业/动态爬虫练习作业.pdf`, summary: '选择一个商品，抓取评论 ID、时间、内容与评分，并完成可视化分析。', keywords: ['第八章', '动态爬虫', '京东评论', '商品评论', '可视化', '作业'] },
];

export const assignmentTasks: AssignmentTask[] = [
  { id: 'a01', title: '透视表练习', module: 5, stage: '完成第 5 单元后', description: '使用 Tips 数据，从日期、时段、性别和吸烟情况等角度分析餐厅经营状况。', sourcePath: `${base}/作业/透视表练习作业.pdf`, accepted: 'PDF、DOCX、IPYNB、XLSX' },
  { id: 'a02', title: '中文分词与词云', module: 3, stage: '完成第 3 单元后', description: '使用 jiebaR 与 wordcloud2 对中文文本进行分词，并输出词云与简短解释。', sourcePath: `${base}/作业/词云生成练习作业.pdf`, accepted: 'PDF、DOCX、R、HTML' },
  { id: 'a03', title: '豆瓣电影静态爬虫', module: 7, stage: '完成第 7 单元后', description: '使用 lxml 抓取电影名称、评分、时长、演员、导演与海报地址。', sourcePath: `${base}/作业/静态爬虫练习作业.pdf`, accepted: 'PDF、DOCX、PY、IPYNB' },
  { id: 'a04', title: '商品评论动态爬虫', module: 8, stage: '课程综合实践', description: '抓取一个商品的评论信息，并对评分、内容、发布时间或地区进行可视化分析。', sourcePath: `${base}/作业/动态爬虫练习作业.pdf`, accepted: 'PDF、DOCX、PY、IPYNB' },
];

export const quizQuestions = [
  { question: '一个完整的网络爬虫过程通常可以概括为哪三个阶段？', options: ['抓取、解析、存储', '建模、预测、决策', '登录、点赞、转发', '采样、回归、聚类'], answer: 0, explanation: '课程材料将 Web Crawler（网络爬虫）概括为“抓、析、存”：抓取网页、解析目标数据、保存结果。' },
  { question: 'Pandas 最适合用于下面哪类任务？', options: ['数据读取、清洗、连接和汇总', '替代浏览器显示网页', '制作硬件驱动', '加密所有文件'], answer: 0, explanation: 'Pandas 是 Python 的数据处理工具，核心对象包括 Series（序列）与 DataFrame（数据框）。' },
  { question: '课程中的 Tips 数据集共有多少条餐厅账单记录？', options: ['24 条', '244 条', '891 条', '2,440 条'], answer: 1, explanation: 'Tips 数据集包含 244 条账单，可用于透视表、分组汇总和顾客特征分析。' },
  { question: '随机森林（Random Forest）属于哪一类方法？', options: ['集成学习', '网页排版', '文件压缩', '单纯的数据存储'], answer: 0, explanation: 'Random Forest（随机森林）通过组合多棵决策树完成预测，是 Ensemble Learning（集成学习）的典型方法。' },
  { question: '静态网页抓取时，lxml 或 BeautifulSoup 的主要作用是什么？', options: ['解析网页结构并提取目标数据', '训练随机森林', '生成压缩包', '创建数据库账号'], answer: 0, explanation: '它们用于解析 HTML 结构，帮助程序定位电影名称、评分等目标字段。' },
  { question: '对数据做可视化之前，最合理的做法通常是什么？', options: ['先理解字段并检查数据质量', '立即删除缺失值所在的全部记录', '只选择最大值', '跳过数据读取'], answer: 0, explanation: '先理解字段、数据类型和缺失情况，才能选择合适的图形并避免误读。' },
];

export const announcements = [
  { date: '资料整理', title: '历年课程资料已归档', body: '已按 8 个学习单元整理 10 份课件、4 份作业、2 个数据集和 3 个代码示例。' },
  { date: '学习建议', title: '建议按“课件 → 数据/代码 → 作业”顺序学习', body: '第 5、7、8 单元包含配套实践，可直接下载原始文件进行练习。' },
];
