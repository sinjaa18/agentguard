import { redactSensitiveText } from "./redaction.ts";

export function redactTelemetryText(input: string): string {
  return redactSensitiveText(input).slice(0, 2_000);
}
