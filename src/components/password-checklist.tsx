const RULES = [
  { key: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { key: "letter", label: "One letter", test: (value: string) => /[A-Za-z]/.test(value) },
  { key: "number", label: "One number", test: (value: string) => /[0-9]/.test(value) },
] as const;

export function isStrongPassword(value: string): boolean {
  return RULES.every((rule) => rule.test(value));
}

export function PasswordChecklist({ value, id }: { value: string; id?: string }) {
  return (
    <ul id={id} className="mt-2 space-y-1 text-xs text-ink-muted">
      {RULES.map((rule) => {
        const passed = rule.test(value);
        return (
          <li key={rule.key} className={passed ? "text-emerald-600 dark:text-emerald-400" : undefined}>
            <span aria-hidden>{passed ? "✓" : "•"}</span> {rule.label}
            <span className="sr-only">{passed ? " (met)" : " (not met)"}</span>
          </li>
        );
      })}
    </ul>
  );
}
