"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRole } from "@/lib/roles";
import { 
  fetchAuditLogs, 
  formatAuditEntry, 
  FormattedAuditEvent 
} from "@/lib/audit";
import { 
  RolePage, 
  StepCard, 
  TechnicalDetails, 
  EmptyStateBox, 
  ChecklistStep 
} from "@/components/RolePage";
import { GlassButton } from "@/components/GlassButton";
import { makeExplorerUrl } from "@/components/StepStatus";

type AuditFilterCategory = "all" | "credentials" | "records" | "access";

export default function AuditPage() {
  const { ready, keypairs } = useRole();
  const [rawEntries, setRawEntries] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState<AuditFilterCategory>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const knownAddresses = useMemo(() => {
    if (!ready || !keypairs) return {};
    return {
      issuer: keypairs.issuer.publicKey.toBase58(),
      patient: keypairs.patient.publicKey.toBase58(),
      doctor: keypairs.doctor.publicKey.toBase58(),
    };
  }, [ready, keypairs]);

  const loadAuditData = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const logs = await fetchAuditLogs();
      setRawEntries(logs);
    } catch (e: any) {
      console.warn("Failed to load audit logs:", e);
      setError(e?.message || "Failed to query transaction logs from local validator.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  // Format events with known address mapping
  const formattedEvents: FormattedAuditEvent[] = useMemo(() => {
    return rawEntries.map((entry) => formatAuditEntry(entry, knownAddresses));
  }, [rawEntries, knownAddresses]);

  // Counts per category
  const counts = useMemo(() => {
    const res = { all: formattedEvents.length, credentials: 0, records: 0, access: 0 };
    for (const ev of formattedEvents) {
      if (ev.category === "credentials") res.credentials++;
      else if (ev.category === "records") res.records++;
      else if (ev.category === "access") res.access++;
    }
    return res;
  }, [formattedEvents]);

  // Client-side filtering
  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return formattedEvents;
    return formattedEvents.filter((ev) => ev.category === activeFilter);
  }, [formattedEvents, activeFilter]);

  // CSV Export
  const handleExportCsv = () => {
    if (filteredEvents.length === 0) return;
    const headers = ["Signature", "Slot", "Time_UTC", "Event", "Description", "Status", "Fields"];
    const rows = filteredEvents.map((ev) => [
      `"${ev.signature}"`,
      ev.slot,
      `"${ev.utcTime}"`,
      `"${ev.eventName}"`,
      `"${ev.sentence.replace(/"/g, '""')}"`,
      `"${ev.status}"`,
      `"${JSON.stringify(ev.fields).replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `solhealth-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const checklist: ChecklistStep[] = [
    {
      number: "1",
      label: "Choose filter",
      status: "done",
      targetCardId: "card-filter",
    },
    {
      number: "2",
      label: "Inspect timeline",
      status: formattedEvents.length > 0 ? "done" : "next",
      targetCardId: "card-timeline",
    },
  ];

  return (
    <RolePage
      role="audit"
      roleTitle="Auditor"
      breadcrumbLabel="Audit"
      titleQuestion="What happened, and when?"
      whatYouCanDo="Inspect cryptographic and on-chain event logs to independently verify all protocol activity."
      checklist={checklist}
      nextStepText="Filter events by category, export CSV logs, or inspect individual transactions on Solana Explorer."
      roleDescription="Public verifier checking cryptographic and on-chain proofs of record access."
    >
      {/* ======================================================== */}
      {/* CARD 01: FILTER & TIMELINE CONTROLS                      */}
      {/* ======================================================== */}
      <StepCard
        id="card-filter"
        stepNumber="01"
        title="Event category filters"
        description="Filter chronological activity by category or export the event log."
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Glass Chip Filter Row */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "all", label: `All (${counts.all})` },
              { id: "credentials", label: `Credentials (${counts.credentials})` },
              { id: "records", label: `Records (${counts.records})` },
              { id: "access", label: `Access (${counts.access})` },
            ].map((f) => (
              <GlassButton
                key={f.id}
                variant="chip"
                selected={activeFilter === f.id}
                onClick={() => setActiveFilter(f.id as AuditFilterCategory)}
              >
                {f.label}
              </GlassButton>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <GlassButton
              variant="secondary"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredEvents.length === 0}
            >
              Export log
            </GlassButton>

            <GlassButton
              variant="secondary"
              size="sm"
              onClick={loadAuditData}
              loading={refreshing}
              loadingText="Refreshing..."
            >
              Refresh
            </GlassButton>
          </div>
        </div>
      </StepCard>

      {/* ======================================================== */}
      {/* CARD 02: EVENT TIMELINE                                  */}
      {/* ======================================================== */}
      <StepCard
        id="card-timeline"
        stepNumber="02"
        title="Activity timeline"
        description="Plain-language chronological event trail decoded from Solana on-chain transaction logs."
      >
        {/* Summary row above list */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-headline font-semibold text-[#6b7280] pb-2 border-b border-[rgba(27,31,42,0.06)]">
          <span>
            Total events: <strong className="text-[#1b1f2a]">{counts.all}</strong>
          </span>
          <span>
            Credentials: <strong className="text-[#1b1f2a]">{counts.credentials}</strong>
          </span>
          <span>
            Records: <strong className="text-[#1b1f2a]">{counts.records}</strong>
          </span>
          <span>
            Access: <strong className="text-[#1b1f2a]">{counts.access}</strong>
          </span>
        </div>

        {error ? (
          <div className="rounded-[16px] bg-[#fde8e6] border border-[#fbd0cb] p-4 text-xs text-[#b42318] space-y-1">
            <div className="font-headline font-bold uppercase tracking-wider text-[11px]">
              Query Error
            </div>
            <p>{error}</p>
          </div>
        ) : loading && formattedEvents.length === 0 ? (
          <div className="p-8 text-center text-xs font-headline font-semibold text-[#6b7280]">
            <span className="inline-flex items-center">
              Loading audit trail
              <span className="dot-pulse" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <EmptyStateBox
            message={`No events found matching category "${activeFilter}".`}
            actionLabel="Show all events"
            onAction={() => setActiveFilter("all")}
          />
        ) : (
          <div className="space-y-3.5">
            {filteredEvents.map((event, idx) => {
              let dotColor = "bg-[#17803d]";
              if (event.status === "warn") dotColor = "bg-[#9ca3af]";
              if (event.status === "danger") dotColor = "bg-[#b42318]";

              const technicalItems = [
                {
                  label: "Transaction Signature",
                  value: event.signature,
                  isAddress: true,
                },
                {
                  label: "Explorer",
                  value: event.signature,
                  explorerUrl: makeExplorerUrl(event.signature),
                },
                { label: "Slot", value: `#${event.slot.toLocaleString()}` },
                ...Object.entries(event.fields).map(([k, v]) => ({
                  label: k.charAt(0).toUpperCase() + k.slice(1),
                  value: v,
                  isAddress: v.length >= 32,
                })),
              ];

              return (
                <div
                  key={`${event.signature}-${event.eventName}-${idx}`}
                  className="p-4 sm:p-5 rounded-[20px] bg-[#fffdf6] border border-[rgba(27,31,42,0.08)] space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                      <p className="font-headline font-bold text-xs sm:text-sm text-[#1b1f2a]">
                        {event.sentence}
                      </p>
                    </div>

                    <div className="font-mono text-xs text-[#6b7280] shrink-0">
                      {event.utcTime}
                    </div>
                  </div>

                  {/* Technical Details with Signature & Explorer Link */}
                  <TechnicalDetails
                    title="Technical details"
                    items={technicalItems}
                  />
                </div>
              );
            })}
          </div>
        )}
      </StepCard>
    </RolePage>
  );
}
