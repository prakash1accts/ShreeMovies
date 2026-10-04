"use client";

import { useMemo, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import { saveMovieSettlementCostsAction } from "@/app/actions/admin";
import type { MovieSettlement, MovieSettlementCosts } from "@/lib/data";
import { formatVenueDateTime } from "@/lib/timezone";

function formatAOA(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatUSD(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminMovieSettlement({
  settlement,
  costs,
}: {
  settlement: MovieSettlement;
  costs: MovieSettlementCosts | undefined;
}) {
  const [state, formAction, isPending] = useActionState(saveMovieSettlementCostsAction, undefined);

  // Prefilled from whatever was last saved for this movie, so re-opening the
  // report isn't a blank form — but every field stays fully editable, since
  // costs can be revised and the exchange rate moves day to day.
  const [theatreCost, setTheatreCost] = useState(
    costs ? (costs.theatre_cost_cents / 100).toString() : ""
  );
  const [distributionCostUsd, setDistributionCostUsd] = useState(
    costs ? (costs.distribution_cost_usd_cents / 100).toString() : ""
  );
  const [exchangeRate, setExchangeRate] = useState(
    costs && Number(costs.exchange_rate_aoa_per_usd) > 0
      ? String(costs.exchange_rate_aoa_per_usd)
      : ""
  );

  // Recomputed live as the admin types, before anything is even saved, so
  // they can see the effect of a cost/rate change immediately.
  const profit = useMemo(() => {
    const theatreCostAoa = Number(theatreCost) || 0;
    const distributionCostUsdNum = Number(distributionCostUsd) || 0;
    const rate = Number(exchangeRate) || 0;
    const revenueAoa = settlement.totalRevenueCents / 100;

    if (rate <= 0) return null;

    const revenueUsd = revenueAoa / rate;
    const totalCostAoa = theatreCostAoa + distributionCostUsdNum * rate;
    const totalCostUsd = theatreCostAoa / rate + distributionCostUsdNum;
    const profitAoa = revenueAoa - totalCostAoa;
    const profitUsd = revenueUsd - totalCostUsd;

    return { revenueAoa, revenueUsd, totalCostAoa, totalCostUsd, profitAoa, profitUsd };
  }, [theatreCost, distributionCostUsd, exchangeRate, settlement.totalRevenueCents]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">{settlement.movieTitle}</h1>
          <p className="mt-1 text-sm text-neutral-400">Settlement report — all showtimes</p>
        </div>
        <Link
          href="/admin/reports"
          className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-700"
        >
          Back to Reports
        </Link>
      </div>

      {settlement.anyOpenShowtimes && (
        <p className="mt-4 rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-sm text-amber-400 print:hidden">
          Some of this movie&apos;s showtimes are still open (not closed yet) — totals below may
          still change until every show is closed.
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="px-4 py-3">Show date</th>
              <th className="px-4 py-3">Screen</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tickets sold</th>
              <th className="px-4 py-3">Revenue (AOA)</th>
            </tr>
          </thead>
          <tbody>
            {settlement.rows.map((r) => (
              <tr key={r.showtimeId} className="border-t border-neutral-800">
                <td className="px-4 py-3">{formatVenueDateTime(r.startsAt)}</td>
                <td className="px-4 py-3 text-neutral-400">{r.screenName}</td>
                <td className="px-4 py-3">
                  {r.closedAt ? (
                    <span className="text-neutral-500">Closed</span>
                  ) : (
                    <span className="text-green-400">Open</span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-400">{r.tickets}</td>
                <td className="px-4 py-3 text-neutral-400">{formatAOA(r.revenueCents)}</td>
              </tr>
            ))}
          </tbody>
          {settlement.rows.length === 0 && (
            <tbody>
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No showtimes yet for this movie.
                </td>
              </tr>
            </tbody>
          )}
        </table>
        <div className="flex items-center justify-between border-t-2 border-neutral-700 bg-neutral-900/60 px-4 py-3 text-sm font-semibold text-neutral-200">
          <span>Total</span>
          <span>
            {settlement.totalTickets} tickets · AOA {formatAOA(settlement.totalRevenueCents)}
          </span>
        </div>
      </div>

      <section className="mt-8 rounded-lg border border-neutral-800 bg-neutral-900 p-5 print:hidden">
        <h2 className="font-semibold">Costs</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Entered by hand — everything above (tickets, revenue) is computed automatically.
        </p>
        <form action={formAction} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <input type="hidden" name="movieId" value={settlement.movieId} />
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Theatre cost (AOA)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              name="theatreCost"
              value={theatreCost}
              onChange={(e) => setTheatreCost(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">Distribution cost (USD)</label>
            <input
              type="number"
              step="0.01"
              min={0}
              name="distributionCostUsd"
              value={distributionCostUsd}
              onChange={(e) => setDistributionCostUsd(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-neutral-300">
              Exchange rate (AOA per 1 USD)
            </label>
            <input
              type="number"
              step="0.0001"
              min={0}
              name="exchangeRate"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              placeholder="e.g. 920"
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-red-500"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Today&apos;s rate — re-enter it each time, since it moves day to day. Saved with the
              report so it&apos;s remembered next time you open it.
            </p>
          </div>

          {state?.error && <p className="sm:col-span-3 text-sm text-red-400">{state.error}</p>}

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save costs"}
            </button>
            {costs && (
              <span className="ml-3 text-xs text-neutral-500">
                Last saved {formatVenueDateTime(costs.updated_at)}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <h2 className="font-semibold">Profit</h2>
        {profit ? (
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-neutral-800 p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Revenue</div>
              <div className="mt-1 text-lg font-semibold text-neutral-100">
                AOA {formatAOA(settlement.totalRevenueCents)}
              </div>
              <div className="text-sm text-neutral-500">USD {formatUSD(profit.revenueUsd)}</div>
            </div>
            <div className="rounded-md border border-neutral-800 p-4">
              <div className="text-xs uppercase tracking-wide text-neutral-500">Total cost</div>
              <div className="mt-1 text-lg font-semibold text-neutral-100">
                AOA {formatAOA(Math.round(profit.totalCostAoa * 100))}
              </div>
              <div className="text-sm text-neutral-500">USD {formatUSD(profit.totalCostUsd)}</div>
            </div>
            <div
              className={`rounded-md border p-4 sm:col-span-2 ${
                profit.profitAoa >= 0
                  ? "border-green-900/50 bg-green-950/20"
                  : "border-red-900/50 bg-red-950/20"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-neutral-500">
                {profit.profitAoa >= 0 ? "Profit" : "Loss"}
              </div>
              <div
                className={`mt-1 text-xl font-bold ${
                  profit.profitAoa >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                Total AOA {formatAOA(Math.round(profit.profitAoa * 100))}
              </div>
              <div
                className={`text-sm ${profit.profitAoa >= 0 ? "text-green-500" : "text-red-500"}`}
              >
                Total USD {formatUSD(profit.profitUsd)}
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">
            Enter an exchange rate above to calculate profit in both currencies.
          </p>
        )}
      </section>
    </div>
  );
}
