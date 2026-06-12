"use client";

import { useEffect, useState } from "react";

type Slot = {
  id: string;
  label: string;
  selectionLabel: string;
};

const SLOTS: Slot[] = [
  {
    id: "thu-apr-17-3pm",
    label: "Thu Apr 17 · 3:00 PM · 60 min",
    selectionLabel: "Thu Apr 17 · 3:00 PM · 60 min",
  },
  {
    id: "fri-apr-18-10am",
    label: "Fri Apr 18 · 10:00 AM · 60 min",
    selectionLabel: "Fri Apr 18 · 10:00 AM · 60 min",
  },
  {
    id: "mon-apr-21-2pm",
    label: "Mon Apr 21 · 2:00 PM · 60 min",
    selectionLabel: "Mon Apr 21 · 2:00 PM · 60 min",
  },
  {
    id: "tue-apr-22-11am",
    label: "Tue Apr 22 · 11:00 AM · 60 min",
    selectionLabel: "Tue Apr 22 · 11:00 AM · 60 min",
  },
];

type SubmissionState = "idle" | "submitting" | "confirmed" | "other_options" | "error";

export default function SelectTimeClient({ caseId }: { caseId: string }) {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSlot(null);
    setSubmissionState("idle");
    setError(null);
  }, [caseId]);

  const confirmSelection = async () => {
    if (!caseId || !selectedSlot || submissionState === "submitting" || submissionState === "confirmed") {
      return;
    }

    setSubmissionState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "slot_selection_received",
          case_id: caseId,
          payload: {
            selection_type: "confirmed",
            selected_slot: selectedSlot.selectionLabel,
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("This selection link is no longer active — your booking may already be confirmed.");
        }
        throw new Error("Failed to confirm the selected time slot.");
      }

      setSubmissionState("confirmed");
    } catch (submitError) {
      setSubmissionState("error");
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    }
  };

  const requestOtherOptions = async () => {
    if (!caseId || submissionState === "submitting" || submissionState === "confirmed") {
      return;
    }

    setSubmissionState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "slot_selection_received",
          case_id: caseId,
          payload: {
            selection_type: "needs_other_options",
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("This selection link is no longer active — your booking may already be confirmed.");
        }
        throw new Error("Failed to request more options.");
      }

      setSubmissionState("other_options");
    } catch (submitError) {
      setSubmissionState("error");
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.");
    }
  };

  const showConfirmation = submissionState === "confirmed";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4efe5] px-5 py-10 text-[#2c2c2c]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#e7e0d2_0%,transparent_45%)]" />
      <div className="pointer-events-none absolute left-[-8rem] top-20 h-64 w-64 rounded-full bg-[#d9e4cf]/50 blur-3xl" />
      <div className="pointer-events-none absolute right-[-6rem] bottom-10 h-72 w-72 rounded-full bg-[#d8cdbc]/45 blur-3xl" />

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl items-center justify-center">
        <section className="w-full rounded-[2rem] border border-[#dfd8cc] bg-[rgba(248,244,236,0.78)] px-5 py-8 shadow-[0_18px_60px_rgba(64,52,32,0.08)] backdrop-blur-sm sm:px-8 sm:py-10">
          <div className="mx-auto max-w-2xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#8c8376]">Tend</p>
            <h1
              className="mt-4 text-4xl leading-tight text-[#23261f] sm:text-5xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Pick a time that works for you.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#736b60]">
              {caseId
                ? "Choose one of the available options below. If none of these work, let us know and we’ll follow up."
                : "Missing case_id in the URL. Open this page with ?case_id=... to continue."}
            </p>

            {showConfirmation ? (
              <div className="mt-10 rounded-[1.5rem] border border-[#cfd7c8] bg-[#edf4e7] px-6 py-8 text-center">
                <div className="text-sm uppercase tracking-[0.24em] text-[#5d6f56]">Confirmed</div>
                <p
                  className="mt-4 text-2xl leading-10 text-[#243021]"
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  You&apos;re all set. A confirmation will be sent to your email shortly.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {SLOTS.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        disabled={!caseId}
                        onClick={() => {
                          setSelectedSlot(slot);
                          setSubmissionState("idle");
                          setError(null);
                        }}
                        className={[
                          "group rounded-[1.4rem] border px-4 py-4 text-left transition-all duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2d3d2e] focus-visible:ring-offset-2 focus-visible:ring-offset-[#f4efe5]",
                          !caseId ? "cursor-not-allowed opacity-70" : "",
                          isSelected
                            ? "border-[#2d3d2e] bg-[#eef4e8] shadow-[0_12px_24px_rgba(45,61,46,0.08)]"
                            : "border-[#ded6c8] bg-[#fffdfa] hover:border-[#b8c6af] hover:bg-[#faf9f3]",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div
                              className="text-[18px] leading-7 text-[#23261f]"
                              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                            >
                              {slot.label}
                            </div>
                            <div className="mt-2 text-sm text-[#847b70]">60 minute session</div>
                          </div>
                          <div
                            className={[
                              "flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold transition-all",
                              isSelected
                                ? "border-[#2d3d2e] bg-[#2d3d2e] text-white"
                                : "border-[#d8d0c4] bg-transparent text-transparent group-hover:text-[#2d3d2e]",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            ✓
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={confirmSelection}
                    disabled={!caseId || !selectedSlot || submissionState === "submitting"}
                    className={[
                      "inline-flex min-h-12 items-center justify-center rounded-full px-7 text-sm font-semibold tracking-[0.02em] transition-colors",
                      !caseId || !selectedSlot || submissionState === "submitting"
                        ? "cursor-not-allowed bg-[#ddd6cb] text-[#a99f92]"
                        : "bg-[#2d3d2e] text-white hover:bg-[#384b38]",
                    ].join(" ")}
                  >
                    {submissionState === "submitting" ? "Sending..." : "Confirm"}
                  </button>

                  <button
                    type="button"
                    onClick={requestOtherOptions}
                    disabled={!caseId || submissionState === "submitting"}
                    className="text-sm font-medium text-[#6f685f] underline decoration-[#c7beaf] underline-offset-4 transition-colors hover:text-[#2d3d2e] disabled:cursor-not-allowed disabled:text-[#a79d90]"
                  >
                    None of these work
                  </button>
                </div>

                {submissionState === "other_options" ? (
                  <p className="mt-4 text-sm text-[#5d6f56]">
                    We&apos;ll look for a few more options and follow up shortly.
                  </p>
                ) : null}

                {error ? <p className="mt-4 text-sm text-[#8d3e33]">{error}</p> : null}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
