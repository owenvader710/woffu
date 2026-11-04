/** Validate untrusted login JSON before calling the authentication provider. */
export type LoginCredentials = { email: string; password: string };

export function parseLoginCredentials(value: unknown): LoginCredentials | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.email !== "string" || typeof input.password !== "string") return null;

  const email = input.email.trim();
  if (!email || email.length > 320 || !input.password) return null;
  return { email, password: input.password };
}
