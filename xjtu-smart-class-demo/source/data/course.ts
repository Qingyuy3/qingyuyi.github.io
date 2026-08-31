export type MaterialType = '课件' | '阅读' | '练习' | '案例' | '视频';

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

export const course = {
  code: 'MGT-DA-2026',
  title: '数据分析与商业决策',
  school: '西安交通大学管理学院',
  term: '2026 秋季学期',
  teacher: '李老师',
  credits: '3 学分',
  schedule: '每周二 14:00–16:30',
  location: '管理学院 205 教室',
  format: '线下授课 + 在线互动',
  description: '从真实管理问题出发，学习用数据描述现象、建立预测模型，并把分析结果转化为可执行的商业建议。',
  progress: 38,
};

export const courseObjectives = [
  '能够把模糊的管理问题转化为可分析的数据问题。',
  '掌握描述性统计、回归、分类与聚类的核心概念。',
  '能够解释模型结果、识别局限，并提出有依据的管理建议。',
];

export const assessments = [
  { label: '互动小测', weight: 20, color: 'bg-amber-500' },
  { label: '案例作业', weight: 35, color: 'bg-primary' },
  { label: '课堂参与', weight: 15, color: 'bg-emerald-600' },
  { label: '期末项目', weight: 30, color: 'bg-blue-600' },
];

export const modules = [
  { week: 1, chapter: 1, title: '数据与管理决策', description: '认识商业数据、分析流程与常见决策问题。', status: '已完成', items: ['课程导论', '数据分析流程', '课程小测 01'] },
  { week: 2, chapter: 2, title: '描述性统计', description: '使用指标和可视化理解数据分布。', status: '已完成', items: ['集中趋势', '离散程度', 'Excel 实践'] },
  { week: 3, chapter: 3, title: '回归分析入门', description: '理解变量关系，并建立第一个线性回归模型。', status: '进行中', items: ['回归基本概念', '线性模型解释', '互动小测', '案例分析作业'] },
  { week: 4, chapter: 4, title: '多元回归与模型诊断', description: '加入多个解释变量，检查并改进模型。', status: '未开始', items: ['多元回归', '共线性', '残差诊断'] },
  { week: 5, chapter: 5, title: '分类与预测', description: '从连续预测走向分类决策。', status: '未开始', items: ['逻辑回归', '分类评估', '业务案例'] },
  { week: 6, chapter: 6, title: '聚类与客户细分', description: '用无监督方法发现相似客户群体。', status: '未开始', items: ['距离与相似度', 'K-means', '客户细分案例'] },
];

