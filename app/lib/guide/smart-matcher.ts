"use client";

import { matchSymptomsLayer1, SymptomMatchResult } from "./symptoms";
import { SYMPTOM_GROUPS } from "../../data/guide/symptoms";

export type SmartMatcherStatus = "idle" | "loading" | "ready" | "error";

export interface SmartMatcherState {
  enabled: boolean;
  status: SmartMatcherStatus;
  progress: number;
  message: string;
  error: string | null;
}

class SmartMatcherService {
  private worker: Worker | null = null;
  private status: SmartMatcherStatus = "idle";
  private progress: number = 0;
  private message: string = "";
  private error: string | null = null;
  private listeners = new Set<(state: SmartMatcherState) => void>();
  private pendingMatches = new Map<string, { resolve: (res: SymptomMatchResult) => void; timer: any }>();

  public getState(enabled: boolean): SmartMatcherState {
    return {
      enabled,
      status: this.status,
      progress: this.progress,
      message: this.message,
      error: this.error,
    };
  }

  public subscribe(cb: (state: SmartMatcherState) => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notify(enabled: boolean) {
    const s = this.getState(enabled);
    for (const l of this.listeners) l(s);
  }

  public initWorker(enabled: boolean) {
    if (typeof window === "undefined" || !window.Worker) {
      this.status = "error";
      this.error = "Web Workers not supported in this environment.";
      this.notify(enabled);
      return;
    }

    if (this.worker || this.status === "loading" || this.status === "ready") {
      return;
    }

    this.status = "loading";
    this.progress = 5;
    this.message = "Initializing Web Worker...";
    this.notify(enabled);

    try {
      this.worker = new Worker(new URL("../../workers/guide-embed.ts", import.meta.url), {
        type: "module",
      });

      this.worker.onmessage = (e: MessageEvent) => {
        const data = e.data || {};
        if (data.type === "progress") {
          this.progress = data.progress || 0;
          this.message = data.message || (data.status === "downloading" ? `Downloading model (${this.progress}%)...` : "Loading model...");
          this.notify(enabled);
        } else if (data.type === "ready") {
          this.status = "ready";
          this.progress = 100;
          this.message = "Ready";
          this.error = null;
          this.notify(enabled);
        } else if (data.type === "error") {
          this.status = "error";
          this.error = data.message || "Model error";
          this.notify(enabled);
        } else if (data.type === "match_result") {
          this.handleMatchResult(data.result);
        }
      };

      this.worker.onerror = (err) => {
        this.status = "error";
        this.error = err.message || "Worker error";
        this.notify(enabled);
      };

      this.worker.postMessage({ type: "init" });
    } catch (err: any) {
      this.status = "error";
      this.error = err?.message || "Failed to create worker";
      this.notify(enabled);
    }
  }

  private handleMatchResult(rawResult: any) {
    // Resolve oldest pending match
    const entries = Array.from(this.pendingMatches.entries());
    if (entries.length === 0) return;
    const [key, pending] = entries[0];
    clearTimeout(pending.timer);
    this.pendingMatches.delete(key);

    if (!rawResult || !rawResult.matched || !rawResult.groups?.length) {
      pending.resolve({
        matched: false,
        groups: [],
        message: "I can't suggest precautions for that. Please consult a doctor.",
      });
      return;
    }

    const resolvedGroups = rawResult.groups
      .map((g: any) => {
        const groupObj = SYMPTOM_GROUPS.find((sg) => sg.id === g.groupId);
        if (!groupObj) return null;
        return {
          group: groupObj,
          score: g.score,
          confidence: g.confidence,
        };
      })
      .filter(Boolean);

    pending.resolve({
      matched: resolvedGroups.length > 0,
      groups: resolvedGroups,
    });
  }

  public async match(text: string, enabled: boolean): Promise<SymptomMatchResult> {
    // Layer 1 keyword matcher always runs first as baseline
    const layer1Result = matchSymptomsLayer1(text);

    if (!enabled || this.status !== "ready" || !this.worker) {
      return layer1Result;
    }

    // Extract keyword scores per group for Layer 2 hybrid calculation
    const keywordScores: Record<string, number> = {};
    for (const g of layer1Result.groups) {
      keywordScores[g.group.id] = g.score;
    }

    const matchId = `${Date.now()}_${Math.random()}`;

    return new Promise((resolve) => {
      // Timeout fallback: if worker takes > 6s, silently use Layer 1
      const timer = setTimeout(() => {
        this.pendingMatches.delete(matchId);
        resolve(layer1Result);
      }, 6000);

      this.pendingMatches.set(matchId, { resolve, timer });

      this.worker!.postMessage({
        type: "match",
        text,
        keywordScores,
      });
    });
  }
}

export const smartMatcher = new SmartMatcherService();
