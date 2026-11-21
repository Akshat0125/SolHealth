import { RED_FLAG_TEST_CASES, IN_SCOPE_TEST_CASES, OUT_OF_SCOPE_TEST_CASES, InScopeTestCase, RedFlagTestCase } from "./dataset";
import { checkRedFlags } from "../../app/lib/guide/redflags";
import { matchSymptomsLayer1 } from "../../app/lib/guide/symptoms";

export interface CalibrationReport {
  tuning: {
    redFlagRecall: number;
    inScopeAccuracy: number;
    outOfScopeNoMatchRate: number;
  };
  validation: {
    redFlagRecall: number;
    inScopeAccuracy: number;
    outOfScopeNoMatchRate: number;
  };
  overall: {
    redFlagRecall: number;
    inScopeAccuracy: number;
    outOfScopeNoMatchRate: number;
  };
  passed: boolean;
}

export function runCalibration(): CalibrationReport {
  // 1. Partition dataset evenly into Tuning (even indices) and Validation (odd indices)
  const tuningRedFlags = RED_FLAG_TEST_CASES.filter((_, i) => i % 2 === 0);
  const validationRedFlags = RED_FLAG_TEST_CASES.filter((_, i) => i % 2 !== 0);

  const tuningInScope = IN_SCOPE_TEST_CASES.filter((_, i) => i % 2 === 0);
  const validationInScope = IN_SCOPE_TEST_CASES.filter((_, i) => i % 2 !== 0);

  const tuningOutOfScope = OUT_OF_SCOPE_TEST_CASES.filter((_, i) => i % 2 === 0);
  const validationOutOfScope = OUT_OF_SCOPE_TEST_CASES.filter((_, i) => i % 2 !== 0);

  function evaluateRedFlags(cases: RedFlagTestCase[]) {
    let matched = 0;
    for (const c of cases) {
      const res = checkRedFlags(c.text);
      if (res.matched) {
        matched++;
      } else {
        console.warn(`[RedFlag Miss] "${c.text}"`);
      }
    }
    return cases.length > 0 ? (matched / cases.length) * 100 : 100;
  }

  function evaluateInScope(cases: InScopeTestCase[]) {
    let correct = 0;
    for (const c of cases) {
      // Red flags should not trigger on standard in-scope cases
      const rf = checkRedFlags(c.text);
      if (rf.matched) {
        // If red flag triggered on an intentional in-scope phrase, that is not counted as correct group
        continue;
      }
      const res = matchSymptomsLayer1(c.text);
      if (res.matched && res.groups.some((g) => g.group.id === c.expectedGroupId)) {
        correct++;
      } else {
        console.warn(`[InScope Miss] "${c.text}" -> Expected: ${c.expectedGroupId}, Got: ${res.groups.map(g => g.group.id).join(", ") || "none"}`);
      }
    }
    return cases.length > 0 ? (correct / cases.length) * 100 : 0;
  }

  function evaluateOutOfScope(cases: string[]) {
    let noMatchCount = 0;
    for (const text of cases) {
      const rf = checkRedFlags(text);
      if (rf.matched) {
        continue;
      }
      const res = matchSymptomsLayer1(text);
      if (!res.matched || res.groups.length === 0) {
        noMatchCount++;
      } else {
        console.warn(`[OutOfScope FalsePositive] "${text}" -> Matched: ${res.groups.map(g => g.group.id).join(", ")}`);
      }
    }
    return cases.length > 0 ? (noMatchCount / cases.length) * 100 : 100;
  }

  const tRf = evaluateRedFlags(tuningRedFlags);
  const tIn = evaluateInScope(tuningInScope);
  const tOut = evaluateOutOfScope(tuningOutOfScope);

  const vRf = evaluateRedFlags(validationRedFlags);
  const vIn = evaluateInScope(validationInScope);
  const vOut = evaluateOutOfScope(validationOutOfScope);

  const allRf = evaluateRedFlags(RED_FLAG_TEST_CASES);
  const allIn = evaluateInScope(IN_SCOPE_TEST_CASES);
  const allOut = evaluateOutOfScope(OUT_OF_SCOPE_TEST_CASES);

  const passed =
    vRf === 100 &&
    vIn >= 85 &&
    vOut >= 95;

  return {
    tuning: {
      redFlagRecall: Math.round(tRf * 10) / 10,
      inScopeAccuracy: Math.round(tIn * 10) / 10,
      outOfScopeNoMatchRate: Math.round(tOut * 10) / 10,
    },
    validation: {
      redFlagRecall: Math.round(vRf * 10) / 10,
      inScopeAccuracy: Math.round(vIn * 10) / 10,
      outOfScopeNoMatchRate: Math.round(vOut * 10) / 10,
    },
    overall: {
      redFlagRecall: Math.round(allRf * 10) / 10,
      inScopeAccuracy: Math.round(allIn * 10) / 10,
      outOfScopeNoMatchRate: Math.round(allOut * 10) / 10,
    },
    passed,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = runCalibration();
  console.log("\n================ CALIBRATION RESULTS ================");
  console.log("TUNING SET (50%):");
  console.log(`- Red-Flag Recall:       ${report.tuning.redFlagRecall}%`);
  console.log(`- In-Scope Accuracy:     ${report.tuning.inScopeAccuracy}%`);
  console.log(`- Out-of-Scope No-Match: ${report.tuning.outOfScopeNoMatchRate}%`);
  console.log("\nVALIDATION SET (50%):");
  console.log(`- Red-Flag Recall:       ${report.validation.redFlagRecall}% (Target: 100%)`);
  console.log(`- In-Scope Accuracy:     ${report.validation.inScopeAccuracy}% (Target: >=85%)`);
  console.log(`- Out-of-Scope No-Match: ${report.validation.outOfScopeNoMatchRate}% (Target: >=95%)`);
  console.log("\nOVERALL METRICS:");
  console.log(`- Red-Flag Recall:       ${report.overall.redFlagRecall}%`);
  console.log(`- In-Scope Accuracy:     ${report.overall.inScopeAccuracy}%`);
  console.log(`- Out-of-Scope No-Match: ${report.overall.outOfScopeNoMatchRate}%`);
  console.log("=====================================================\n");

  if (report.passed) {
    console.log("✓ Calibration acceptance criteria passed!");
    process.exit(0);
  } else {
    console.error("✗ Calibration did not meet target thresholds.");
    process.exit(1);
  }
}
