type ExcelValue = string | number | boolean | Date | null | undefined;

const safeValue = (value: ExcelValue) => {
  if (typeof value === "string" && /^[=+\-@]/.test(value)) return `'${value}`;
  return value ?? "";
};

export async function exportExcel(
  rows: Record<string, ExcelValue>[],
  filePrefix: string,
  sheetName: string,
) {
  const XLSX = await import("xlsx");
  const safeRows = rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, safeValue(value)]),
  ));
  const worksheet = XLSX.utils.json_to_sheet(safeRows);
  const headers = safeRows[0] ? Object.keys(safeRows[0]) : [];
  worksheet["!cols"] = headers.map((header) => ({
    wch: Math.min(45, Math.max(header.length + 2, ...safeRows.map((row) => String(row[header] ?? "").length + 2))),
  }));
  worksheet["!autofilter"] = worksheet["!ref"] ? { ref: worksheet["!ref"] } : undefined;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `${filePrefix}-${date}.xlsx`, { compression: true });
}
