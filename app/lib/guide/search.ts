import MiniSearch from "minisearch";
import { FAQ_ENTRIES, FaqEntry, GuideRole } from "../../data/guide/faq";

export interface FaqSearchResult {
  entry: FaqEntry;
  score: number;
}

export interface FaqSearchResponse {
  results: FaqSearchResult[];
  isFallback: boolean;
  suggestions: FaqEntry[];
}

let miniSearchInstance: MiniSearch<FaqEntry> | null = null;

function getMiniSearch(): MiniSearch<FaqEntry> {
  if (miniSearchInstance) return miniSearchInstance;

  const ms = new MiniSearch<FaqEntry>({
    fields: ["question", "keywords", "answer"],
    storeFields: ["id", "question", "keywords", "answer", "roles", "nextAction"],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: {
        question: 3,
        keywords: 2.5,
        answer: 1,
      },
    },
    extractField: (document, fieldName) => {
      if (fieldName === "keywords") {
        return Array.isArray(document.keywords) ? document.keywords.join(" ") : "";
      }
      return (document as any)[fieldName] || "";
    },
  });

  ms.addAll(FAQ_ENTRIES);
  miniSearchInstance = ms;
  return ms;
}

/**
 * Get role-tailored top 3 suggestions when search returns no match or for quick replies.
 */
export function getSuggestions(role: GuideRole = "all", currentRoute?: string): FaqEntry[] {
  // Filter entries matching the role or all
  const pool = FAQ_ENTRIES.filter(
    (e) => e.roles.includes(role) || e.roles.includes("all")
  );

  // If specific route, prefer entries with that nextAction route
  if (currentRoute) {
    const routeMatched = pool.filter((e) => e.nextAction?.route === currentRoute);
    if (routeMatched.length >= 3) {
      return routeMatched.slice(0, 3);
    }
  }

  // Pre-selected defaults by role
  if (role === "patient") {
    const ids = ["patient_upload_record", "patient_share_doctor", "patient_check_integrity"];
    const found = ids.map((id) => FAQ_ENTRIES.find((e) => e.id === id)!).filter(Boolean);
    if (found.length === 3) return found;
  } else if (role === "doctor") {
    const ids = ["doctor_not_verified", "doctor_open_record", "doctor_activate_encryption"];
    const found = ids.map((id) => FAQ_ENTRIES.find((e) => e.id === id)!).filter(Boolean);
    if (found.length === 3) return found;
  } else if (role === "publisher") {
    const ids = ["publisher_setup_registry", "publisher_verify_doctor", "publisher_revoke_doctor"];
    const found = ids.map((id) => FAQ_ENTRIES.find((e) => e.id === id)!).filter(Boolean);
    if (found.length === 3) return found;
  }

  // Default general suggestions
  const defaultIds = ["what_is_solhealth", "devnet_and_test_sol", "connect_wallet"];
  return defaultIds.map((id) => FAQ_ENTRIES.find((e) => e.id === id)!).filter(Boolean);
}

/**
 * Search the FAQ entries with fuzzy, prefix, role and route boosting.
 */
export function searchFaq(
  query: string,
  options?: {
    role?: GuideRole;
    route?: string;
  }
): FaqSearchResponse {
  const clean = (query || "").trim();
  const role = options?.role || "all";
  const route = options?.route || "";

  if (!clean) {
    return {
      results: [],
      isFallback: true,
      suggestions: getSuggestions(role, route),
    };
  }

  const ms = getMiniSearch();
  const rawResults = ms.search(clean, {
    prefix: true,
    fuzzy: (term) => (term.length > 3 ? 0.2 : false),
  });

  // Score adjustments: boost relevant roles and matching routes
  const scored: FaqSearchResult[] = [];

  for (const res of rawResults) {
    const entry = FAQ_ENTRIES.find((e) => e.id === res.id);
    if (!entry) continue;

    let boostedScore = res.score;
    // Boost if matches user's active role
    if (role !== "all" && entry.roles.includes(role)) {
      boostedScore *= 1.4;
    }
    // Boost if targets user's current route
    if (route && entry.nextAction?.route === route) {
      boostedScore *= 1.25;
    }

    scored.push({
      entry,
      score: boostedScore,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Confidence cutoff
  const CONFIDENCE_CUTOFF = 1.2;
  const filtered = scored.filter((item) => item.score >= CONFIDENCE_CUTOFF);

  if (filtered.length > 0) {
    return {
      results: filtered.slice(0, 3),
      isFallback: false,
      suggestions: [],
    };
  }

  // Fallback to suggestions
  return {
    results: [],
    isFallback: true,
    suggestions: getSuggestions(role, route),
  };
}
