/**
 * Kebijakan Kompleksitas Kata Sandi Terpadu SMKN 21 Jakarta.
 * Digunakan oleh OnboardingGate, TabUbahPassword, dan form ganti kata sandi.
 */

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const COMMON_WEAK_PASSWORDS = new Set([
  "password",
  "password123",
  "admin123",
  "piket123",
  "smkn21jakarta",
  "12345678",
  "123456789",
  "qwertyuiop",
  "smkn21bisa",
  "indonesia",
]);

export interface PasswordRule {
  id: string;
  label: string;
  passed: boolean;
}

export interface PasswordCheckResult {
  valid: boolean;
  score: number; // 0 sampai 4
  rules: PasswordRule[];
  error?: string;
}

export function passwordChecks(
  pw: string,
  ctx?: {
    oldPassword?: string;
    username?: string;
    nis?: string;
    confirmPassword?: string;
  }
): PasswordCheckResult {
  const clean = pw.trim();

  const ruleLength = {
    id: "length",
    label: `Minimal ${PASSWORD_MIN} karakter`,
    passed: clean.length >= PASSWORD_MIN,
  };

  const ruleUpper = {
    id: "upper",
    label: "Mengandung huruf besar (A-Z)",
    passed: /[A-Z]/.test(clean),
  };

  const ruleLower = {
    id: "lower",
    label: "Mengandung huruf kecil (a-z)",
    passed: /[a-z]/.test(clean),
  };

  const ruleDigit = {
    id: "digit",
    label: "Mengandung angka (0-9)",
    passed: /\d/.test(clean),
  };

  const rules: PasswordRule[] = [ruleLength, ruleUpper, ruleLower, ruleDigit];
  const passedCount = rules.filter((r) => r.passed).length;
  const score = passedCount;

  // Cek error spesifik berurutan
  let error: string | undefined;

  if (!clean) {
    error = "Kata sandi baru tidak boleh kosong.";
  } else if (!ruleLength.passed) {
    error = `Kata sandi baru minimal harus ${PASSWORD_MIN} karakter.`;
  } else if (clean.length > PASSWORD_MAX) {
    error = `Kata sandi baru maksimal ${PASSWORD_MAX} karakter.`;
  } else if (!ruleUpper.passed) {
    error = "Kata sandi baru harus mengandung setidaknya satu huruf besar (A-Z).";
  } else if (!ruleLower.passed) {
    error = "Kata sandi baru harus mengandung setidaknya satu huruf kecil (a-z).";
  } else if (!ruleDigit.passed) {
    error = "Kata sandi baru harus mengandung setidaknya satu angka (0-9).";
  } else if (COMMON_WEAK_PASSWORDS.has(clean.toLowerCase())) {
    error = "Kata sandi terlalu mudah ditebak. Gunakan kombinasi yang lebih kuat.";
  } else if (ctx?.oldPassword && clean === ctx.oldPassword.trim()) {
    error = "Kata sandi baru tidak boleh sama dengan kata sandi saat ini.";
  } else if (
    ctx?.username &&
    ctx.username.trim().length >= 3 &&
    clean.toLowerCase().includes(ctx.username.trim().toLowerCase())
  ) {
    error = "Kata sandi baru tidak boleh mengandung username/NIP Anda.";
  } else if (
    ctx?.nis &&
    ctx.nis.trim().length >= 3 &&
    clean.toLowerCase().includes(ctx.nis.trim().toLowerCase())
  ) {
    error = "Kata sandi baru tidak boleh mengandung NIS Anda.";
  } else if (
    ctx?.confirmPassword !== undefined &&
    clean !== ctx.confirmPassword.trim()
  ) {
    error = "Konfirmasi kata sandi tidak cocok dengan kata sandi baru.";
  }

  const valid = !error && rules.every((r) => r.passed);

  return {
    valid,
    score,
    rules,
    error,
  };
}

