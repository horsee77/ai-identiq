export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  if (local.length <= 2) return `**@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

export function maskDocument(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${"*".repeat(digits.length - 4)}${digits.slice(-4)}`;
}

export function maskSensitiveObject(payload: Record<string, unknown>) {
  const keysToMask = ["cpf", "cnpj", "email", "document", "phone", "token", "apiKey"];
  const clone: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (keysToMask.some((entry) => key.toLowerCase().includes(entry))) {
      clone[key] = "***";
      continue;
    }

    clone[key] = value;
  }

  return clone;
}
