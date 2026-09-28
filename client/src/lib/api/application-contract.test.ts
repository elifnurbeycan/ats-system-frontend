import { describe, expect, it } from "vitest";
import { FALLBACK_APPLICATION_CONTRACT, formatFileSize, isAllowedFile } from "./application-contract";

describe("application contract yardımcıları", () => {
  it("dosya boyutunu okunabilir biçimde formatlar", () => {
    expect(formatFileSize(0)).toBe("0 KB");
    expect(formatFileSize(1025)).toBe("2 KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5 MB");
  });

  it("içerik türü veya uzantıya göre CV dosyasını kabul eder", () => {
    const contract = FALLBACK_APPLICATION_CONTRACT.candidateCv;
    expect(isAllowedFile(new File(["pdf"], "cv.pdf", { type: "application/octet-stream" }), contract)).toBe(true);
    expect(isAllowedFile(new File(["pdf"], "cv.txt", { type: "application/pdf" }), contract)).toBe(true);
    expect(isAllowedFile(new File(["text"], "cv.txt", { type: "text/plain" }), contract)).toBe(false);
  });
});
