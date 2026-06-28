import PracticeSession from "@/components/PracticeSession";

export const dynamic = "force-dynamic";

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        Calibration practice
      </h1>
      <p className="mb-6 text-sm text-muted">
        Answer true/false questions with a probability and get instant feedback.
        Real predictions take months to resolve — this trains the same skill in
        minutes. Scored separately from your forecasting track record.
      </p>
      <PracticeSession />
    </div>
  );
}
