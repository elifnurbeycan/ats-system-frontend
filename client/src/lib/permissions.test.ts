import { afterEach, describe, expect, it } from "vitest";
import { getSessionUser, hasPermission } from "./permissions";

function setSession(value: unknown) {
  const store = new Map<string, string>();
  const session = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => [...store.keys()][index] ?? null,
    get length() { return store.size; },
  } as Storage;
  session.setItem("user_data", JSON.stringify(value));
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: session });
}

describe("permissions", () => {
  afterEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: undefined });
  });

  it("bozuk oturum verisinde null döner", () => {
    const session = { getItem: () => "{bozuk" } as Storage;
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: session });

    expect(getSessionUser()).toBeNull();
  });

  it("HR rolüne tüm izinleri verir", () => {
    setSession({ roles: ["HR"], permissions: [] });

    expect(hasPermission("CANDIDATE_UPDATE")).toBe(true);
    expect(hasPermission("CONTACT_LEAD_RESOLVE")).toBe(true);
  });

  it("HR dışındaki kullanıcıda yalnızca tanımlı izin geçerlidir", () => {
    setSession({ roles: ["DEPARTMENT_MANAGER"], permissions: ["CANDIDATE_VIEW"] });

    expect(hasPermission("CANDIDATE_VIEW")).toBe(true);
    expect(hasPermission("CANDIDATE_UPDATE")).toBe(false);
  });
});
