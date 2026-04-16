'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layouts/PageWrapper';
import { useDashboard, FinanceDashboardData } from '@/hooks/useDashboard';

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(current: number, previous: number) {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return change;
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
  const { data, isLoading } = useDashboard({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const finance = data as FinanceDashboardData | undefined;
  const thisPeriod = finance?.thisPeriod ?? [];
  const lastMonth = finance?.lastMonth ?? [];
  const breakdown = finance?.projectBreakdown ?? [];

  const getLastMonth = (currency: string) => lastMonth.find((l) => l.currency === currency);

  return (
    <PageWrapper title="Finance Dashboard">
      {/* Date range filter */}
      <div className="mb-6 flex flex-wrap gap-3 items-center">
        <span className="text-sm text-[#5D5B5B]">Date range:</span>
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
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#5D5B5B]">Loading…</div>
      ) : (
        <div className="space-y-6">
          {/* Monthly Summary Cards */}
          {thisPeriod.map((period) => {
            const prev = getLastMonth(period.currency);
            return (
              <div key={period.currency} className="space-y-4">
                <h2 className="text-sm font-semibold text-[#5D5B5B] uppercase tracking-wide">
                  {period.currency}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                    <p className="text-xs text-[#5D5B5B]">Approved CRs</p>
                    <p className="mt-1 text-3xl font-bold text-[#2D2D2D]">
                      {period.count}
                      <ChangeChip value={pct(period.count, prev?.count ?? 0)} />
                    </p>
                    <p className="mt-1 text-xs text-[#5D5B5B]">Last month: {prev?.count ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                    <p className="text-xs text-[#5D5B5B]">Total Hours</p>
                    <p className="mt-1 text-3xl font-bold text-[#2D2D2D]">
                      {period.hours}h
                      <ChangeChip value={pct(period.hours, prev?.hours ?? 0)} />
                    </p>
                    <p className="mt-1 text-xs text-[#5D5B5B]">Last month: {prev?.hours ?? 0}h</p>
                  </div>
                  <div className="rounded-xl border border-[#E5E5E5] bg-white p-5 shadow-sm">
                    <p className="text-xs text-[#5D5B5B]">Total Cost</p>
                    <p className="mt-1 text-2xl font-bold text-[#EF323F]">
                      {fmt(period.cost, period.currency)}
                      <ChangeChip value={pct(period.cost, prev?.cost ?? 0)} />
                    </p>
                    <p className="mt-1 text-xs text-[#5D5B5B]">
                      Last month: {fmt(prev?.cost ?? 0, period.currency)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}

          {thisPeriod.length === 0 && (
            <p className="text-sm text-[#5D5B5B]">No approved CRs in selected period.</p>
          )}

          {/* Project Breakdown Table */}
          {breakdown.length > 0 && (
            <div className="rounded-xl border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E5E5]">
                <h2 className="text-base font-semibold text-[#2D2D2D]">Project Breakdown</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-[#F7F7F7]">
                  <tr>
                    {['Project', 'Client', 'CRs', 'Hours', 'Total Cost', 'Currency'].map((h) => (
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
                  {breakdown.map((row) => (
                    <tr key={row.projectId} className="hover:bg-[#FAFAFA]">
                      <td className="px-4 py-3 font-medium text-[#2D2D2D]">{row.projectName}</td>
                      <td className="px-4 py-3 text-[#5D5B5B]">{row.clientName ?? '—'}</td>
                      <td className="px-4 py-3">{row.count}</td>
                      <td className="px-4 py-3">{row.hours}h</td>
                      <td className="px-4 py-3 font-semibold text-[#2D2D2D]">
                        {fmt(row.cost, row.currency)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#5D5B5B]">{row.currency}</td>
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
