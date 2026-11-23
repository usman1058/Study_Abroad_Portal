type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function zonedParts(date: Date, timeZone: string): LocalDateTimeParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
  };
}

/** Convert a datetime-local value interpreted in an explicit IANA zone to UTC. */
export function localDateTimeInZoneToDate(value: string, timeZone: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
  };
  const targetEpoch = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
  );
  const normalized = new Date(targetEpoch);
  if (
    normalized.getUTCFullYear() !== desired.year ||
    normalized.getUTCMonth() !== desired.month - 1 ||
    normalized.getUTCDate() !== desired.day ||
    desired.hour > 23 ||
    desired.minute > 59
  ) return null;

  try {
    let candidate = targetEpoch;
    for (let i = 0; i < 4; i++) {
      const actual = zonedParts(new Date(candidate), timeZone);
      const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
      const offset = targetEpoch - actualAsUtc;
      candidate += offset;
      if (offset === 0) break;
    }
    const result = new Date(candidate);
    const roundTrip = zonedParts(result, timeZone);
    if (Object.keys(desired).some((key) => roundTrip[key as keyof LocalDateTimeParts] !== desired[key as keyof LocalDateTimeParts])) {
      // Daylight-saving gaps have local times that never occur in this zone.
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

export function formatInTimeZone(value: Date | string, timeZone: string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "Time to be confirmed";
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}
