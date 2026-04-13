import SelectTimeClient from "@/app/select-time/select-time-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    case_id?: string | string[];
    caseId?: string | string[];
  }> | {
    case_id?: string | string[];
    caseId?: string | string[];
  };
};

export default async function SelectTimePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const raw = resolvedSearchParams?.case_id ?? resolvedSearchParams?.caseId;
  const caseId = Array.isArray(raw) ? raw[0] : raw ?? "";

  return <SelectTimeClient caseId={caseId} />;
}
