import PredictionWizard, { type WizardPrefill } from "@/components/PredictionWizard";

export default async function NewPredictionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === "string" ? v : undefined;

  const baseRateRaw = str(sp.base_rate_pct);
  const baseRatePct =
    baseRateRaw != null && Number.isFinite(Number(baseRateRaw))
      ? Number(baseRateRaw)
      : undefined;

  const prefill: WizardPrefill = {
    claim: str(sp.claim),
    category: str(sp.category),
    resolvesAt: str(sp.resolves_at),
    baseRatePct,
  };
  const prefilled = Boolean(prefill.claim);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        Log a prediction
      </h1>
      <p className="mb-6 text-sm text-muted">
        {prefilled
          ? "Starting from a suggested question — refine the claim, then set your own probability."
          : "Commit your probability and reasoning before the outcome is known — that's what makes the later score honest."}
      </p>
      <PredictionWizard prefill={prefill} />
    </div>
  );
}
