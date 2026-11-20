const SENSITIVE_AUDIT_KEY = /password|passphrase|token|secret|authorization|credential|api.?key|bank.?details|iban|swift|routing.?number|account.?number|meeting.?link|(?:url|uri)$/i;

export function redactAuditPayload(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditPayload);
  if (value === null || typeof value !== "object" || value instanceof Date) return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      SENSITIVE_AUDIT_KEY.test(key) ? "[REDACTED]" : redactAuditPayload(nestedValue),
    ]),
  );
}
