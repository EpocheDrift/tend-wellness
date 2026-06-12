"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AvailableAction, BookingCase, Draft, TimelineEntry } from "@/lib/types";

type CaseBundle = {
  detail: BookingCase | null;
  timeline: TimelineEntry[];
  drafts: Draft[];
  availableActions: AvailableAction[];
};

const STATE_LABELS: Record<BookingCase["state"], string> = {
  new_lead: "New inquiry",
  intake_pending: "Awaiting intake",
  fit_review: "Ready for your review",
  fit_confirmed: "Finding a time",
  awaiting_client_confirmation: "Waiting on client",
  booked: "Booked ✓",
  cancel_requested: "Cancellation requested",
  cancelled: "Cancelled",
  reschedule_requested: "Reschedule requested",
  reschedule_in_progress: "Finding new time",
  completed: "Completed ✓",
};

const TAG_STYLES = {
  AUTO: {
    background: "#dcebd9",
    color: "#29422a",
  },
  DRAFT: {
    background: "#f4dfb7",
    color: "#735518",
  },
  MANUAL: {
    background: "#f3d4cf",
    color: "#7a3028",
  },
} as const;

const ACTION_LABELS: Record<AvailableAction["action"], string> = {
  send_intake_email: "Send Intake Email",
  request_more_info: "Request More Info",
  approve_fit: "Approve Fit",
  propose_time_slots: "Propose Time Slots",
  confirm_booking: "Confirm Booking",
  schedule_reminder: "Schedule Reminder",
  send_cancellation_reply: "Send Cancellation Reply",
  confirm_cancellation: "Confirm Cancellation",
  offer_reschedule: "Offer to Reschedule",
  propose_reschedule_slots: "Propose Reschedule Slots",
  escalate_to_owner: "Escalate to Owner",
  mark_session_completed: "Mark Session Completed",
};

function getSubLabel(pausedReason: string | null | undefined) {
  if (!pausedReason) {
    return "System handling";
  }

  if (pausedReason.toLowerCase().includes("escalated")) {
    return "Escalated — waiting for you";
  }

  return "Paused — waiting for you";
}