export const materials: Material[] = [
  { id: 'm01', title: '课程导论与学习地图', chapter: 1, week: 1, type: '课件', format: 'PDF', size: '2.4 MB', path: '/course-materials/course-001/chapter-01/slides/course-introduction.pdf', summary: '课程目标、六周学习路径和考核方式。', keywords: ['第一章', '第1章', '第一周', '导论', '课程介绍', '学习地图'] },
  { id: 'm02', title: '商业数据分析流程', chapter: 1, week: 1, type: '阅读', format: 'PDF', size: '1.8 MB', path: '/course-materials/course-001/chapter-01/readings/analytics-process.pdf', summary: '从业务问题到数据结论的完整流程。', keywords: ['第一章', '流程', '商业分析', 'CRISP-DM'] },
  { id: 'm03', title: '描述性统计讲义', chapter: 2, week: 2, type: '课件', format: 'PDF', size: '3.1 MB', path: '/course-materials/course-001/chapter-02/slides/descriptive-statistics.pdf', summary: '均值、中位数、方差和分布形态。', keywords: ['第二章', '第二周', '描述性统计', '均值', '方差'] },
  { id: 'm04', title: 'Excel 数据概览练习', chapter: 2, week: 2, type: '练习', format: 'XLSX', size: '860 KB', path: '/course-materials/course-001/chapter-02/exercises/excel-summary-practice.xlsx', summary: '使用透视表和统计函数完成数据概览。', keywords: ['第二章', 'Excel', '练习', '描述统计'] },
  { id: 'm05', title: '回归分析导论', chapter: 3, week: 3, type: '课件', format: 'PDF', size: '4.2 MB', path: '/course-materials/course-001/chapter-03/slides/regression-introduction.pdf', summary: '用直观图示理解自变量、因变量和拟合直线。', keywords: ['第三章', '第三周', '回归', '线性回归', '自变量', '因变量'] },
  { id: 'm06', title: '线性回归概念速查', chapter: 3, week: 3, type: '阅读', format: 'PDF', size: '1.1 MB', path: '/course-materials/course-001/chapter-03/readings/linear-regression-cheatsheet.pdf', summary: '系数、截距、R² 和显著性的中文速查表。', keywords: ['第三章', '回归', '系数', '截距', 'R方', '显著性', '复习'] },
  { id: 'm07', title: '门店销售预测案例', chapter: 3, week: 3, type: '案例', format: 'PDF', size: '2.8 MB', path: '/course-materials/course-001/chapter-03/cases/store-sales-case.pdf', summary: '基于广告投入和客流量预测门店销售额。', keywords: ['第三章', '回归', '案例', '销售预测', '商业决策'] },
  { id: 'm08', title: '回归分析基础练习', chapter: 3, week: 3, type: '练习', format: 'XLSX', size: '940 KB', path: '/course-materials/course-001/chapter-03/exercises/regression-practice.xlsx', summary: '包含一份可直接替换数据的回归练习表。', keywords: ['第三章', '回归', '练习', 'Excel', '作业'] },
  { id: 'm09', title: '多元回归与模型诊断', chapter: 4, week: 4, type: '课件', format: 'PDF', size: '4.6 MB', path: '/course-materials/course-001/chapter-04/slides/multiple-regression.pdf', summary: '多变量模型、共线性和残差诊断。', keywords: ['第四章', '第四周', '多元回归', '共线性', '残差'] },
  { id: 'm10', title: '逻辑回归概念讲解', chapter: 5, week: 5, type: '视频', format: 'MP4', size: '18.5 MB', path: '/course-materials/course-001/chapter-05/videos/logistic-regression.mp4', summary: '用客户流失场景解释逻辑回归。', keywords: ['第五章', '逻辑回归', '分类', '视频'] },
  { id: 'm11', title: '分类模型评估速查', chapter: 5, week: 5, type: '阅读', format: 'PDF', size: '1.3 MB', path: '/course-materials/course-001/chapter-05/readings/classification-metrics.pdf', summary: '准确率、召回率和混淆矩阵。', keywords: ['第五章', '分类', '准确率', '召回率', '混淆矩阵'] },
  { id: 'm12', title: '客户细分案例数据', chapter: 6, week: 6, type: '案例', format: 'CSV', size: '420 KB', path: '/course-materials/course-001/chapter-06/cases/customer-segmentation.csv', summary: '用于 K-means 聚类演示的脱敏客户数据。', keywords: ['第六章', '聚类', 'K-means', '客户细分', '案例'] },
];

export const quizQuestions = [
  { question: '在线性回归中，“因变量”通常表示什么？', options: ['需要预测或解释的结果', '用于解释结果的输入', '样本的编号', '模型中的误差'], answer: 0, explanation: '因变量（Dependent Variable，因变量）是模型希望解释或预测的结果变量。' },
  { question: '回归系数为正数，通常表示什么？', options: ['两变量完全无关', '自变量增加时，因变量倾向增加', '因变量一定等于零', '模型一定准确'], answer: 1, explanation: '正系数表示其他条件不变时，两者呈正向关系；它不自动代表因果关系。' },
  { question: 'R² 更接近 1 时，以下哪项通常更合理？', options: ['模型解释的数据变异比例更高', '一定不存在异常值', '所有系数都显著', '模型可以证明因果'], answer: 0, explanation: 'R²（决定系数）衡量模型解释因变量变异的比例，但不能单独证明模型正确或存在因果。' },
  { question: '“相关关系不等于因果关系”意味着什么？', options: ['相关分析没有用', '两个变量一起变化，不代表一个导致另一个', '回归不能用于预测', '因果关系不需要证据'], answer: 1, explanation: '变量同步变化可能来自第三个因素、反向影响或偶然性，需要额外设计才能判断因果。' },
  { question: '检查回归模型后发现残差呈明显规律，首先应该考虑什么？', options: ['模型可能遗漏了结构或关系', '直接删除所有数据', 'R² 必须为零', '把所有系数设为 1'], answer: 0, explanation: '残差（Residual，残差）若有明显模式，通常提示线性假设、变量选择或数据结构需要重新检查。' },
];

export const announcements = [
  { date: '9 月 1 日', title: '第 3 周内容已开放', body: '请在周五前完成概念小测，并开始准备案例分析报告。' },
  { date: '8 月 29 日', title: '课程资料目录已更新', body: '第二章 Excel 练习表已替换为演示模板。' },
];

