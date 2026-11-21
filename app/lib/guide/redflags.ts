import { RED_FLAG_RULES, RedFlagRule, RedFlagSeverity } from "../../data/guide/redflags";
import { EMERGENCY_MESSAGE, SELF_HARM_MESSAGE } from "../../data/guide/emergency";

export interface RedFlagCheckResult {
  matched: boolean;
  rule?: RedFlagRule;
  severity?: RedFlagSeverity;
  message?: string;
}

/**
 * Normalise raw input text for forgiving regex matching:
 * - lowercase
 * - replace punctuation, tabs and newlines with spaces
 * - collapse multi-spaces
 */
export function normaliseText(text: string): string {
  if (!text) return "";
  let s = text.toLowerCase();
  // Strip punctuation and special characters, leaving spaces
  s = s.replace(/[\p{P}\p{S}]+/gu, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Evaluates all red-flag rules against the input text.
 * Runs completely locally, deterministically, with zero network calls and zero logging.
 * Priority: self-harm rules are evaluated alongside emergency rules.
 */
export function checkRedFlags(rawText: string): RedFlagCheckResult {
  if (!rawText || !rawText.trim()) {
    return { matched: false };
  }

  const normalised = normaliseText(rawText);

  // First check self-harm specifically to ensure immediate mental health crisis response
  for (const rule of RED_FLAG_RULES) {
    if (rule.severity === "self-harm") {
      for (const pattern of rule.patterns) {
        if (pattern.test(rawText) || pattern.test(normalised)) {
          return {
            matched: true,
            rule,
            severity: "self-harm",
            message: SELF_HARM_MESSAGE,
          };
        }
      }
    }
  }

  // Then check all other emergency rules
  for (const rule of RED_FLAG_RULES) {
    if (rule.severity !== "self-harm") {
      for (const pattern of rule.patterns) {
        if (pattern.test(rawText) || pattern.test(normalised)) {
          return {
            matched: true,
            rule,
            severity: "emergency",
            message: EMERGENCY_MESSAGE,
          };
        }
      }
    }
  }

  return { matched: false };
}
