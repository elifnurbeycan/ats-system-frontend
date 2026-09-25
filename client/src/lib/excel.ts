type ExcelValue = string | number | boolean | Date | null | undefined;

export const safeExcelValue = (value: ExcelValue) => {
  if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+\-@]/.test(value)) return `'${value}`;
  return value ?? "";
};

export async function exportExcel(
  rows: Record<string, ExcelValue>[],
  filePrefix: string,
  sheetName: string,
) {
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const headers = Object.keys(rows[0] ?? {});
  const data = [
    headers.map((header) => safeExcelValue(header)),
    ...rows.map((row) => headers.map((header) => safeExcelValue(row[header]))),
  ];
  const columns = headers.map((header) => ({
    width: Math.min(45, Math.max(header.length + 2, ...rows.map((row) => String(row[header] ?? "").length + 2))),
  }));
  const date = new Date().toISOString().slice(0, 10);
  await writeExcelFile(data, { sheet: sheetName.slice(0, 31), columns, stickyRowsCount: 1 })
    .toFile(`${filePrefix}-${date}.xlsx`);
}