function getIndicator(subLabel: string) {
  if (subLabel.startsWith("Escalated")) {
    return "#b85c4a";
  }

  if (subLabel.startsWith("Paused")) {
    return "#c9872a";
  }

  return null;
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function sortCases(items: BookingCase[]) {
  const priority = (bookingCase: BookingCase) => {
    const subLabel = getSubLabel(bookingCase.paused_reason);
    if (subLabel.startsWith("Escalated")) return 0;
    if (subLabel.startsWith("Paused")) return 1;
    return 2;
  };

  return [...items].sort((left, right) => {
    const priorityDelta = priority(left) - priority(right);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
  });
}

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed request: ${url}`);
  }

  return response.json() as Promise<T>;
}

function useDashboardData() {
  const [cases, setCases] = useState<BookingCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [caseBundle, setCaseBundle] = useState<CaseBundle>({
    detail: null,
    timeline: [],
    drafts: [],
    availableActions: [],
  });
  const [casesError, setCasesError] = useState<string | null>(null);
  const [bundleError, setBundleError] = useState<string | null>(null);
  const selectedCaseIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedCaseIdRef.current = selectedCaseId;
  }, [selectedCaseId]);

  async function fetchCaseBundle(caseId: string): Promise<CaseBundle> {
    const [detail, timeline, drafts, availableActions] = await Promise.all([
      readJson<BookingCase>(`/api/cases/${caseId}`),
      readJson<{ items: TimelineEntry[] }>(`/api/cases/${caseId}/timeline`),
      readJson<{ items: Draft[] }>(`/api/cases/${caseId}/drafts`),
      readJson<{
        case_id: string;
        state: BookingCase["state"];
        actions: AvailableAction[];
      }>(`/api/cases/${caseId}/available-actions`),
    ]);

    return {
      detail,
      timeline: timeline.items,
      drafts: drafts.items,
      availableActions: availableActions.actions,
    };
  }

  useEffect(() => {
    let cancelled = false;
    let inFlight = false;

    async function refreshCases() {
      if (inFlight) {
        return;
      }
      inFlight = true;

      try {
        const payload = await readJson<{ items: BookingCase[] }>("/api/cases");
        if (cancelled) {
          return;
        }

        const sorted = sortCases(payload.items);
        setCases(sorted);
        setSelectedCaseId((current) => {
          if (current && sorted.some((item) => item.id === current)) {
            return current;
          }
          return sorted[0]?.id ?? null;
        });
        setCasesError(null);
      } catch (loadError) {
        if (!cancelled) {
          setCasesError(loadError instanceof Error ? loadError.message : "Failed to load cases");
        }
      } finally {
        inFlight = false;
      }
    }

    void refreshCases();
    const intervalId = window.setInterval(refreshCases, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!selectedCaseId) {
      return;
    }

    const caseId = selectedCaseId;
    let cancelled = false;
    let inFlight = false;

    async function refreshBundle() {
      if (inFlight) {
        return;
      }
      inFlight = true;

      try {
        const bundle = await fetchCaseBundle(caseId);
        if (cancelled) {
          return;
        }

        setCaseBundle(bundle);
        setBundleError(null);
      } catch (loadError) {
        if (!cancelled) {
          setBundleError(loadError instanceof Error ? loadError.message : "Failed to load case data");
        }
      } finally {
        inFlight = false;
      }
    }

    void refreshBundle();
    const intervalId = window.setInterval(refreshBundle, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [selectedCaseId]);

  return {
    cases,
    selectedCaseId,
    setSelectedCaseId,
    caseBundle,
    error: casesError ?? bundleError,
    // Used after owner actions. Throws on failure so callers can surface the error;
    // drops the bundle result if the user switched cases while the request was in flight.
    refresh: async () => {
      const caseId = selectedCaseIdRef.current;
      const payload = await readJson<{ items: BookingCase[] }>("/api/cases");
      setCases(sortCases(payload.items));

      if (caseId) {
        const bundle = await fetchCaseBundle(caseId);
        if (selectedCaseIdRef.current === caseId) {
          setCaseBundle(bundle);
        }
      }
    },
  };
}

export default function DashboardPage() {
  const { cases, selectedCaseId, setSelectedCaseId, caseBundle, error, refresh } = useDashboardData();
  const selectedCase = caseBundle.detail;
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingDraft = useMemo(
    () => caseBundle.drafts.find((draft) => draft.status === "pending") ?? null,
    [caseBundle.drafts],
  );

  const showEscalationNotice =
    !pendingDraft && !!selectedCase?.paused_reason?.toLowerCase().includes("escalated");

  async function postJson(url: string, body: Record<string, unknown>) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(payload?.error ?? `Request failed: ${url}`);
    }

    return response.json();
  }

  function toActionError(error: unknown) {
    return error instanceof Error ? error.message : "Something went wrong. Please try again.";
  }

  async function handleApproveDraft(draft: Draft) {
    setBusyAction(`approve:${draft.id}`);
    setActionError(null);
    try {
      await postJson(`/api/drafts/${draft.id}/approve`, { approved_by: "owner" });
      await refresh();
    } catch (error) {
      setActionError(toActionError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleRejectDraft(draft: Draft) {
    setBusyAction(`reject:${draft.id}`);
    setActionError(null);
    try {
      await postJson(`/api/drafts/${draft.id}/reject`, { rejected_by: "owner" });
      await refresh();
    } catch (error) {
      setActionError(toActionError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleEditApproveDraft(draft: Draft, editedBody: string) {
    setBusyAction(`edit:${draft.id}`);
    setActionError(null);
    try {
      await postJson(`/api/drafts/${draft.id}/edit-and-approve`, {
        approved_by: "owner",
        subject: draft.subject,
        body: editedBody,
      });
      await refresh();
    } catch (error) {
      setActionError(toActionError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleEscalationAck() {
    if (!selectedCase) {
      return;
    }

    setBusyAction(`ack:${selectedCase.id}`);
    setActionError(null);
    try {
      await postJson(`/api/cases/${selectedCase.id}/actions`, {
        action: "escalate_acknowledged",
      });
      await refresh();
    } catch (error) {
      setActionError(toActionError(error));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf8f5",
        color: "#2a2a2a",
      }}
    >
      <nav
        style={{
          height: 72,
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "0 28px",
          borderBottom: "1px solid #e8e2d9",
          background: "#faf8f5",
        }}
      >
        <div style={{ color: "#2d3d2e", fontSize: 18, fontWeight: 600 }}>Tend</div>
        <Link href="/dashboard" style={{ color: "#2d3d2e", fontSize: 14, textDecoration: "none", fontWeight: 700 }}>
          Dashboard
        </Link>
        <Link href="/inbox" style={{ color: "#9e9890", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
          Inbox
        </Link>
        <div style={{ flex: 1 }} />
        <button
          onClick={async () => {
            try {
              const response = await fetch("/api/reset", { method: "POST" });
              if (!response.ok) {
                throw new Error("Reset failed");
              }
              window.location.reload();
            } catch {
              window.alert("Reset failed — please try again.");
            }
          }}
          style={{
            border: "1px solid #d7d1c7",
            borderRadius: 999,
            background: "transparent",
            color: "#9e9890",
            fontSize: 12,
            padding: "6px 14px",
            cursor: "pointer",
          }}
        >
          Reset Demo
        </button>
      </nav>

      <div style={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
        <aside
          style={{
            width: 320,
            minWidth: 320,
            background: "#f0ece5",
            borderRight: "1px solid #e8e2d9",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: "16px 22px 20px", borderBottom: "1px solid #e8e2d9" }}>
            <div
              style={{
                color: "#9e9890",
                fontSize: 10,
                marginTop: 2,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Owner Dashboard
            </div>
          </div>

          <div
            style={{
              padding: "14px 22px 6px",
              color: "#9e9890",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Cases
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {cases.map((bookingCase) => {
              const subLabel = getSubLabel(bookingCase.paused_reason);
              const indicator = getIndicator(subLabel);
              const selected = bookingCase.id === selectedCaseId;

              return (
                <button
                  key={bookingCase.id}
                  onClick={() => setSelectedCaseId(bookingCase.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderLeft: selected ? "3px solid #2d3d2e" : "3px solid transparent",
                    background: selected ? "rgba(255,255,255,0.52)" : "transparent",
                    borderBottom: "1px solid rgba(232,226,217,0.5)",
                    padding: "13px 22px 13px 19px",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: indicator ?? "transparent",
                          display: "inline-block",
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontSize: 13, fontWeight: selected ? 500 : 400 }}>
                        {bookingCase.client_name}
                      </span>
                    </div>
                    <span style={{ color: "#9e9890", fontSize: 11 }}>
                      {formatRelativeTime(bookingCase.updated_at)}
                    </span>
                  </div>

                  <div style={{ paddingLeft: 15 }}>
                    <div style={{ color: "#3a3a3a", fontSize: 12, marginBottom: 2 }}>
                      {STATE_LABELS[bookingCase.state]}
                    </div>
                    <div
                      style={{
                        color: indicator ? (indicator === "#b85c4a" ? "#8d3e33" : "#7a5c2a") : "#9e9890",
                        fontSize: 11,
                        fontWeight: indicator ? 500 : 400,
                      }}
                    >
                      {subLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section style={{ flex: 1, display: "flex", minWidth: 0 }}>
        <div
          style={{
            flexBasis: "60%",
            borderRight: "1px solid #e8e2d9",
            padding: "32px 36px",
            overflowY: "auto",
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 28 }}>Activity</div>

          {error ? (
            <div style={{ color: "#7a3028", fontSize: 14 }}>{error}</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {caseBundle.timeline.map((entry) => (
                <TimelineCard key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            flexBasis: "40%",
            padding: "32px 28px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
            overflowY: "auto",
          }}
        >
          {selectedCase ? (
            <>
              <div
                style={{
                  background: "rgba(255,255,255,0.72)",
                  border: "1px solid rgba(255,255,255,0.7)",
                  borderRadius: 12,
                  padding: "20px 22px",
                  boxShadow:
                    "0 2px 20px rgba(45,61,46,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
                  backdropFilter: "blur(16px) saturate(1.4)",
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 2 }}>
                  {selectedCase.client_name}
                </div>
                <div style={{ fontSize: 12, color: "#9e9890", marginBottom: 14 }}>
                  {selectedCase.client_email}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      borderRadius: 999,
                      padding: "3px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: showEscalationNotice ? "#f3d4cf" : "#e4ede2",
                      color: showEscalationNotice ? "#7a3028" : "#2d3d2e",
                    }}
                  >
                    {STATE_LABELS[selectedCase.state]}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#9e9890", fontStyle: "italic", lineHeight: 1.5 }}>
                  {selectedCase.paused_reason ?? "System handling"}
                </div>
              </div>

              <div
                style={{
                  background: "#ffffff",
                  border: "1px solid #e8e2d9",
                  borderRadius: 10,
                  padding: "18px 20px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#9e9890",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  Available Actions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {caseBundle.availableActions.map((action) => (
                    <ActionRow key={action.action} action={action} />
                  ))}
                </div>
              </div>

              {actionError ? (
                <div
                  style={{
                    background: "#fdf0ee",
                    border: "1px solid #f0ccc8",
                    borderRadius: 10,
                    padding: "12px 16px",
                    color: "#7a3028",
                    fontSize: 13,
                    lineHeight: 1.5,
                  }}
                >
                  {actionError}
                </div>
              ) : null}

              {pendingDraft ? (
                <DraftCard
                  key={pendingDraft.id}
                  draft={pendingDraft}
                  busy={busyAction !== null}
                  onApprove={() => handleApproveDraft(pendingDraft)}
                  onReject={() => handleRejectDraft(pendingDraft)}
                  onEditApprove={(editedBody) => handleEditApproveDraft(pendingDraft, editedBody)}
                />
              ) : showEscalationNotice ? (
                <EscalationCard
                  busy={busyAction !== null}
                  onAcknowledge={handleEscalationAck}
                />
              ) : (
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e8e2d9",
                    borderRadius: 10,
                    padding: "18px 20px",
                    color: "#6f6a63",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  No intervention is needed right now. The system is handling this case based on
                  the current state and policy rules.
                </div>
              )}
            </>
          ) : null}
        </div>
        </section>
      </div>
    </main>
  );
}

function TimelineCard({ entry }: { entry: TimelineEntry }) {
  const tag =
    entry.type === "draft"
      ? "DRAFT"
      : entry.type === "system_note"
        ? "MANUAL"
        : entry.type === "action" && entry.metadata?.automation_level
          ? entry.metadata.automation_level.toUpperCase()
          : null;

  const isStateChange = entry.type === "state_change";
  const isSystemNote = entry.type === "system_note";

  return (
    <div
      style={{
        background: isStateChange ? "rgba(232,226,217,0.35)" : isSystemNote ? "#fdf0ee" : "#ffffff",
        border: isSystemNote ? "1px solid #f0ccc8" : "1px solid #e8e2d9",
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 10, color: "#b0a89a", marginBottom: 5 }}>{formatTimestamp(entry.timestamp)}</div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: isStateChange ? "#7a7060" : isSystemNote ? "#5a2020" : "#2a2a2a",
            fontStyle: isStateChange ? "italic" : "normal",
            fontWeight: isSystemNote ? 500 : 400,
          }}
        >
          {entry.content}
        </div>
        {tag ? <Tag label={tag as keyof typeof TAG_STYLES} /> : null}
      </div>
    </div>
  );
}

function Tag({ label }: { label: keyof typeof TAG_STYLES }) {
  const style = TAG_STYLES[label];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        whiteSpace: "nowrap",
        borderRadius: 999,
        padding: "4px 10px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        background: style.background,
        color: style.color,
      }}
    >
      {label}
    </span>
  );
}

function ActionRow({ action }: { action: AvailableAction }) {
  const variant =
    action.policy === "draft" ? "primary" : action.policy === "manual" ? "ghost" : "outline";

  const background =
    variant === "primary" ? "#2d3d2e" : variant === "outline" ? "#ffffff" : "transparent";
  const color = variant === "primary" ? "#ffffff" : "#2d3d2e";
  const border =
    variant === "ghost" ? "1px solid transparent" : "1px solid rgba(45,61,46,0.24)";

  // Informational only — owner actions run through drafts and escalations, not these rows.
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        width: "100%",
        borderRadius: 999,
        padding: "11px 14px",
        border,
        background,
        color,
        opacity: 0.98,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>{ACTION_LABELS[action.action]}</span>
      <Tag label={action.policy.toUpperCase() as keyof typeof TAG_STYLES} />
    </div>
  );
}

function DraftCard({
  draft,
  busy,
  onApprove,
  onEditApprove,
  onReject,
}: {
  draft: Draft;
  busy: boolean;
  onApprove: () => void;
  onEditApprove: (editedBody: string) => void;
  onReject: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(draft.body);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e8e2d9",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "0 10px 26px rgba(45,61,46,0.08)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Tag label="DRAFT" />
        <div style={{ fontSize: 12, color: "#9e9890" }}>Email draft</div>
      </div>

      <div style={{ marginTop: 16, fontSize: 12, color: "#9e9890" }}>
        Subject
      </div>
      <div style={{ marginTop: 4, fontSize: 14, fontWeight: 500 }}>{draft.subject}</div>

      <div style={{ marginTop: 14, fontSize: 12, color: "#9e9890" }}>Body</div>
      {editing ? (
        <textarea
          value={editedBody}
          onChange={(event) => setEditedBody(event.target.value)}
          rows={6}
          style={{
            marginTop: 6,
            width: "100%",
            borderRadius: 10,
            border: "1px solid #d7d1c7",
            padding: "10px 12px",
            fontSize: 13,
            lineHeight: 1.7,
            color: "#3d3a37",
            fontFamily: "inherit",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            lineHeight: 1.7,
            color: "#3d3a37",
            whiteSpace: "pre-wrap",
          }}
        >
          {draft.body}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {editing ? (
          <>
            <button
              type="button"
              onClick={() => onEditApprove(editedBody)}
              disabled={busy || editedBody.trim().length === 0}
              style={{
                borderRadius: 999,
                border: "none",
                background: "#2d3d2e",
                color: "#ffffff",
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
                opacity: busy || editedBody.trim().length === 0 ? 0.7 : 1,
              }}
            >
              Approve &amp; Send Edited
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditedBody(draft.body);
              }}
              disabled={busy}
              style={{
                borderRadius: 999,
                border: "1px solid transparent",
                background: "transparent",
                color: "#7b736a",
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              Cancel Editing
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onApprove}
              disabled={busy}
              style={{
                borderRadius: 999,
                border: "none",
                background: "#2d3d2e",
                color: "#ffffff",
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              disabled={busy}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(45,61,46,0.24)",
                background: "#ffffff",
                color: "#2d3d2e",
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              Edit &amp; Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={busy}
              style={{
                borderRadius: 999,
                border: "1px solid transparent",
                background: "transparent",
                color: "#7b736a",
                padding: "11px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: busy ? "wait" : "pointer",
                opacity: busy ? 0.7 : 1,
              }}
            >
              Reject
            </button>
          </>
        )}
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "#9e9890", lineHeight: 1.5 }}>
        Approving will send this email and allow the system to continue.
      </div>
    </div>
  );
}

function EscalationCard({
  busy,
  onAcknowledge,
}: {
  busy: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <div
      style={{
        background: "#fff9f7",
        border: "1px solid #f0ccc8",
        borderLeft: "4px solid #b85c4a",
        borderRadius: 12,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Tag label="MANUAL" />
        <div style={{ fontSize: 12, color: "#8d3e33", fontWeight: 600 }}>ESCALATED</div>
      </div>

      <div style={{ marginTop: 14, fontSize: 14, fontWeight: 500, color: "#5a2020" }}>
        The system has stepped back on this case. No draft was generated.
      </div>
      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#7b544d" }}>
        This case needs manual handling. Acknowledge below to take over — the notice will clear
        and the system will stay hands-off until you act.
      </div>
      <button
        type="button"
        onClick={onAcknowledge}
        disabled={busy}
        style={{
          marginTop: 16,
          borderRadius: 999,
          border: "1px solid rgba(45,61,46,0.24)",
          background: "#ffffff",
          color: "#2d3d2e",
          padding: "11px 14px",
          fontSize: 13,
          fontWeight: 600,
          cursor: busy ? "wait" : "pointer",
          opacity: busy ? 0.7 : 1,
        }}
      >
        I&apos;ll handle this
      </button>
    </div>
  );
}
