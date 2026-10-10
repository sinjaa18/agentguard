const SECRET_ASSIGNMENT_PATTERN = /(["']?)\b(GEMINI_API_KEY|api[_-]?key|authorization|access[_-]?token|refresh[_-]?token|password|client[_-]?secret|private[_-]?key|secret|token)\b\1(\s*[:=]\s*)(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s,;}\]]+)/gi;
const SECRET_PATTERNS = [
  /\bAIza[0-9A-Za-z_-]{20,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9]+ )*PRIVATE KEY-----/g,
];

const EMAIL_PATTERN = /\b[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z]{2,})+)\b/gi;
const PHONE_PATTERN = /(?<!\w)(?:\+?\d[\s().-]*){9,14}\d(?!\w)/g;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/g;
const CARD_PATTERN = /\b(?:\d[ -]*?){13,19}\b/g;
const CREDENTIAL_FIELDS = new Set(["geminiapikey", "apikey", "authorization", "accesstoken", "refreshtoken", "password", "clientsecret", "privatekey", "secret", "token"]);

export function isSensitiveCredentialField(key: string): boolean {
  return CREDENTIAL_FIELDS.has(key.replace(/[_-]/g, "").toLowerCase());
}

function passesLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export type DirectIdentifierCategory = "EMAIL" | "PHONE" | "GOVERNMENT_ID" | "PAYMENT_CARD";

/** Conservative detectors for common direct identifiers; this is not general PII detection. */
export function detectDirectIdentifiers(value: string): DirectIdentifierCategory[] {
  const categories = new Set<DirectIdentifierCategory>();
  if ([...value.matchAll(new RegExp(EMAIL_PATTERN.source, EMAIL_PATTERN.flags))].some((match) => !isReservedExampleDomain(match[1]))) categories.add("EMAIL");
  if (PHONE_PATTERN.test(value)) categories.add("PHONE");
  PHONE_PATTERN.lastIndex = 0;
  if (SSN_PATTERN.test(value)) categories.add("GOVERNMENT_ID");
  SSN_PATTERN.lastIndex = 0;
  if ([...value.matchAll(CARD_PATTERN)].some((match) => passesLuhn(match[0]))) categories.add("PAYMENT_CARD");
  CARD_PATTERN.lastIndex = 0;
  return [...categories];
}

function isReservedExampleDomain(domain: string): boolean {
  const normalized = domain.toLowerCase();
  return normalized === "example.com" || normalized === "example.net" || normalized === "example.org"
    || normalized.endsWith(".example") || normalized.endsWith(".test") || normalized.endsWith(".invalid");
}

export function redactSensitiveText(value: string): string {
  const { text: credentialsRedacted } = redactCredentials(value);
  const withoutEmails = credentialsRedacted.replace(EMAIL_PATTERN, "[REDACTED_EMAIL]");
  const withoutCards = withoutEmails.replace(CARD_PATTERN, (candidate) => passesLuhn(candidate) ? "[REDACTED_PAYMENT_CARD]" : candidate);
  const withoutGovernmentIds = withoutCards.replace(SSN_PATTERN, "[REDACTED_GOVERNMENT_ID]");
  return withoutGovernmentIds.replace(PHONE_PATTERN, "[REDACTED_PHONE]");
}

export function redactCredentials(value: string): { text: string; redactionCount: number } {
  let text = value;
  let redactionCount = 0;
  redactionCount += [...text.matchAll(new RegExp(SECRET_ASSIGNMENT_PATTERN.source, SECRET_ASSIGNMENT_PATTERN.flags))].length;
  text = text.replace(SECRET_ASSIGNMENT_PATTERN, (_match, quote: string, key: string, separator: string) => {
    const valueMarker = quote ? '"[REDACTED]"' : "[REDACTED]";
    return `${quote}${key}${quote}${separator}${valueMarker}`;
  });
  for (const pattern of SECRET_PATTERNS) {
    redactionCount += [...text.matchAll(new RegExp(pattern.source, pattern.flags))].length;
    text = text.replace(pattern, "[REDACTED]");
  }
  return { text, redactionCount };
}

export function redactSensitiveValue<T>(value: T): T {
  if (typeof value === "string") return redactSensitiveText(value).slice(0, 8_000) as T;
  if (Array.isArray(value)) return value.map((item) => redactSensitiveValue(item)) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      redactSensitiveText(key),
      isSensitiveCredentialField(key) ? "[REDACTED]" : redactSensitiveValue(item),
    ])) as T;
  }
  return value;
}
