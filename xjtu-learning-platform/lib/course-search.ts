import { materials, type Material } from '@/data/course';

const chineseNumbers: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

function extractNumber(query: string, unit: '章' | '周') {
  const digit = query.match(new RegExp(`第?([1-9])${unit}`));
  if (digit) return Number(digit[1]);
  const chinese = query.match(new RegExp(`第?([一二三四五六七八九])${unit}`));
  return chinese ? chineseNumbers[chinese[1]] : undefined;
}

export function searchMaterials(rawQuery: string): Material[] {
  const query = rawQuery.toLowerCase().replaceAll('张', '章').trim();
  if (!query) return [];

  const chapter = extractNumber(query, '章');
  const week = extractNumber(query, '周');
  const terms = query.split(/[\s，。、“”‘’？！,.!?/]+/).filter((term) => term.length > 1);

  return materials
    .map((material) => {
      const haystack = [material.title, material.summary, material.type, material.format, ...material.keywords].join(' ').toLowerCase();
      let score = 0;
      if (chapter === material.chapter) score += 8;
      if (week === material.week) score += 7;
      if (haystack.includes(query)) score += 10;
      for (const term of terms) if (haystack.includes(term)) score += term.length;
      if (query.includes('python') && haystack.includes('python')) score += 8;
      if ((query.includes('爬虫') || query.includes('抓取')) && haystack.includes('爬虫')) score += 8;
      if ((query.includes('数据') || query.includes('csv')) && material.type === '数据') score += 4;
      if ((query.includes('代码') || query.includes('notebook')) && material.type === '代码') score += 4;
      if ((query.includes('练习') || query.includes('作业')) && material.type === '作业') score += 4;
      if ((query.includes('课件') || query.includes('ppt')) && material.type === '课件') score += 4;
      return { material, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((item) => item.material);
}
