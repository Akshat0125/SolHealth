"use client";

import React, { useState, useEffect, useRef, useId } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGuideContext, getNextStep } from "@/lib/guide/context";
import { searchFaq, getSuggestions, FaqSearchResult } from "@/lib/guide/search";
import { checkRedFlags, RedFlagCheckResult } from "@/lib/guide/redflags";
import { matchSymptomsLayer1, SymptomMatchResult } from "@/lib/guide/symptoms";
import { smartMatcher, SmartMatcherState } from "@/lib/guide/smart-matcher";
import { FaqEntry, GuideRole } from "@/data/guide/faq";
import { DISCLAIMER, PRIVACY_NOTE, EMERGENCY_MESSAGE, SELF_HARM_MESSAGE } from "@/data/guide/emergency";
import { X, Send, ArrowRight, ShieldAlert, CheckCircle2 } from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  nextAction?: {
    label: string;
    route?: string;
  };
  suggestions?: FaqEntry[];
}

interface GuidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuidePanel({ isOpen, onClose }: GuidePanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const guideContext = useGuideContext();

  const [activeTab, setActiveTab] = useState<"help" | "symptoms">("help");
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Symptom tab state (cleared on close or tab change)
  const [symptomText, setSymptomText] = useState("");
  const [symptomLoading, setSymptomLoading] = useState(false);
  const [redFlagResult, setRedFlagResult] = useState<RedFlagCheckResult | null>(null);
  const [symptomResult, setSymptomResult] = useState<SymptomMatchResult | null>(null);

  // Smart matching toggle state
  const [smartMatchingEnabled, setSmartMatchingEnabled] = useState(false);
  const [smartState, setSmartState] = useState<SmartMatcherState>(smartMatcher.getState(false));

  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const titleId = useId();

  // Route-based role checking: only /patient sees symptom tab
  const isPatientRoute = Boolean(pathname && pathname.includes("/patient"));

  // Ensure non-patients cannot stay on symptoms tab
  useEffect(() => {
    if (!isPatientRoute && activeTab === "symptoms") {
      setActiveTab("help");
    }
  }, [isPatientRoute, activeTab]);

  // Subscribe to smart matcher state updates
  useEffect(() => {
    const unsub = smartMatcher.subscribe((state) => {
      setSmartState(state);
    });
    return unsub;
  }, []);

  // When smart matching is turned on, initialize worker
  const handleToggleSmartMatching = (enabled: boolean) => {
    setSmartMatchingEnabled(enabled);
    if (enabled) {
      smartMatcher.initWorker(true);
    }
  };

  // Keyboard accessibility: Escape closes, Focus Trap inside panel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-scroll chat messages
  useEffect(() => {
    if (activeTab === "help") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Clear symptom input and results whenever panel closes or tab changes
  useEffect(() => {
    if (!isOpen || activeTab !== "symptoms") {
      setSymptomText("");
      setRedFlagResult(null);
      setSymptomResult(null);
    }
  }, [isOpen, activeTab]);

  // Seed initial welcome message if chat is empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          sender: "bot",
          text: "Hello! I am SolHealth Orbit, your on-chain health records assistant. How can I assist you with using the platform today?",
          suggestions: getSuggestions(guideContext.activeRole === "home" ? "all" : (guideContext.activeRole as GuideRole), pathname || undefined),
        },
      ]);
    }
  }, [isOpen, messages.length, guideContext.activeRole, pathname]);

  if (!isOpen) return null;

  // Handle Asking FAQ Question
  const handleAskQuestion = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    const userMsgId = `user_${Date.now()}`;
    const botMsgId = `bot_${Date.now()}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, sender: "user", text: trimmed },
    ];

    const currentRole: GuideRole = guideContext.activeRole === "home" ? "all" : (guideContext.activeRole as GuideRole);
    const searchRes = searchFaq(trimmed, { role: currentRole, route: pathname || undefined });

    if (!searchRes.isFallback && searchRes.results.length > 0) {
      const top = searchRes.results[0].entry;
      newMessages.push({
        id: botMsgId,
        sender: "bot",
        text: top.answer,
        nextAction: top.nextAction,
      });
    } else {
      newMessages.push({
        id: botMsgId,
        sender: "bot",
        text: "I could not find an exact match for that question. Here are some related topics that might help:",
        suggestions: searchRes.suggestions,
      });
    }

    setMessages(newMessages);
    setQuery("");
  };

  // Handle "What should I do next?" trigger
  const handleNextStepClick = () => {
    const next = getNextStep(guideContext, pathname || undefined);
    const userMsgId = `user_${Date.now()}`;
    const botMsgId = `bot_${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: "What should I do next?" },
      {
        id: botMsgId,
        sender: "bot",
        text: next.sentence,
        nextAction: next.route ? { label: next.label || "Continue", route: next.route } : undefined,
      },
    ]);
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: "bot",
        text: "Conversation cleared. What can SolHealth Orbit help you with?",
        suggestions: getSuggestions(guideContext.activeRole === "home" ? "all" : (guideContext.activeRole as GuideRole), pathname || undefined),
      },
    ]);
  };

  // Handle Symptom Form Submit
  const handleSymptomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = symptomText.trim();
    if (!text) return;

    setSymptomLoading(true);
    setRedFlagResult(null);
    setSymptomResult(null);

    // Rule 1: Red flags run FIRST, raw text, purely rules, no AI
    const redFlag = checkRedFlags(text);
    if (redFlag.matched) {
      setRedFlagResult(redFlag);
      setSymptomLoading(false);
      return;
    }

    // Rule 2: If no red flag, evaluate symptoms
    try {
      if (smartMatchingEnabled && smartState.status === "ready") {
        const hybridRes = await smartMatcher.match(text, true);
        setSymptomResult(hybridRes);
      } else {
        const layer1Res = matchSymptomsLayer1(text);
        setSymptomResult(layer1Res);
      }
    } catch {
      const fallback = matchSymptomsLayer1(text);
      setSymptomResult(fallback);
    } finally {
      setSymptomLoading(false);
    }
  };

  // Quick replies per role
  const quickRepliesByRole: Record<string, string[]> = {
    patient: [
      "How do I upload a record?",
      "How do I share with a doctor?",
      "Can I stop sharing?",
      "What does Activate encryption do?",
      "Why does my balance show 0?",
    ],
    doctor: [
      "Why does it say Not verified?",
      "Why must I activate encryption?",
      "How do I open a shared record?",
      "Why do I get Access denied?",
    ],
    publisher: [
      "How do I set up the registry?",
      "How do I verify a doctor?",
      "How do I revoke a doctor?",
      "What is the Audit page?",
    ],
    home: [
      "What is SolHealth?",
      "What is Solana Devnet?",
      "Which wallets work?",
      "How do I connect my wallet?",
    ],
  };

  const currentQuickReplies = quickRepliesByRole[guideContext.activeRole] || quickRepliesByRole.home;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="guide-panel-container"
    >
      {/* Brand Accent Header Strip */}
      <div className="h-1 bg-[linear-gradient(135deg,#5EFCE8_0%,#2EE8C8_35%,#00C4E0_70%,#0084C2_100%)] w-full shrink-0" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#DCEEF2] bg-white select-none">
        <div className="flex items-center gap-2.5">
          <h2 id={titleId} className="font-headline font-bold text-sm text-[#040B1A]">
            SolHealth Orbit
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5] font-semibold capitalize">
            {guideContext.activeRole}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "help" && messages.length > 1 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="text-xs text-[#64748B] hover:text-[#040B1A] px-2 py-1 rounded-md transition-colors"
              title="Clear conversation"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Orbit"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#040B1A] hover:bg-[#F7FBFC] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs (Symptom precautions tab is only visible on /patient) */}
      <div className="flex items-center border-b border-[#DCEEF2] bg-[#F7FBFC] px-4 pt-1 select-none">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "help"}
          onClick={() => setActiveTab("help")}
          className={`px-3 py-2 text-xs font-headline font-bold border-b-2 transition-all ${
            activeTab === "help"
              ? "border-[#00B8D9] text-[#075985]"
              : "border-transparent text-[#64748B] hover:text-[#040B1A]"
          }`}
        >
          Help & Walkthrough
        </button>

        {isPatientRoute && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "symptoms"}
            onClick={() => setActiveTab("symptoms")}
            className={`px-3 py-2 text-xs font-headline font-bold border-b-2 transition-all ${
              activeTab === "symptoms"
                ? "border-[#00B8D9] text-[#075985]"
                : "border-transparent text-[#64748B] hover:text-[#040B1A]"
            }`}
          >
            Symptom precautions
          </button>
        )}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: HELP (FAQ, Guidance, Walkthrough)                 */}
      {/* ======================================================== */}
      {activeTab === "help" && (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          {/* Top Quick Actions */}
          <div className="px-4 py-2 bg-[#F7FBFC] border-b border-[#DCEEF2] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={handleNextStepClick}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E6FBF8] hover:bg-[#d6f7f2] border border-[#99F0E4] text-[#065F6B] font-headline font-bold text-xs whitespace-nowrap transition-colors"
            >
              <span>What should I do next?</span>
            </button>
          </div>

          {/* Chat Messages Log */}
          <div
            role="log"
            aria-live="polite"
            className="flex-1 overflow-y-auto p-4 space-y-3.5 guide-custom-scrollbar"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                    m.sender === "user"
                      ? "bg-[#040B1A] text-white font-medium rounded-br-xs border border-[#040B1A]"
                      : "bg-[#E6FBF8] text-[#040B1A] border border-[#99F0E4] rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>

                  {m.nextAction && m.nextAction.route && (
                    <div className="mt-2.5 pt-2 border-t border-[#99F0E4]/60">
                      <button
                        type="button"
                        onClick={() => {
                          if (m.nextAction?.route) router.push(m.nextAction.route);
                          onClose();
                        }}
                        className="glass-btn glass-btn-primary !min-h-[30px] !h-[30px] !px-3 text-xs"
                      >
                        <span>{m.nextAction.label || "Go to page"}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-[#99F0E4]/60">
                      <div className="text-[11px] font-semibold text-[#075985]">
                        Suggested questions:
                      </div>
                      <div className="flex flex-col gap-1">
                        {m.suggestions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleAskQuestion(s.question)}
                            className="text-left text-xs text-[#075985] hover:text-[#040B1A] hover:underline"
                          >
                            • {s.question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick-reply chip bar */}
          <div className="px-4 py-2 border-t border-[#DCEEF2] bg-[#F7FBFC] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {currentQuickReplies.map((qr) => (
              <button
                key={qr}
                type="button"
                onClick={() => handleAskQuestion(qr)}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-[#E8F7FC] border border-[#DCEEF2] text-[11px] text-[#1E293B] hover:text-[#075985] whitespace-nowrap transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>

          {/* Input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion(query);
            }}
            className="p-3 border-t border-[#DCEEF2] bg-white flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask Orbit a question about SolHealth..."
              aria-label="Ask Orbit a question"
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] text-xs text-[#040B1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00B8D9] transition-colors"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="px-3.5 py-2 rounded-xl bg-[#040B1A] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#075985] text-white font-headline font-bold text-xs transition-colors inline-flex items-center gap-1"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SYMPTOM PRECAUTIONS (Patient Only)                */}
      {/* ======================================================== */}
      {activeTab === "symptoms" && isPatientRoute && (
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 guide-custom-scrollbar bg-white">
          {/* 1. Top Disclaimers */}
          <div className="p-3 rounded-xl bg-[#FFF8E6] border border-[#FDE293] text-xs text-[#92400E] leading-relaxed">
            <span className="font-headline font-bold">Important: </span>
            {DISCLAIMER}
          </div>

          <div className="p-2.5 rounded-xl bg-[#E6FBF8] border border-[#99F0E4] text-[11px] text-[#065F6B] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#00B8D9] mt-0.5" />
            <p className="leading-snug">{PRIVACY_NOTE}</p>
          </div>

          {/* 2. Smart matching toggle */}
          <div className="p-3 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="smart-matching-toggle" className="text-xs font-headline font-bold text-[#040B1A] cursor-pointer">
                Smart matching (optional)
              </label>
              <input
                id="smart-matching-toggle"
                type="checkbox"
                checked={smartMatchingEnabled}
                onChange={(e) => handleToggleSmartMatching(e.target.checked)}
                className="w-4 h-4 accent-[#00B8D9] cursor-pointer"
              />
            </div>

            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Downloads a small language model (about 25 MB) once and runs it in your browser. Your text is not sent anywhere.
            </p>

            {smartMatchingEnabled && (
              <div className="pt-1 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#64748B]">Status:</span>
                <span
                  className={
                    smartState.status === "ready"
                      ? "text-[#065F6B] font-semibold"
                      : smartState.status === "error"
                      ? "text-[#991B1B]"
                      : "text-[#075985]"
                  }
                >
                  {smartState.message || (smartState.status === "ready" ? "Ready" : "Initializing...")}
                </span>
              </div>
            )}
          </div>

          {/* 3. Input form */}
          <form onSubmit={handleSymptomSubmit} className="space-y-3">
            <div>
              <label htmlFor="symptom-input" className="block text-xs font-headline font-bold text-[#040B1A] mb-1">
                Describe how you feel
              </label>
              <textarea
                id="symptom-input"
                rows={3}
                value={symptomText}
                onChange={(e) => setSymptomText(e.target.value)}
                placeholder="e.g. fever, headache, minor cut, cough..."
                className="w-full p-2.5 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] text-xs text-[#040B1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#00B8D9] resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="submit"
                disabled={!symptomText.trim() || symptomLoading}
                className="glass-btn glass-btn-primary !min-h-[36px] !px-4 text-xs font-bold"
              >
                {symptomLoading ? "Checking..." : "Check precautions"}
              </button>

              {(redFlagResult || symptomResult) && (
                <button
                  type="button"
                  onClick={() => {
                    setSymptomText("");
                    setRedFlagResult(null);
                    setSymptomResult(null);
                  }}
                  className="text-xs text-[#64748B] hover:text-[#040B1A]"
                >
                  Clear results
                </button>
              )}
            </div>
          </form>

          {/* 4. Results Area */}
          {/* (a) Red-flag match */}
          {redFlagResult && (
            <div className="p-4 rounded-xl bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B] space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#991B1B] shrink-0" />
                <span className="font-headline font-bold text-xs uppercase tracking-wider">
                  Urgent Medical Attention Needed
                </span>
              </div>
              <p className="text-xs leading-relaxed font-medium">
                {redFlagResult.message || (redFlagResult.severity === "self-harm" ? SELF_HARM_MESSAGE : EMERGENCY_MESSAGE)}
              </p>
            </div>
          )}

          {/* (b) Group matches */}
          {!redFlagResult && symptomResult && symptomResult.matched && symptomResult.groups.length > 0 && (
            <div className="space-y-4">
              {symptomResult.groups.map((item) => (
                <div
                  key={item.group.id}
                  className="p-4 rounded-xl bg-white border border-[#DCEEF2] space-y-3 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[#DCEEF2] pb-2">
                    <h3 className="font-headline font-bold text-xs text-[#040B1A]">
                      {item.group.title}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#E8F7FC] text-[#075985] border border-[#9CE0F5] font-semibold">
                      {item.confidence} match
                    </span>
                  </div>

                  {/* General Precautions */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-headline font-bold text-[#040B1A]">
                      General precautions:
                    </div>
                    <ul className="text-xs text-[#1E293B] space-y-1 pl-4 list-disc leading-relaxed">
                      {item.group.precautions.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>

                  {/* See Someone If */}
                  <div className="space-y-1.5 pt-2 border-t border-[#DCEEF2]">
                    <div className="text-[11px] font-headline font-bold text-[#991B1B]">
                      See a doctor if:
                    </div>
                    <ul className="text-xs text-[#64748B] space-y-1 pl-4 list-disc leading-relaxed">
                      {item.group.seeSomeoneIf.map((s, idx) => (
                        <li key={idx}>{s}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] text-[11px] text-[#64748B] leading-relaxed">
                {DISCLAIMER}
              </div>
            </div>
          )}

          {/* (c) No match message */}
          {!redFlagResult && symptomResult && !symptomResult.matched && (
            <div className="p-4 rounded-xl bg-[#F7FBFC] border border-[#DCEEF2] text-center text-xs text-[#64748B] space-y-1">
              <p>{symptomResult.message || "I can't suggest precautions for that. Please consult a doctor."}</p>
            </div>
          )}
        </div>
      )}

      {/* Persistent Disclaimer Bar */}
      <div className="px-4 py-2 bg-[#F7FBFC] border-t border-[#DCEEF2] text-[11px] font-mono text-[#64748B] text-center shrink-0">
        General information only, not medical advice.
      </div>
    </div>
  );
}