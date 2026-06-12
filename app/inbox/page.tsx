"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ActionType } from "@/lib/types";

type InboxEmail = {
  id: string;
  case_id: string;
  to: string;
  subject: string;
  body: string;
  sent_at: string;
  source_action: ActionType;
  is_intake: boolean;
  can_reply: boolean;
  can_select_time: boolean;
};

type InboxGroup = {
  case_id: string;
  client_name: string;
  client_email: string;
  emails: InboxEmail[];
};

const ACTION_LABELS: Record<ActionType, string> = {
  send_intake_email: "Intake",
  request_more_info: "Follow-up",
  approve_fit: "Fit Confirmation",
  propose_time_slots: "Scheduling",
  confirm_booking: "Booking Confirmation",
  schedule_reminder: "Reminder",
  send_cancellation_reply: "Cancellation",
  confirm_cancellation: "Cancellation",
  offer_reschedule: "Reschedule Offer",
  propose_reschedule_slots: "Reschedule Offer",
  escalate_to_owner: "Escalation",
  mark_session_completed: "Completed",
};

function formatTimestamp(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export default function InboxPage() {
  const [groups, setGroups] = useState<InboxGroup[]>([]);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [primaryConcern, setPrimaryConcern] = useState("Work stress and anxiety");
  const [goals, setGoals] = useState("Build coping strategies and find more balance");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const allEmails = useMemo(() => groups.flatMap((group) => group.emails), [groups]);
  const selectedEmail = allEmails.find((email) => email.id === selectedEmailId) ?? allEmails[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function loadInbox() {
      try {
        const response = await fetch("/api/inbox", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Failed to load inbox.");
        }

        const payload = (await response.json()) as { groups: InboxGroup[] };
        if (cancelled) {
          return;
        }

        setGroups(payload.groups);
        setSelectedEmailId((current) => {
          if (current && payload.groups.some((group) => group.emails.some((email) => email.id === current))) {
            return current;
          }

          return payload.groups[0]?.emails[0]?.id ?? null;
        });
        setError(null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load inbox.");
        }
      }
    }

    void loadInbox();
    const intervalId = window.setInterval(loadInbox, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (!selectedEmail?.can_reply) {
      setModalOpen(false);
    }
  }, [selectedEmail?.can_reply]);

  async function refreshInbox() {
    const response = await fetch("/api/inbox", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to refresh inbox.");
    }

    const payload = (await response.json()) as { groups: InboxGroup[] };
    setGroups(payload.groups);
  }

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEmail) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "intake_information_completed",
          case_id: selectedEmail.case_id,
          payload: {
            responses: {
              primary_concern: primaryConcern,
              goals,
            },
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Something went wrong. Try again.");
      }

      // The event was accepted — close the modal regardless of how the refresh goes,
      // so a refresh hiccup can't invite a duplicate submission. Polling catches up anyway.
      setModalOpen(false);
      setConfirmation("Reply sent — case advancing to fit review.");

      try {
        await refreshInbox();
      } catch {
        // Next poll tick will refresh the list.
      }
    } catch (replyError) {
      setSubmitError(replyError instanceof Error ? replyError.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#faf8f5", color: "#2c2c2c" }}>
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
        <Link href="/dashboard" style={{ color: "#9e9890", fontSize: 14, textDecoration: "none", fontWeight: 500 }}>
          Dashboard
        </Link>
        <Link href="/inbox" style={{ color: "#2d3d2e", fontSize: 14, textDecoration: "none", fontWeight: 700 }}>
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
          <div style={{ padding: "16px 22px 10px" }}>
            <div
              style={{
                color: "#9e9890",
                fontSize: 10,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Inbox
            </div>
            <div style={{ marginTop: 6, color: "#8a8378", fontSize: 11, lineHeight: 1.5 }}>
              You&apos;re viewing the client&apos;s mailbox — these are the emails the system sent
              on the owner&apos;s behalf.
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {groups.map((group) => (
              <div key={group.case_id} style={{ paddingBottom: 12 }}>
                <div style={{ padding: "8px 22px", fontSize: 13, fontWeight: 600, color: "#3a3a3a" }}>
                  {group.client_name}
                </div>

                {group.emails.map((email) => {
                  const selected = email.id === selectedEmail?.id;
                  return (
                    <button
                      key={email.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmailId(email.id);
                        setConfirmation(null);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        borderLeft: selected ? "3px solid #2d3d2e" : "3px solid transparent",
                        background: selected ? "rgba(255,255,255,0.52)" : "transparent",
                        borderBottom: "1px solid rgba(232,226,217,0.45)",
                        padding: "12px 22px 12px 19px",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, color: "#2c2c2c", marginBottom: 4 }}>{email.subject}</div>
                      <div style={{ fontSize: 11, color: "#9e9890" }}>{formatTimestamp(email.sent_at)}</div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>

        <section style={{ flex: 1, padding: "32px 36px", overflowY: "auto" }}>
          {error ? <div style={{ color: "#7a3028", fontSize: 14 }}>{error}</div> : null}

          {!error && !selectedEmail ? (
            <div
              style={{
                minHeight: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9e9890",
                fontSize: 14,
              }}
            >
              No emails yet. Submit a booking inquiry to get started.
            </div>
          ) : null}

          {!error && selectedEmail ? (
            <div
              style={{
                maxWidth: 760,
                background: "#ffffff",
                border: "1px solid #e8e2d9",
                borderRadius: 14,
                padding: "28px 30px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ fontSize: 12, color: "#9e9890", marginBottom: 8 }}>To: {selectedEmail.to}</div>
              <div style={{ fontSize: 28, lineHeight: 1.25, fontWeight: 500, marginBottom: 10 }}>
                {selectedEmail.subject}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <span style={{ fontSize: 12, color: "#9e9890" }}>Sent: {formatTimestamp(selectedEmail.sent_at)}</span>
                <span
                  style={{
                    display: "inline-flex",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    background: "#e4ede2",
                    color: "#2d3d2e",
                  }}
                >
                  {ACTION_LABELS[selectedEmail.source_action]}
                </span>
              </div>

              <div
                style={{
                  whiteSpace: "pre-wrap",
                  color: "#2c2c2c",
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginBottom: selectedEmail.can_reply || selectedEmail.can_select_time ? 24 : 0,
                }}
              >
                {selectedEmail.body}
              </div>

              {confirmation ? (
                <div style={{ color: "#5d6f56", fontSize: 13, marginBottom: 16 }}>
                  {confirmation}
                </div>
              ) : null}

              {selectedEmail.can_reply ? (
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(true);
                    setSubmitError(null);
                  }}
                  style={{
                    borderRadius: 999,
                    border: "1px solid #2d3d2e",
                    background: "transparent",
                    color: "#2d3d2e",
                    padding: "10px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Simulate Client Reply
                </button>
              ) : null}

              {selectedEmail.can_select_time ? (
                <div>
                  <a
                    href={`/select-time?case_id=${selectedEmail.case_id}`}
                    style={{
                      display: "inline-block",
                      borderRadius: 999,
                      border: "none",
                      background: "#2d3d2e",
                      color: "#ffffff",
                      padding: "10px 16px",
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Pick a time →
                  </a>
                  <div style={{ marginTop: 10, color: "#9e9890", fontSize: 12, lineHeight: 1.5 }}>
                    This opens the page the client would see from this email.
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      {modalOpen && selectedEmail ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(25,25,25,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: "#ffffff",
              borderRadius: 18,
              padding: "26px 26px 22px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 500, marginBottom: 8 }}>Simulate client reply</div>
            <div style={{ color: "#9e9890", fontSize: 13, marginBottom: 18 }}>
              This simulates the client filling out their intake information.
            </div>

            <form onSubmit={handleReplySubmit}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                What brings you here?
              </label>
              <textarea
                value={primaryConcern}
                onChange={(event) => setPrimaryConcern(event.target.value)}
                rows={3}
                required
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid #d7d1c7",
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#2c2c2c",
                  resize: "vertical",
                  marginBottom: 16,
                }}
              />

              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                What are you hoping to work on?
              </label>
              <textarea
                value={goals}
                onChange={(event) => setGoals(event.target.value)}
                rows={2}
                required
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid #d7d1c7",
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#2c2c2c",
                  resize: "vertical",
                }}
              />

              {submitError ? <div style={{ color: "#7a3028", fontSize: 13, marginTop: 14 }}>{submitError}</div> : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#9e9890",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    border: "none",
                    borderRadius: 999,
                    background: submitting ? "#9cab98" : "#2d3d2e",
                    color: "#ffffff",
                    padding: "11px 18px",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: submitting ? "progress" : "pointer",
                  }}
                >
                  {submitting ? "Sending..." : "Send Reply"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
