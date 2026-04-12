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

class InMemoryStore {
  private cases = new Map<string, BookingCase>();
  private drafts = new Map<string, Draft>();
  private timeline = new Map<string, TimelineEntry[]>();
  private interactions = new Map<string, Interaction[]>();
  private emailLog: MockEmailLog[] = [];
  private initialized = false;
  private nextCaseNumber = 5;

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

  getTimeline(caseId: string) {
    this.initialize();
    return this.timeline.get(caseId) ?? null;
  }

  getInteractions(caseId: string) {
    this.initialize();
    return this.interactions.get(caseId) ?? [];
  }

  getEmailLog(caseId?: string) {
    this.initialize();
    return caseId ? this.emailLog.filter((entry) => entry.case_id === caseId) : this.emailLog;
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
        content: "Case created via debug API",
        timestamp,
      },
    ]);
    this.interactions.set(id, []);

    return bookingCase;
  }
}

export const store = new InMemoryStore();

store.initialize();
