import { afterEach, describe, expect, it, vi } from "vitest";
import { generateEntityCode } from "./entity-code";

describe("generateEntityCode", () => {
  afterEach(() => vi.restoreAllMocks());

  it("Türkçe karakterleri ASCII koduna çevirir ve rastgele son ek ekler", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456);

    expect(generateEntityCode("İnsan Kaynakları & İK")).toBe("INSAN_KAYNAKLARI_IK_4FZY");
  });

  it("özel karakterleri temizler, boşlukları alt çizgiye çevirir ve kodu sınırlar", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.123456);

    const code = generateEntityCode("  Java / Backend: Senior Developer With A Very Long Position Name!!!  ");

    expect(code.startsWith("JAVA_BACKEND_SENIOR_DEVELOPER_")).toBe(true);
    expect(code).toMatch(/_[A-Z0-9]{4}$/);
    expect(code.slice(0, -5)).toHaveLength(40);
  });

  it.each(["", " !!! ", "@@@###"])('kod üretilemeyen "%s" değerinde boş döner', (value) => {
    expect(generateEntityCode(value)).toBe("");
  });
});
