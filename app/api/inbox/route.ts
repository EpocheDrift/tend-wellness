import { NextResponse } from "next/server";
import { store } from "@/lib/store";
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
};

type InboxGroup = {
  case_id: string;
  client_name: string;
  client_email: string;
  emails: InboxEmail[];
};

export function GET() {
  const grouped = new Map<string, InboxGroup>();

  store.getEmailLog().forEach((email) => {
    const bookingCase = store.getCase(email.case_id);
    if (!bookingCase) {
      return;
    }

    const currentGroup = grouped.get(email.case_id) ?? {
      case_id: email.case_id,
      client_name: bookingCase.client_name ?? "Unknown client",
      client_email: bookingCase.client_email,
      emails: [],
    };

    currentGroup.emails.push({
      ...email,
      is_intake: email.source_action === "send_intake_email",
      can_reply: email.source_action === "send_intake_email" && bookingCase.state === "intake_pending",
    });

    grouped.set(email.case_id, currentGroup);
  });

  const groups = Array.from(grouped.values())
    .map((group) => ({
      ...group,
      emails: [...group.emails].sort(
        (left, right) => new Date(left.sent_at).getTime() - new Date(right.sent_at).getTime(),
      ),
    }))
    .sort((left, right) => {
      const leftLatest = left.emails[left.emails.length - 1]?.sent_at ?? "";
      const rightLatest = right.emails[right.emails.length - 1]?.sent_at ?? "";
      return new Date(rightLatest).getTime() - new Date(leftLatest).getTime();
    });

  return NextResponse.json({ groups });
}
