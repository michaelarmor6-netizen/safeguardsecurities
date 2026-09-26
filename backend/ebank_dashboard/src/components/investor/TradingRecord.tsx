import { useMemo, useState } from 'react';
import { Download, Printer, Radio } from 'lucide-react';
import { tradeCreditDebit, type Trade } from '../../services/investor/tradesService';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtDate = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }).format(d);

const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d);

const fmtLatest = (d: Date) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);

function fmtExpiry(value?: string) {
  if (!value) return '—';
  const parsed = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US');
}

function statusOf(t: Trade): { label: string; color: string } {
  if (t.remarks === 'CLOSED') return { label: 'Closed', color: 'var(--sg-muted-2)' };
  if (t.clientStatus === 'pending') return { label: 'Pending', color: 'var(--sg-gold)' };
  if (t.clientStatus === 'inactive') return { label: 'Inactive', color: 'var(--sg-muted-2)' };
  return { label: 'Active', color: 'var(--sg-teal)' };
}

function downloadCsv(rows: Trade[], side: 'buy' | 'sell') {
  const headers = ['Trade date', 'Time', 'Trade ref', 'Symbol', 'Call/Put', 'Strike', 'Entry', 'Expiry', 'Qty', 'Price', 'Trade value', 'Fee', 'Commission', 'Credit/Debit', 'Status'];
  const lines = rows.map((t) =>
    [
      t.executedAt ? fmtDate(t.executedAt) : '',
      t.executedAt ? fmtTime(t.executedAt) : '',
      t.tradeRef,
      t.symbol,
      t.optionType ?? '',
      t.strikePrice ?? '',
      t.entryUnderlyingPrice ?? '',
      t.expiryDate ?? '',
      t.quantity,
      t.price,
      t.grossAmount,
      t.fees,
      t.commission,
      tradeCreditDebit(t),
      statusOf(t).label,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${side}-record-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function TradingRecord({ trades, refreshLabel = 'Live · refreshes every 12s' }: { trades: Trade[]; refreshLabel?: string }) {
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const rows = useMemo(() => trades.filter((t) => t.side === side), [trades, side]);
  const settlementTotal = rows.reduce((sum, t) => sum + tradeCreditDebit(t), 0);
  const latest = rows.find((t) => t.executedAt)?.executedAt;
  const instruments = new Set(rows.map((t) => t.symbol.trim().toUpperCase()).filter(Boolean)).size;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--sg-teal)' }}>
          {side === 'buy' ? 'Buy history' : 'Sell history'}
        </p>
        <div className="flex rounded-full p-1" style={{ background: 'var(--sg-bg-elevated)', border: '1px solid var(--sg-border)' }}>
          {(['buy', 'sell'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSide(value)}
              className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide"
              style={{
                background: side === value ? 'var(--sg-indigo)' : 'transparent',
                color: side === value ? '#fff' : 'var(--sg-muted)',
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <section
        className="sg-panel p-5 md:p-6"
        style={{
          background: 'linear-gradient(155deg, rgba(16,185,129,0.16), var(--sg-surface) 46%, rgba(99,102,241,0.1))',
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--sg-muted)' }}>
            <span>Fill ledger</span>
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal font-medium" style={{ color: 'var(--sg-teal)' }}>
              <Radio className="h-3 w-3" />
              {refreshLabel}
            </span>
          </div>
          <div className="flex gap-2">
            <button type="button" className="sg-btn-ghost flex items-center gap-2 text-xs" onClick={() => downloadCsv(rows, side)}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </button>
            <button type="button" className="sg-btn-primary flex items-center gap-2 text-xs" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>

        <h2 className="mt-5 text-2xl font-bold" style={{ fontFamily: 'var(--sg-font-display)', color: 'var(--sg-text)' }}>
          Trading record
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--sg-muted)' }}>
          Confirmed {side} fills on your SafeGuard account.
        </p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {[
            ['Confirmed fills', String(rows.length), side === 'buy' ? 'Buy-side executions' : 'Sell-side executions'],
            ['Credit / debit', fmt(settlementTotal), 'Same net the desk posts to the account'],
            ['Latest fill', latest ? fmtLatest(latest) : '—', 'Most recent execution'],
            ['Instruments', String(instruments), 'Unique symbols traded'],
          ].map(([label, value, hint]) => (
            <div key={label} className="rounded-xl px-4 py-3" style={{ background: 'var(--sg-bg-elevated)', border: '1px solid var(--sg-border)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--sg-muted-2)' }}>{label}</p>
              <p className="mt-1 text-lg font-semibold sg-text-main" style={{ fontFamily: 'var(--sg-font-display)' }}>{value}</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--sg-muted)' }}>{hint}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="sg-panel overflow-x-auto sg-table-stack-wrap">
        <table className="min-w-full text-sm sg-table-stack">
          <thead>
            <tr className="text-[10px] uppercase tracking-[0.12em]" style={{ color: 'var(--sg-muted-2)' }}>
              {['Trade date', 'Time', 'Trade ref', 'Symbol', 'Call/Put', 'Strike', 'Entry', 'Expiry', 'Qty', 'Price', 'Trade value', 'Fee', 'Commission', 'Credit/Debit', 'Status'].map((h) => (
                <th key={h} className={`p-3 ${['Strike', 'Entry', 'Qty', 'Price', 'Trade value', 'Fee', 'Commission', 'Credit/Debit'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => {
              const status = statusOf(t);
              return (
                <tr key={t.id} className="border-t sg-row-border">
                  <td className="p-3 whitespace-nowrap sg-text-main" data-label="Trade date">{t.executedAt ? fmtDate(t.executedAt) : '—'}</td>
                  <td className="p-3 whitespace-nowrap sg-text-muted" data-label="Time">{t.executedAt ? fmtTime(t.executedAt) : '—'}</td>
                  <td className="p-3 font-mono text-[11px] leading-tight sg-text-faint" data-label="Trade ref">{t.tradeRef || '—'}</td>
                  <td className="p-3 font-semibold sg-text-main" data-label="Symbol">{t.symbol}</td>
                  <td className="p-3 uppercase text-xs sg-text-muted" data-label="Call/Put">{t.optionType ?? '—'}</td>
                  <td className="p-3 text-right sg-text-main" data-label="Strike">{t.strikePrice != null ? fmt(t.strikePrice) : '—'}</td>
                  <td className="p-3 text-right sg-text-main" data-label="Entry">{t.entryUnderlyingPrice != null ? fmt(t.entryUnderlyingPrice) : '—'}</td>
                  <td className="p-3 whitespace-nowrap sg-text-muted" data-label="Expiry">{fmtExpiry(t.expiryDate)}</td>
                  <td className="p-3 text-right sg-text-main" data-label="Qty">{t.quantity.toLocaleString()}</td>
                  <td className="p-3 text-right sg-text-main" data-label="Price">{fmt(t.price)}</td>
                  <td className="p-3 text-right sg-text-main" data-label="Trade value">{fmt(t.grossAmount)}</td>
                  <td className="p-3 text-right sg-text-muted" data-label="Fee">{fmt(t.fees)}</td>
                  <td className="p-3 text-right sg-text-muted" data-label="Commission">{fmt(t.commission)}</td>
                  <td className="p-3 text-right font-medium" data-label="Credit/Debit" style={{ color: tradeCreditDebit(t) >= 0 ? 'var(--sg-teal)' : 'var(--sg-danger)' }}>{fmt(tradeCreditDebit(t))}</td>
                  <td className="p-3 text-xs font-semibold uppercase" data-label="Status" style={{ color: status.color }}>{status.label}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-8 text-center sg-text-muted">No confirmed {side} fills yet.</p>}
        {rows.length > 0 && (
          <p className="px-4 py-3 text-xs" style={{ color: 'var(--sg-muted-2)' }}>
            Showing {rows.length} {rows.length === 1 ? 'entry' : 'entries'}.
          </p>
        )}
      </div>

      <p className="text-xs rounded-xl px-4 py-3" style={{ color: 'var(--sg-muted)', border: '1px solid var(--sg-border)', background: 'var(--sg-bg-elevated)' }}>
        Price is the contract premium. Entry is the underlying on the day the desk opened the contract. Credit/debit is trade value plus fee plus commission on a buy, and trade value minus both on a sell.
      </p>
    </div>
  );
}
