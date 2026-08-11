const turkishCharacters: Record<string, string> = {
  "ç": "c",
  "Ç": "C",
  "ğ": "g",
  "Ğ": "G",
  "ı": "i",
  "İ": "I",
  "ö": "o",
  "Ö": "O",
  "ş": "s",
  "Ş": "S",
  "ü": "u",
  "Ü": "U",
};

export function generateEntityCode(name: string): string {
  const asciiName = Array.from(name)
    .map((character) => turkishCharacters[character] ?? character)
    .join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const baseCode = asciiName
    .toUpperCase()
    .replace(/[^A-Z0-9\s_-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);

  if (!baseCode) return "";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${baseCode}_${suffix}`;
}
