'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { useDashboard, FinanceDashboardData } from '@/hooks/useDashboard';

const ALL_CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'PKR', 'SAR'];

// Fetch live rates from open.er-api.com (free, no API key required)
// Returns rates relative to USD (1 USD = X units)
function useExchangeRates() {
  return useQuery<Record<string, number>>({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error('Failed to fetch exchange rates');
      const json = await res.json();
      return json.rates as Record<string, number>;
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
    retry: 2,
  });
}

function convertTo(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  return (amount / fromRate) * toRate;
}

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function ChangeChip({ value }: { value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  return (
    <span
      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${positive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
    >
      {positive ? '+' : ''}
      {value}%
    </span>
  );
}

export default function FinanceDashboardPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientName, setClientName] = useState('');
  // Default to USD — all costs consolidated into USD
  const [currency, setCurrency] = useState('USD');

  const { data: rates, isLoading: ratesLoading, isError: ratesError } = useExchangeRates();
  // Fallback to 1:1 if rates unavailable (prevents crashes)
  const liveRates: Record<string, number> = rates ?? { USD: 1 };

  // Unfiltered call — used only to populate dropdown options
  const { data: optionsData } = useDashboard({});
  const optionsFinance = optionsData as FinanceDashboardData | undefined;
  const allBreakdown = optionsFinance?.projectBreakdown ?? [];
  const projectOptions = allBreakdown.map((p) => ({ id: p.projectId, name: p.projectName }));
  const clientOptions = [
    ...new Set(allBreakdown.map((p) => p.clientName).filter(Boolean) as string[]),
  ];

  const { data, isLoading } = useDashboard({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    projectId: projectId || undefined,
    clientName: clientName || undefined,
  });

  const finance = data as FinanceDashboardData | undefined;
  const thisPeriodRaw = finance?.thisPeriod ?? [];
  const lastMonthRaw = finance?.lastMonth ?? [];
  const breakdownRaw = finance?.projectBreakdown ?? [];

  // ── Consolidated view: convert everything to selected currency ──────────────
  const consolidated = {
    count: thisPeriodRaw.reduce((s, p) => s + p.count, 0),
    hours: thisPeriodRaw.reduce((s, p) => s + p.hours, 0),
    cost: thisPeriodRaw.reduce((s, p) => s + convertTo(p.cost, p.currency, currency, liveRates), 0),
  };
  const consolidatedLast = {
    count: lastMonthRaw.reduce((s, p) => s + p.count, 0),
    hours: lastMonthRaw.reduce((s, p) => s + p.hours, 0),
    cost: lastMonthRaw.reduce((s, p) => s + convertTo(p.cost, p.currency, currency, liveRates), 0),
  };

  const hasFilter = dateFrom || dateTo || projectId || clientName || currency !== 'USD';
  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setProjectId('');
    setClientName('');
    setCurrency('USD');
  };

  return (
    <PageWrapper title="Finance Dashboard">
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        {/* Currency — always visible, defaults to USD */}
        <div className="flex items-center gap-1.5">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="rounded-lg border-2 border-[#EF323F] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#EF323F] bg-white text-[#EF323F]"
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {ratesLoading && <span className="text-xs text-[#5D5B5B]">Fetching rates…</span>}
          {ratesError && <span className="text-xs text-red-500">Rates unavailable</span>}
          {rates && !ratesLoading && <span className="text-xs text-green-600">Live rates</span>}
        </div>

        {/* Project */}
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] bg-white"
        >
          <option value="">All Projects</option>
          {projectOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Client */}
        <select
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F] bg-white"
        >
          <option value="">All POs</option>
          {clientOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Date range */}
        <span className="text-sm text-[#5D5B5B]">Date:</span>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
        />
        <span className="text-sm text-[#5D5B5B]">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-lg border border-[#D3D3D3] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#EF323F]"
        />
        {hasFilter && (
          <button onClick={clearFilters} className="text-xs text-[#EF323F] hover:underline">
            Reset
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* ── Single consolidated card group ── */}
          {thisPeriodRaw.length > 0 ? (
            <div className="space-y-4">
              <p className="text-xs text-[#5D5B5B] uppercase tracking-wide font-semibold">
                All projects · converted to {currency}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                  <p className="text-xs text-[#5D5B5B]">Approved CRs</p>
                  <p className="mt-1 text-3xl font-bold text-[#2D2D2D]">
                    {consolidated.count}
                    <ChangeChip value={pct(consolidated.count, consolidatedLast.count)} />
                  </p>
                  <p className="mt-1 text-xs text-[#5D5B5B]">
                    Last month: {consolidatedLast.count}
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                  <p className="text-xs text-[#5D5B5B]">Total Hours</p>
                  <p className="mt-1 text-3xl font-bold text-[#2D2D2D]">
                    {consolidated.hours}h
                    <ChangeChip value={pct(consolidated.hours, consolidatedLast.hours)} />
                  </p>
                  <p className="mt-1 text-xs text-[#5D5B5B]">
                    Last month: {consolidatedLast.hours}h
                  </p>
                </div>
                <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                  <p className="text-xs text-[#5D5B5B]">Total Cost ({currency})</p>
                  <p className="mt-1 text-2xl font-bold text-[#EF323F]">
                    {fmt(consolidated.cost, currency)}
                    <ChangeChip value={pct(consolidated.cost, consolidatedLast.cost)} />
                  </p>
                  <p className="mt-1 text-xs text-[#5D5B5B]">
                    Last month: {fmt(consolidatedLast.cost, currency)}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#5D5B5B]">No approved CRs in selected period.</p>
          )}

          {/* ── Project Breakdown Table ── */}
          {breakdownRaw.length > 0 && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
                <h2 className="text-base font-semibold text-[#2D2D2D]">Project Breakdown</h2>
                <span className="text-xs text-[#5D5B5B]">Costs converted to {currency}</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#F7F7F7]">
                  <tr>
                    {[
                      'Project',
                      'PO',
                      'CRs',
                      'Hours',
                      'Original Cost',
                      `Cost (${currency})`,
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-[#5D5B5B] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0F0F0]">
                  {breakdownRaw.map((row) => (
                    <tr key={row.projectId} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-medium text-[#2D2D2D]">{row.projectName}</td>
                      <td className="px-4 py-3 text-[#5D5B5B]">{row.clientName ?? '—'}</td>
                      <td className="px-4 py-3">{row.count}</td>
                      <td className="px-4 py-3">{row.hours}h</td>
                      <td className="px-4 py-3 text-[#5D5B5B]">{fmt(row.cost, row.currency)}</td>
                      <td className="px-4 py-3 font-semibold text-[#2D2D2D]">
                        {fmt(convertTo(row.cost, row.currency, currency, liveRates), currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
