// Temporary utility for debugging and updating localStorage accounts

export const debugUserAccounts = (userId: string) => {
  console.log('=== ACCOUNT DEBUGGER ===');
  console.log('User ID:', userId);
  
  // Check all localStorage keys for this user
  const allKeys = Object.keys(localStorage);
  const userKeys = allKeys.filter(key => key.includes(userId));
  
  console.log('All localStorage keys for user:', userKeys);
  
  userKeys.forEach(key => {
    const data = localStorage.getItem(key);
    console.log(`${key}:`, data ? JSON.parse(data) : null);
  });
  
  return userKeys;
};

export const updateAccountBalance = (userId: string, newBalance: number) => {
  console.log('=== UPDATING ACCOUNT BALANCE ===');
  
  const localAccountKey = `temp_account_${userId}`;
  const storedAccount = localStorage.getItem(localAccountKey);
  
  if (storedAccount) {
    const account = JSON.parse(storedAccount);
    console.log('Current account:', account);
    
    account.balance = newBalance;
    account.updatedAt = new Date();
    
    localStorage.setItem(localAccountKey, JSON.stringify(account));
    console.log('Updated account balance to:', newBalance);
    console.log('New account data:', account);
    
    return account;
  } else {
    console.log('No account found to update');
    return null;
  }
};

export const createAccountWithBalance = (userId: string, initialDeposit: number) => {
  console.log('=== CREATING NEW ACCOUNT WITH BALANCE ===');
  
  const tempAccount = {
    id: `${userId}_temp_checking`,
    userId: userId,
    accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
    accountType: 'checking',
    accountName: 'Primary Checking Account',
    balance: initialDeposit,
    currency: 'USD',
    status: 'active',
    isActive: true,
    interest: '0.25%',
    createdAt: new Date(),
    updatedAt: new Date(),
    features: {
      onlineBanking: true,
      mobileDeposit: true,
      billPay: true,
      transfers: true,
      overdraftProtection: false
    }
  };
  
  const localAccountKey = `temp_account_${userId}`;
  localStorage.setItem(localAccountKey, JSON.stringify(tempAccount));
  
  console.log('Created new account:', tempAccount);
  return tempAccount;
};

// Add these functions to window for easy browser console access
if (typeof window !== 'undefined') {
  (window as any).debugUserAccounts = debugUserAccounts;
  (window as any).updateAccountBalance = updateAccountBalance;
  (window as any).createAccountWithBalance = createAccountWithBalance;
}