import { ALLOWED_ACTIONS, POLICY } from "@/lib/harness/policy";
import { store } from "@/lib/store";
import type { AppEvent, BookingCase } from "@/lib/types";

export function buildContext(bookingCase: BookingCase, event: AppEvent) {
  const recentInteractions = store.getInteractions(bookingCase.id).slice(-5);
  const earlierInteractions = store.getInteractions(bookingCase.id).slice(0, -5);
  const earlierSummary =
    earlierInteractions.length > 0
      ? `${earlierInteractions.length} prior interactions. Key events: ${earlierInteractions
          .slice(-3)
          .map((item) => item.content)
          .join(" | ")}`
      : "";

  const tier1 = {
    case: bookingCase,
    allowed_actions: ALLOWED_ACTIONS[bookingCase.state],
    policy: POLICY,
  };

  return JSON.stringify(
    {
      tier1,
      recent_interactions: recentInteractions,
      earlier_summary: earlierSummary,
      task: {
        event_type: event.type,
        payload: event.payload,
      },
    },
    null,
    2,
  );
}
