import { FAQ_ENTRIES } from "../../app/data/guide/faq";
import { SYMPTOM_GROUPS } from "../../app/data/guide/symptoms";
import { DISCLAIMER, EMERGENCY_MESSAGE, SELF_HARM_MESSAGE, PRIVACY_NOTE, NO_MATCH_MESSAGE } from "../../app/data/guide/emergency";

const FORBIDDEN_WORDS = [
  "paracetamol",
  "acetaminophen",
  "ibuprofen",
  "aspirin",
  "diclofenac",
  "azithromycin",
  "amoxicillin",
  "cetirizine",
  "dolo",
  "crocin",
  "tablet",
  "mg",
  "dose",
  "dosage",
  "you have",
  "you probably",
  "diagnos",
];

export function runContentTests(): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Verify FAQ entries
  if (FAQ_ENTRIES.length < 28 || FAQ_ENTRIES.length > 32) {
    errors.push(`Expected 28 to 32 FAQ entries, found ${FAQ_ENTRIES.length}`);
  }

  for (const entry of FAQ_ENTRIES) {
    const wordCount = entry.answer.trim().split(/\s+/).length;
    if (wordCount > 60) {
      errors.push(`FAQ entry "${entry.id}" exceeds 60 words (${wordCount} words)`);
    }

    if (entry.answer.includes("Issuer")) {
      errors.push(`FAQ entry "${entry.id}" contains forbidden word "Issuer" (must use "Publisher")`);
    }

    const fullText = `${entry.question} ${entry.answer} ${entry.keywords.join(" ")}`;
    for (const forbidden of FORBIDDEN_WORDS) {
      const regex = new RegExp(`\\b${forbidden}`, "i");
      if (regex.test(fullText)) {
        errors.push(`FAQ entry "${entry.id}" contains forbidden term: "${forbidden}"`);
      }
    }
  }

  // 2. Verify Symptom groups
  if (SYMPTOM_GROUPS.length !== 14) {
    errors.push(`Expected exactly 14 symptom groups, found ${SYMPTOM_GROUPS.length}`);
  }

  for (const group of SYMPTOM_GROUPS) {
    if (!group.precautions || group.precautions.length === 0) {
      errors.push(`Group "${group.id}" has empty precautions`);
    }
    if (!group.seeSomeoneIf || group.seeSomeoneIf.length === 0) {
      errors.push(`Group "${group.id}" has empty seeSomeoneIf`);
    }

    const fullGroupText = [
      group.title,
      ...group.keywords,
      ...group.examples,
      ...group.precautions,
      ...group.seeSomeoneIf,
    ].join(" ");

    for (const forbidden of FORBIDDEN_WORDS) {
      const regex = new RegExp(`\\b${forbidden}`, "i");
      if (regex.test(fullGroupText)) {
        errors.push(`Symptom group "${group.id}" contains forbidden term: "${forbidden}"`);
      }
    }
  }

  // 3. Verify emergency constants exist
  if (!EMERGENCY_MESSAGE.includes("112")) {
    errors.push("EMERGENCY_MESSAGE must mention 112");
  }
  if (!SELF_HARM_MESSAGE.includes("14416")) {
    errors.push("SELF_HARM_MESSAGE must mention Tele-MANAS helpline 14416");
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

// Run standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runContentTests();
  if (result.passed) {
    console.log("✓ Content tests passed successfully: 0 forbidden terms, all rules met.");
    process.exit(0);
  } else {
    console.error("✗ Content tests failed:\n" + result.errors.join("\n"));
    process.exit(1);
  }
}
