import assert from 'node:assert/strict';
import { parseRoster, mergeCredential, credentialsWorkbook } from './roster.ts';
const rows = parseRoster(
  '账号\t姓名\t班级\r\n00111\t张一二\t一班\r\n00112\t李同学\t\r\n\r\n',
);
assert.equal(rows.length, 2);
assert.equal(rows[0].username, '00111');
assert.ok(rows.every((r) => !r.error));
assert.equal(rows[1].className, '');
for (const text of [
  '1111 张一二 一班',
  '1111,张一二,一班',
  '1111，张一二，一班',
  '1111\t张一二\t一班',
]) {
  assert.deepEqual(
    parseRoster(text).map(({ username, name, className, error }) => ({
      username,
      name,
      className,
      error,
    })),
    [{ username: '1111', name: '张一二', className: '一班', error: '' }],
  );
}
assert.equal(parseRoster('1111\t\t一班')[0].error, '缺少姓名');
assert.ok(parseRoster('1111\t' + '张'.repeat(61))[0].error.includes('60'));
assert.ok(parseRoster('1111\t张一二\t一班\t多余')[0].error);
assert.ok(parseRoster('1111 张一二\n1111 李同学')[1].error.includes('重复'));
assert.ok(parseRoster('ABC1 张一二', ['abc1'])[0].error.includes('已存在'));
assert.equal(parseRoster('1111\t"张 一二"\t"一班"')[0].name, '张 一二');
assert.ok(parseRoster('1111\t"张\n一二"\t一班')[0].error.includes('换行'));
assert.throws(() => parseRoster('1111\t"张一二'), /引号/);
assert.throws(
  () =>
    parseRoster(
      Array.from({ length: 61 }, (_, i) => `${1000 + i} 同学`).join('\n'),
    ),
  /60/,
);
const one = {
  username: '00111',
  name: '=SUM(1,2)<&"',
  className: '一班',
  password: 'mock-test-only',
};
const merged = mergeCredential([one], {
  ...one,
  password: 'replacement-test-only',
});
assert.equal(merged.length, 1);
assert.equal(merged[0].password, 'replacement-test-only');
const buffer = await credentialsWorkbook([one], 'https://example.com/');
assert.deepEqual([...new Uint8Array(buffer).slice(0, 2)], [80, 75]);
const { default: ExcelJS } = await import('exceljs');
const workbook = new ExcelJS.Workbook();
await workbook.xlsx.load(buffer);
const sheet = workbook.getWorksheet('学生账号');
assert.equal(sheet.rowCount, 2);
assert.equal(sheet.getCell('A2').value, '00111');
assert.equal(sheet.getCell('B2').value, one.name);
assert.equal(sheet.getCell('B2').type, ExcelJS.ValueType.String);
assert.equal(sheet.getCell('D2').value, one.password);
assert.equal(sheet.getCell('D1').value, '临时密码');
assert.equal(sheet.getCell('A2').numFmt, '@');
console.log(
  'PASS: roster parsing and XLSX round-trip; Chinese, leading zeros, passwords and formula-like names preserved as text.',
);
