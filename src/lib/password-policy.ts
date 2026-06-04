export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 72;

export const COMMON_WEAK_PASSWORDS = new Set([
  "12345678",
  "password",
  "password123",
  "admin123",
  "qwerty123",
]);

export function isCommonWeakPassword(password: string): boolean {
  return COMMON_WEAK_PASSWORDS.has(password.toLowerCase());
}

export function validatePasswordPolicy(password: string): string | null {
  if (!password) {
    return "Password is required";
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or less`;
  }

  if (isCommonWeakPassword(password)) {
    return "Password is too common";
  }

  return null;
}
