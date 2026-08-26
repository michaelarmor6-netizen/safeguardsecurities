import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllInvestorProfiles } from '../../../services/investor/profileService';
import { createWalletForUser, getUserWallet } from '../../../services/investor/walletService';

export default function InvestorAdminWalletSetupPage() {
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  useEffect(() => {
    getAllInvestorProfiles()
      .then((rows) => setUsers(rows.map((u) => ({ id: u.id, email: u.email }))))
      .catch((e) => toast.error(e.message));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="sg-page-title">Wallet Setup</h1>
      <div className="sg-panel p-5 space-y-3">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between border-b sg-row-border pb-3 last:border-0">
            <span className="text-sm sg-text-main">{u.email}</span>
            <button
              type="button"
              className="sg-action-btn"
              onClick={async () => {
                if (await getUserWallet(u.id)) {
                  toast.error('Wallet already exists');
                  return;
                }
                await createWalletForUser(u.id);
                toast.success('Wallet created');
              }}
            >
              Create Wallet
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
