// Live underlying marks are off. Client P/L is the figure an admin saves on
// the holding in Users. This panel used to call Cloud Run for the futures
// feed and for manual settlement prices; those calls are parked with the
// rest of Cloud Run.
export default function AdminUnderlyingPricesPanel() {
  return (
    <div className="sg-panel p-5 space-y-2">
      <h2 className="text-base font-semibold" style={{ color: 'var(--sg-text)' }}>
        Underlying marks are off
      </h2>
      <p className="text-sm" style={{ color: 'var(--sg-muted)' }}>
        Live price feeds are paused. Open a client in Users and save the P/L on each holding.
        That number is what the client sees.
      </p>
    </div>
  );
}
