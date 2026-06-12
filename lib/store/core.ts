import { getAvailableActions } from "@/lib/policy";
import { getSeedData } from "@/lib/seed";
import type {
  BookingCase,
  Draft,
  Interaction,
  MockEmailLog,
  TimelineEntry,
} from "@/lib/types";

type CreateCaseInput = {
  client_email: string;
  client_name?: string;
  source?: string;
};

export class InMemoryStore {
  private cases = new Map<string, BookingCase>();
  private drafts = new Map<string, Draft>();
  private timeline = new Map<string, TimelineEntry[]>();
  private interactions = new Map<string, Interaction[]>();
  private emailLog: MockEmailLog[] = [];
  private initialized = false;
  private nextCaseNumber = 5;
  private nextDraftNumber = 1;
  private nextEmailNumber = 1;

  reset() {
    this.cases.clear();
    this.drafts.clear();
    this.timeline.clear();
    this.interactions.clear();
    this.emailLog = [];
    this.nextCaseNumber = 5;
    this.initialized = false;
    this.initialize();
  }

  initialize() {
    if (this.initialized) {
      return;
    }

    const seed = getSeedData();

    seed.cases.forEach((bookingCase) => {
      this.cases.set(bookingCase.id, bookingCase);
    });

    seed.drafts.forEach((draft) => {
      this.drafts.set(draft.id, draft);
    });

    seed.timeline.forEach((entry) => {
      const items = this.timeline.get(entry.case_id) ?? [];
      items.push(entry);
      this.timeline.set(entry.case_id, items);
    });

    seed.interactions.forEach((interaction) => {
      const items = this.interactions.get(interaction.case_id) ?? [];
      items.push(interaction);
      this.interactions.set(interaction.case_id, items);
    });

    this.emailLog = seed.emailLog;
    this.nextDraftNumber = seed.drafts.length + 1;
    this.nextEmailNumber = seed.emailLog.length + 1;
    this.initialized = true;
  }

  listCases() {
    this.initialize();
    return Array.from(this.cases.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  getCase(caseId: string) {
    this.initialize();
    return this.cases.get(caseId) ?? null;
  }

  getAvailableActions(caseId: string) {
    this.initialize();
    const bookingCase = this.getCase(caseId);

    if (!bookingCase) {
      return null;
    }

    return {
      case_id: bookingCase.id,
      state: bookingCase.state,
      actions: getAvailableActions(bookingCase.state),
    };
  }

  listDrafts(caseId?: string) {
    this.initialize();
    const items = Array.from(this.drafts.values());
    return caseId ? items.filter((draft) => draft.case_id === caseId) : items;
  }

  getDraft(draftId: string) {
    this.initialize();
    return this.drafts.get(draftId) ?? null;
  }

  getTimeline(caseId: string) {
    this.initialize();
    const items = this.timeline.get(caseId);
    return items ? [...items] : null;
  }

  getInteractions(caseId: string) {
    this.initialize();
    return [...(this.interactions.get(caseId) ?? [])];
  }

  getEmailLog(caseId?: string) {
    this.initialize();
    return caseId ? this.emailLog.filter((entry) => entry.case_id === caseId) : [...this.emailLog];
  }

  updateCase(caseId: string, patch: Partial<BookingCase>) {
    this.initialize();
    const bookingCase = this.getCase(caseId);

    if (!bookingCase) {
      return null;
    }

    const nextCase = {
      ...bookingCase,
      ...patch,
    };

    this.cases.set(caseId, nextCase);
    return nextCase;
  }

  updateDraft(draftId: string, patch: Partial<Draft>) {
    this.initialize();
    const draft = this.getDraft(draftId);

    if (!draft) {
      return null;
    }

    const nextDraft = {
      ...draft,
      ...patch,
    };

    this.drafts.set(draftId, nextDraft);
    return nextDraft;
  }

  addDraft(input: Omit<Draft, "id" | "created_at" | "updated_at">) {
    this.initialize();
    const timestamp = new Date().toISOString();
    const id = `draft_${String(this.nextDraftNumber).padStart(3, "0")}`;
    this.nextDraftNumber += 1;
    const draft: Draft = {
      ...input,
      id,
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.drafts.set(id, draft);
    return draft;
  }

  addTimelineEntry(input: Omit<TimelineEntry, "id">) {
    this.initialize();
    const entry: TimelineEntry = {
      ...input,
      id: `timeline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    const items = this.timeline.get(input.case_id) ?? [];
    items.push(entry);
    this.timeline.set(input.case_id, items);
    return entry;
  }

  addInteraction(input: Omit<Interaction, "id">) {
    this.initialize();
    const interaction: Interaction = {
      ...input,
      id: `interaction_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    };
    const items = this.interactions.get(input.case_id) ?? [];
    items.push(interaction);
    this.interactions.set(input.case_id, items);
    return interaction;
  }

  logEmail(input: Omit<MockEmailLog, "id">) {
    this.initialize();
    const email: MockEmailLog = {
      ...input,
      id: `email_${String(this.nextEmailNumber).padStart(3, "0")}`,
    };
    this.nextEmailNumber += 1;
    this.emailLog.push(email);
    return email;
  }

  createCase(input: CreateCaseInput) {
    this.initialize();

    const timestamp = new Date().toISOString();
    const id = `case_${String(this.nextCaseNumber).padStart(3, "0")}`;
    this.nextCaseNumber += 1;

    const bookingCase: BookingCase = {
      id,
      state: "new_lead",
      client_email: input.client_email,
      client_name: input.client_name,
      source: input.source ?? "debug_api",
      paused_reason: null,
      current_step: "New inquiry",
      created_at: timestamp,
      updated_at: timestamp,
    };

    this.cases.set(id, bookingCase);
    this.timeline.set(id, [
      {
        id: `timeline_${id}`,
        case_id: id,
        type: "event",
        content:
          bookingCase.source === "squarespace_form"
            ? "Booking inquiry received via Squarespace form"
            : "Case created via debug API",
        timestamp,
      },
    ]);
    this.interactions.set(id, []);

    return bookingCase;
  }
}
