/**
 * «2 h ago», «3 d ago», «Never»: lo que un operador quiere leer en una columna
 * de último uso. La fecha exacta va en el `title`/tooltip, no aquí.
 */
export function relativeTime(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) {
    return 'Never';
  }
  const date = value instanceof Date ? value : new Date(value);
  const time = date.getTime();
  if (Number.isNaN(time)) {
    return 'Never';
  }

  const seconds = Math.round((now.getTime() - time) / 1000);
  if (seconds < 0) {
    return 'In the future';
  }
  if (seconds < 60) {
    return 'Just now';
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days} d ago`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)} wk ago`;
  }
  if (days < 365) {
    return `${Math.floor(days / 30)} mo ago`;
  }
  return `${Math.floor(days / 365)} yr ago`;
}

/** Fecha y hora locales, o «—»: para el tooltip que acompaña a `relativeTime`. */
export function absoluteTime(value: string | Date | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}
