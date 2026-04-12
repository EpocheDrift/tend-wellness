import SelectTimeClient from "@/app/select-time/select-time-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    case_id?: string | string[];
  }> | {
    case_id?: string | string[];
  };
};

export default async function SelectTimePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const caseId = Array.isArray(resolvedSearchParams?.case_id)
    ? resolvedSearchParams.case_id[0]
    : resolvedSearchParams?.case_id ?? "";

  return <SelectTimeClient caseId={caseId} />;
}
