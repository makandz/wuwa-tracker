import { ECHO_SUBSTAT_LABELS, type MakanEchoEstimate } from "../echo-estimates";

const echoEstimateNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});
const echoEstimateTunerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});
const echoEstimatePercentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  style: "percent",
});

/** Formats the expected echo count. */
function formatExpectedEchoes(value: number | null) {
  return value === null ? "-" : echoEstimateNumberFormatter.format(value);
}

/** Formats the expected tuner count. */
function formatExpectedTuners(value: number | null) {
  return value === null ? "-" : echoEstimateTunerFormatter.format(value);
}

/**
 * Shows resource estimates as a visible reference below the echo editor.
 * @param props - The calculated echo and tuner estimates.
 * @returns The resource estimate section.
 */
export function EchoEstimateSection({ estimate }: { estimate: MakanEchoEstimate }) {
  const targetStatPrefix = estimate.parsed.usedFallback
    ? "Fallback target stats"
    : "Target stats";
  const targetStatSource = estimate.parsed.usedFallback
    ? "using defaults"
    : "from character priorities";

  return (
    <section aria-label="Resource estimate" className="rounded-lg border border-app-border bg-app-surface p-3.5">
      <h2 className="mb-3 text-sm font-medium text-app-fg">
        5/20/25 resource estimate
      </h2>
      <div className="grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs leading-5 text-app-muted-subtle">
              Average echos and tuners needed to finish 1 piece. {targetStatPrefix} (
              {targetStatSource}):{" "}
              {estimate.parsed.otherTargetStats.map((stat, index) => (
                <span key={stat}>
                  {index === 0 ? "" : ", "}
                  <strong className="font-semibold text-app-fg">
                    {ECHO_SUBSTAT_LABELS[stat]}
                  </strong>
                </span>
              ))}
            </p>
          </div>
          <div className="text-xs font-medium text-app-muted-dim">
            +5 {echoEstimatePercentFormatter.format(estimate.passFiveChance)} · +20{" "}
            {echoEstimatePercentFormatter.format(estimate.passTwentyChance)}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="text-xs font-medium text-app-muted-subtle">
              <tr>
                <th className="px-3 py-2 text-left">Goal</th>
                <th className="px-3 py-2 text-right">Avg echos</th>
                <th className="px-3 py-2 text-right">Net tuners</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border">
              {estimate.rows.map((row) => (
                <tr
                  className={row.emphasized ? "bg-app-raised/45 text-app-fg" : "text-app-muted"}
                  key={row.id}
                >
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatExpectedEchoes(row.expectedEchoes)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium">
                    {formatExpectedTuners(row.expectedNetTuners)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs font-medium leading-5 text-app-muted-dim">
          Net tuners assume 30% refund on trashed leveled echos.
        </p>
      </div>
    </section>
  );
}
