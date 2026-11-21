import { SYMPTOM_GROUPS, SymptomGroup } from "../../data/guide/symptoms";
import { NO_MATCH_MESSAGE } from "../../data/guide/emergency";
import { normaliseText } from "./redflags";

export interface MatchedGroup {
  group: SymptomGroup;
  score: number;
  confidence: "high" | "moderate" | "low";
}

export interface SymptomMatchResult {
  matched: boolean;
  groups: MatchedGroup[];
  message?: string;
}

/**
 * Score a single group against normalised text based on keyword and phrase overlap.
 */
function scoreGroup(group: SymptomGroup, normText: string, words: string[]): number {
  let score = 0;

  // Check negation for fever: if text explicitly says "without fever" or "no fever", don't score fever for fever_cold
  const hasNoFever = /\b(no|without|dont have|not having)\s+.*?\bfever\b/i.test(normText);

  // 1. Keyword matching
  for (const kw of group.keywords) {
    if (group.id === "fever_cold" && hasNoFever && (kw.includes("fever") || kw.includes("bukhar") || kw.includes("temperature"))) {
      continue;
    }

    const normKw = normaliseText(kw);
    if (!normKw) continue;

    if (normKw.includes(" ")) {
      // Check exact multi-word phrase
      if (normText.includes(normKw)) {
        score += 2.5;
      } else {
        // Check if all words of the multi-word keyword are present in text (e.g. "twisted ... ankle")
        const kwParts = normKw.split(" ");
        if (kwParts.length >= 2 && kwParts.every((part) => normText.includes(part))) {
          score += 1.8;
        }
      }
    } else {
      // Keyword matching: short words (<=4 chars) require exact word boundary to prevent false positives (e.g. gas matching gaya, tire matching tired)
      if (normKw.length <= 4) {
        const regex = new RegExp(`\\b${normKw}(s)?\\b`, "i");
        if (regex.test(normText)) {
          score += 1.4;
        }
      } else {
        const regex = new RegExp(`\\b${normKw}(s|ing|ed|y|ness)?\\b`, "i");
        if (regex.test(normText)) {
          score += 1.4;
        }
      }
    }
  }

  // 2. Secondary example phrase overlap
  for (const ex of group.examples) {
    const exWords = normaliseText(ex).split(" ").filter((w) => w.length > 3);
    let commonWordCount = 0;
    for (const w of exWords) {
      if (words.includes(w)) commonWordCount++;
    }
    if (commonWordCount >= 3) {
      score += 1.5;
    } else if (commonWordCount === 2) {
      score += 1.0;
    }
  }

  return score;
}

/**
 * Layer 1 deterministic keyword and synonym matcher for symptom groups.
 * Completely local, no network, no logging.
 */
export function matchSymptomsLayer1(rawText: string): SymptomMatchResult {
  if (!rawText || !rawText.trim()) {
    return {
      matched: false,
      groups: [],
      message: NO_MATCH_MESSAGE,
    };
  }

  const normText = normaliseText(rawText);
  const words = normText.split(" ").filter((w) => w.length > 0);

  if (words.length === 0) {
    return {
      matched: false,
      groups: [],
      message: NO_MATCH_MESSAGE,
    };
  }

  const scored: Array<{ group: SymptomGroup; score: number }> = [];

  for (const group of SYMPTOM_GROUPS) {
    const s = scoreGroup(group, normText, words);
    if (s > 0) {
      scored.push({ group, score: s });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // Confidence thresholds
  // Minimum score to qualify as match is 1.0
  const MIN_SCORE = 1.0;
  const qualifying = scored.filter((item) => item.score >= MIN_SCORE);

  if (qualifying.length === 0) {
    return {
      matched: false,
      groups: [],
      message: NO_MATCH_MESSAGE,
    };
  }

  const top = qualifying[0];
  const results: MatchedGroup[] = [
    {
      group: top.group,
      score: Math.round(top.score * 10) / 10,
      confidence: top.score >= 2.5 ? "high" : top.score >= 1.8 ? "moderate" : "low",
    },
  ];

  // If a second group has a close score (at least 70% of top and >= 1.5)
  if (qualifying.length > 1) {
    const second = qualifying[1];
    if (second.score >= 1.5 && second.score >= top.score * 0.7) {
      results.push({
        group: second.group,
        score: Math.round(second.score * 10) / 10,
        confidence: second.score >= 2.5 ? "high" : "moderate",
      });
    }
  }

  return {
    matched: true,
    groups: results,
  };
}
