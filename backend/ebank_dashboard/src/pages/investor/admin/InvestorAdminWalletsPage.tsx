import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllWallets, type InvestorWallet } from '../../../services/investor/walletService';

export default function InvestorAdminWalletsPage() {
  const [rows, setRows] = useState<InvestorWallet[]>([]);
  const load = () => getAllWallets().then(setRows).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="space-y-4">
      <h1 className="sg-page-title">Wallets</h1>
      <div className="sg-panel overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="sg-text-muted">
            <tr>
              <th className="text-left p-4">User ID</th>
              <th className="text-left p-4">Label</th>
              <th className="text-left p-4">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t sg-row-border">
                <td className="p-4 sg-text-main">{w.userId}</td>
                <td className="p-4 sg-text-muted">{w.label}</td>
                <td className="p-4 text-sg-teal">{fmt(w.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 sg-text-muted text-center">No wallets.</p>}
      </div>
    </div>
  );
}
