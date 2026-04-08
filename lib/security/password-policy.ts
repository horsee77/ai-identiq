import { env } from "@/lib/env";

export type PasswordPolicyResult = {
  valid: boolean;
  message?: string;
};

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < env.PASSWORD_POLICY_MIN_LENGTH) {
    return { valid: false, message: `A senha deve ter no mínimo ${env.PASSWORD_POLICY_MIN_LENGTH} caracteres.` };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "A senha deve conter ao menos uma letra maiúscula." };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "A senha deve conter ao menos uma letra minúscula." };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "A senha deve conter ao menos um número." };
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: "A senha deve conter ao menos um caractere especial." };
  }

  return { valid: true };
}

