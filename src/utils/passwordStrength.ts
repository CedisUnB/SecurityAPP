export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;

export type PasswordStrengthLevel = "empty" | "weak" | "medium" | "strong";

export interface PasswordRequirement {
  id: "length" | "lowercase" | "uppercase" | "number" | "special";
  label: string;
  met: boolean;
}

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  /** Quantidade de segmentos preenchidos no medidor (0 a 3). */
  score: 0 | 1 | 2 | 3;
  label: string;
  requirements: PasswordRequirement[];
  isValid: boolean;
}

const RULES: Array<Omit<PasswordRequirement, "met"> & { test: (password: string) => boolean }> = [
  {
    id: "length",
    label: `Entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH && p.length <= PASSWORD_MAX_LENGTH,
  },
  { id: "lowercase", label: "Uma letra minúscula", test: (p) => /[a-z]/.test(p) },
  { id: "uppercase", label: "Uma letra maiúscula", test: (p) => /[A-Z]/.test(p) },
  { id: "number", label: "Um número", test: (p) => /\d/.test(p) },
  { id: "special", label: "Um caractere especial", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const requirements = RULES.map(({ test, ...rule }) => ({ ...rule, met: test(password) }));
  const metCount = requirements.filter((r) => r.met).length;
  const isValid = metCount === RULES.length;

  if (password.length === 0) {
    return { level: "empty", score: 0, label: "Digite uma senha", requirements, isValid: false };
  }
  if (isValid) {
    return { level: "strong", score: 3, label: "Senha forte", requirements, isValid };
  }
  if (metCount >= 3) {
    return { level: "medium", score: 2, label: "Senha média", requirements, isValid };
  }
  return { level: "weak", score: 1, label: "Senha fraca", requirements, isValid };
}