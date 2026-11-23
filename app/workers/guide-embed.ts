// Web Worker for Guide Bot Layer 2 Smart Matching (embeddings)
// Uses Xenova/all-MiniLM-L6-v2 quantized model in single-threaded WASM.
// No COOP/COEP headers required.

import { SYMPTOM_GROUPS } from "../data/guide/symptoms";

interface CachedGroupVector {
  groupId: string;
  vectors: Float32Array[];
}

let extractor: any = null;
let cachedGroupVectors: CachedGroupVector[] = [];
let isInitializing = false;

function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function magnitude(v: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i];
  }
  return Math.sqrt(sum);
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(a, b) / (magA * magB);
}

async function loadTransformers() {
  let tf: any = null;
  try {
    tf = await import("@huggingface/transformers");
  } catch (err) {
    // Plan B: CDN dynamic import
    // @ts-expect-error CDN dynamic import
    tf = await import("https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3");
  }

  const { pipeline, env } = tf;
  env.allowLocalModels = false;
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.numThreads = 1;
  }

  return tf;
}

async function initExtractor() {
  if (extractor) return extractor;
  if (isInitializing) return null;
  isInitializing = true;

  try {
    const { pipeline } = await loadTransformers();

    self.postMessage({
      type: "progress",
      status: "loading_model",
      progress: 0,
      message: "Loading MiniLM model...",
    });

    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      progress_callback: (item: any) => {
        if (item.status === "progress") {
          self.postMessage({
            type: "progress",
            status: "downloading",
            progress: Math.round(item.progress || 0),
            file: item.file,
          });
        }
      },
    });

    self.postMessage({
      type: "progress",
      status: "embedding_examples",
      progress: 100,
      message: "Caching symptom embeddings...",
    });

    // Embed all groups' examples once
    cachedGroupVectors = [];
    for (const group of SYMPTOM_GROUPS) {
      const vectors: Float32Array[] = [];
      for (const ex of group.examples) {
        const out = await extractor(ex, { pooling: "mean", normalize: true });
        vectors.push(new Float32Array(out.data));
      }
      cachedGroupVectors.push({
        groupId: group.id,
        vectors,
      });
    }

    self.postMessage({
      type: "ready",
      message: "Smart matching model ready",
    });

    isInitializing = false;
    return extractor;
  } catch (error: any) {
    isInitializing = false;
    self.postMessage({
      type: "error",
      message: error?.message || "Failed to initialize embedding model",
    });
    throw error;
  }
}

async function matchText(text: string, keywordScores: Record<string, number> = {}) {
  if (!extractor) {
    await initExtractor();
  }

  const out = await extractor(text, { pooling: "mean", normalize: true });
  const textVector = new Float32Array(out.data);

  const scoredGroups: Array<{ groupId: string; score: number; cosSim: number; kwScore: number }> = [];

  for (const item of cachedGroupVectors) {
    let maxCosSim = 0;
    for (const v of item.vectors) {
      const sim = cosineSimilarity(textVector, v);
      if (sim > maxCosSim) maxCosSim = sim;
    }

    const kwScore = keywordScores[item.groupId] || 0;
    // Normalized keyword score capped at 1.0 (approx 2.5 pts = 1.0)
    const normKw = Math.min(kwScore / 2.5, 1.0);

    // Weighted blend: 65% semantic cosine similarity, 35% keyword match
    // When semantic similarity is very high (> 0.55), semantic dominates
    const combinedScore = maxCosSim * 0.65 + normKw * 0.35;

    scoredGroups.push({
      groupId: item.groupId,
      score: combinedScore,
      cosSim: maxCosSim,
      kwScore,
    });
  }

  scoredGroups.sort((a, b) => b.score - a.score);

  // Calibrated threshold: combined score >= 0.38 for in-scope
  const THRESHOLD = 0.38;
  const qualifying = scoredGroups.filter((g) => g.score >= THRESHOLD);

  if (qualifying.length === 0) {
    return {
      matched: false,
      groups: [],
    };
  }

  const top = qualifying[0];
  const results = [
    {
      groupId: top.groupId,
      score: Math.round(top.score * 100) / 100,
      confidence: top.score >= 0.55 ? "high" : "moderate",
    },
  ];

  if (qualifying.length > 1) {
    const second = qualifying[1];
    // Include second group only if close to top
    if (second.score >= 0.35 && second.score >= top.score * 0.8) {
      results.push({
        groupId: second.groupId,
        score: Math.round(second.score * 100) / 100,
        confidence: "moderate",
      });
    }
  }

  return {
    matched: true,
    groups: results,
  };
}

self.onmessage = async (e: MessageEvent) => {
  const { type, text, keywordScores } = e.data || {};

  if (type === "init") {
    try {
      await initExtractor();
    } catch {
      // error posted inside initExtractor
    }
  } else if (type === "match") {
    try {
      const result = await matchText(text, keywordScores);
      self.postMessage({
        type: "match_result",
        result,
      });
    } catch (err: any) {
      self.postMessage({
        type: "error",
        message: err?.message || "Matching error",
      });
    }
  }
};
