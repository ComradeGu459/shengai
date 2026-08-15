import type { TermExportTemplateColumn, TermVersion, TermVersionItem } from '@qimao-terms-cloud/contracts';

const crcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
  return value >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const u16 = (value: number) => {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
};

const u32 = (value: number) => {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
};

const zip = (files: Array<{ name: string; content: string }>) => {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, 'utf8');
    const content = Buffer.from(file.content, 'utf8');
    const crc = crc32(content);
    const localHeader = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), name,
    ]);
    local.push(localHeader, content);
    central.push(Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0),
      u32(crc), u32(content.length), u32(content.length), u16(name.length), u16(0), u16(0),
      u16(0), u16(0), u32(0), u32(offset), name,
    ]));
    offset += localHeader.length + content.length;
  }
  const centralBytes = Buffer.concat(central);
  return Buffer.concat([
    ...local,
    centralBytes,
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(centralBytes.length), u32(offset), u16(0),
  ]);
};

const xml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const cell = (reference: string, value: string) =>
  `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;

const valueFor = (item: TermVersionItem, column: TermExportTemplateColumn) => ({
  type: item.type,
  name: item.name,
  aliases: item.aliases.join(' / '),
  gender: item.gender === 'male' ? '男' : item.gender === 'female' ? '女' : '',
  note: item.note,
})[column.field];

export const createTermVersionXlsx = (
  version: TermVersion,
  columns: TermExportTemplateColumn[] = [
    { field: 'type', header: '类型' },
    { field: 'name', header: '中文内容' },
    { field: 'aliases', header: '别称' },
    { field: 'gender', header: '性别' },
    { field: 'note', header: '备注' },
  ],
) => {
  const rows = [
    columns.map((column) => column.header),
    ...version.items.map((item) => columns.map((column) => valueFor(item, column))),
  ];
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => cell(
      `${String.fromCharCode(65 + columnIndex)}${rowIndex + 1}`,
      value,
    )).join('');
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join('');
  return zip([
    {
      name: '[Content_Types].xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        + '<Default Extension="xml" ContentType="application/xml"/>'
        + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        + '</Types>',
    },
    {
      name: '_rels/.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        + '</Relationships>',
    },
    {
      name: 'xl/workbook.xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
        + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        + '<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        + '</Relationships>',
    },
    {
      name: 'xl/worksheets/sheet1.xml',
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        + `<sheetData>${sheetRows}</sheetData></worksheet>`,
    },
  ]);
};
