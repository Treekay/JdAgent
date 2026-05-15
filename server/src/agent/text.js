export function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function stringArray(value) {
  return Array.isArray(value)
    ? value.map((item) => text(item)).filter(Boolean)
    : [];
}

export function objectArray(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

export function clip(value, length = 14000) {
  return text(value).slice(0, length);
}

export function summarizeCount(label, items) {
  return `${Array.isArray(items) ? items.length : 0} ${label}`;
}
