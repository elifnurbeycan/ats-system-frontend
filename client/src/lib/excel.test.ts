import { describe, expect, it } from "vitest";
import { safeExcelValue } from "./excel";

describe("safeExcelValue", () => {
  it.each(["=2+2", "+SUM(A1:A2)", "-1+2", "@cmd", "\t=HYPERLINK(\"bad\")", "\r\n =1+1"])(
    "formül olarak yorumlanabilecek %j değerini metne çevirir",
    (value) => expect(safeExcelValue(value)).toBe(`'${value}`),
  );

  it("normal değerleri korur", () => {
    expect(safeExcelValue("Ayşe" )).toBe("Ayşe");
    expect(safeExcelValue(42)).toBe(42);
    expect(safeExcelValue(null)).toBe("");
  });
});
