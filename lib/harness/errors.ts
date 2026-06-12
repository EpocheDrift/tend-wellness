export class UnknownCaseError extends Error {
  constructor(caseId: string) {
    super(`Unknown case: ${caseId}`);
    this.name = "UnknownCaseError";
  }
}

export class InvalidEventForStateError extends Error {
  constructor(eventType: string, state: string) {
    super(`Event ${eventType} is invalid for state ${state}`);
    this.name = "InvalidEventForStateError";
  }
}

export function harnessErrorStatus(error: unknown): number {
  if (error instanceof UnknownCaseError) {
    return 404;
  }
  if (error instanceof InvalidEventForStateError) {
    return 409;
  }
  return 500;
}

export function harnessErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected harness error";
}
