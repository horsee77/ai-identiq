import "server-only";

export function renderTemplate(template: string, variables: Record<string, string | number | undefined>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, rawKey: string) => {
    const value = variables[rawKey];
    if (value === null || value === undefined) {
      return "";
    }
    return String(value);
  });
}

export function compactLines(lines: Array<string | undefined | null>) {
  return lines
    .map((line) => (line ?? "").trim())
    .filter(Boolean)
    .join("\n\n");
}
