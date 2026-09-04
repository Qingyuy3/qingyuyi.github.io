export type RosterRow = {
  line: number;
  username: string;
  name: string;
  className: string;
  error: string;
};
export type Credential = {
  username: string;
  name: string;
  className: string;
  password: string;
};

// Excel clipboard is TSV. Parse quoted cells before splitting records so embedded
// line breaks cannot silently become another student's account.
function cells(input: string): string[][] {
  const delimiter = input.includes('\t')
    ? '\t'
    : input.includes(',')
      ? ','
      : input.includes('，')
        ? '，'
        : null;
  if (!delimiter)
    return input.split(/\r\n|\n|\r/).map((line) => line.trim().split(/\s+/));
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"' && (quoted || !cell)) {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === delimiter || c === '\r' || c === '\n')) {
      row.push(cell);
      cell = '';
      if (c !== delimiter) {
        rows.push(row);
        row = [];
        if (c === '\r' && input[i + 1] === '\n') i++;
      }
    } else cell += c;
  }
  if (quoted) throw new Error('名单中有未闭合的引号，请重新复制完整单元格。');
  row.push(cell);
  rows.push(row);
  return rows;
}

export function parseRoster(
  input: string,
  existing: string[] = [],
): RosterRow[] {
  const known = new Set(existing.map((s) => s.toLowerCase()));
  const seen = new Set<string>();
  const records = cells(input.replace(/^\uFEFF/, ''))
    .map((fields, i) => ({ fields: fields.map((s) => s.trim()), line: i + 1 }))
    .filter((r) => r.fields.some(Boolean));
  const first = records[0]?.fields;
  if (
    first &&
    /^(账号|帐号|学号|学生账号|username)$/i.test(first[0]) &&
    /^(姓名|学生姓名|name)$/i.test(first[1] ?? '')
  )
    records.shift();
  if (records.length > 60) throw new Error('一次最多开通 60 人，请分批粘贴。');
  return records.map(({ fields, line }) => {
    const [raw = '', name = '', className = ''] = fields;
    const username = raw.toLowerCase();
    let error = '';
    if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(username))
      error = '账号须为 3–32 位字母或数字，可包含下划线、短横线';
    else if (!name) error = '缺少姓名';
    else if (name.length > 60 || className.length > 60)
      error = '姓名或班级不能超过 60 字';
    else if (fields.slice(3).some(Boolean))
      error = '超过三列，请仅复制账号、姓名、班级';
    else if (/[\r\n]/.test(name + className))
      error = '姓名或班级内含换行，请整理为一个单元格一行';
    else if (seen.has(username)) error = '名单内账号重复';
    else if (known.has(username)) error = '账号已存在，不会重复开通';
    seen.add(username);
    return { line, username, name, className, error };
  });
}

export function mergeCredential(
  previous: Credential[],
  next: Credential,
): Credential[] {
  return [...previous.filter((c) => c.username !== next.username), next];
}

// Explicit text cells preserve leading zeros and never execute names as formulas.
// Load the exporter only on demand; normal course pages don't need this bundle.
export async function credentialsWorkbook(
  records: Credential[],
  origin: string,
): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('学生账号', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  sheet.columns = [18, 18, 18, 34, 52, 70].map((width) => ({
    width,
    style: { numFmt: '@', alignment: { vertical: 'middle', wrapText: true } },
  }));
  const rows = [
    ['账号', '姓名', '班级', '临时密码', '登录网址', '使用说明'],
    ...records.map((c) => [
      c.username,
      c.name,
      c.className,
      c.password,
      origin,
      '临时密码生成后 7 天有效；首次登录须改密，之后使用新密码。',
    ]),
  ];
  sheet.addRows(rows);
  sheet.eachRow((row) => {
    row.height = 36;
  });
  sheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF234477' },
    };
  });
  sheet.autoFilter = 'A1:F1';
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer).buffer;
}
