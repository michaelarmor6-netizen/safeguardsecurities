import { Timestamp } from 'firebase/firestore';

// User roles
export const UserRole = {
  CLIENT: 'client',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Transaction types
export const TransactionType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  TRANSFER: 'transfer',
  PAYMENT: 'payment'
} as const;

export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

// Transaction status
export const TransactionStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const;

export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

// Account types
export const AccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  BUSINESS: 'business'
} as const;

export type AccountType = typeof AccountType[keyof typeof AccountType];

// Fund request types
export const FundRequestType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal'
} as const;

export type FundRequestType = typeof FundRequestType[keyof typeof FundRequestType];

// Fund request status
export const FundRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export type FundRequestStatus = typeof FundRequestStatus[keyof typeof FundRequestStatus];

// E-wallet providers
export const EWalletProvider = {
  PAYPAL: 'paypal',
  VENMO: 'venmo',
  CASHAPP: 'cashapp',
  APPLEPAY: 'applepay',
  GOOGLEPAY: 'googlepay'
} as const;

export type EWalletProvider = typeof EWalletProvider[keyof typeof EWalletProvider];

// User interface
export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  role: UserRole;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  profileImageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
  lastLoginAt?: Timestamp;
}

// Account interface
export interface Account {
  id: string;
  userId: string;
  accountNumber: string;
  accountType: AccountType;
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Transaction interface
export interface Transaction {
  id: string;
  fromAccountId?: string;
  toAccountId?: string;
  userId: string;
  amount: number;
  currency: string;
  type: TransactionType;
  status: TransactionStatus;
  description: string;
  reference: string;
  metadata?: Record<string, any>;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  failureReason?: string;
}

// Fund request interface
export interface FundRequest {
  id: string;
  userId: string;
  accountId: string;
  type: FundRequestType;
  amount: number;
  currency: string;
  status: FundRequestStatus;
  description: string;
  paymentMethod?: string;
  bankDetails?: BankDetails;
  ewalletDetails?: EWalletDetails;
  documentUrl?: string;
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  adminNotes?: string;
}

// Bank details interface
export interface BankDetails {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  accountHolderName: string;
}

// E-wallet details interface
export interface EWalletDetails {
  provider: EWalletProvider;
  walletId: string;
  walletName?: string;
}

// Linked e-wallet interface
export interface LinkedEWallet {
  id: string;
  userId: string;
  provider: EWalletProvider;
  walletId: string;
  walletName: string;
  isVerified: boolean;
  balance?: number;
  currency?: string;
  linkedAt: Timestamp;
  lastSyncAt?: Timestamp;
}

// Deposit method interface
export interface DepositMethod {
  id: string;
  type: 'card' | 'bank' | 'ewallet';
  name: string;
  details: any;
  isDefault: boolean;
}

// Card details interface
export interface CardDetails {
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardHolderName: string;
  cardType: string;
  lastFourDigits: string;
}

// OTP verification interface
export interface OTPVerification {
  id: string;
  userId: string;
  method: 'sms' | 'email';
  code: string;
  purpose: string;
  expiresAt: Timestamp;
  isUsed: boolean;
  createdAt: Timestamp;
}

// Notification interface
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: Timestamp;
  readAt?: Timestamp;
}

// Analytics data interface
export interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  pendingRequests: number;
  monthlyGrowth: number;
  transactionVolume: number;
}

// Form interfaces
export interface LoginForm {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber?: string;
  agreeToTerms: boolean;
}

export interface ForgotPasswordForm {
  email: string;
}

export interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileForm {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface TransferForm {
  recipientAccount: string;
  amount: number;
  description: string;
  transferType: 'internal' | 'external' | 'ewallet';
  recipientBank?: string;
  recipientName?: string;
  ewalletProvider?: EWalletProvider;
}

export interface DepositForm {
  amount: number;
  method: 'card' | 'bank' | 'ewallet';
  description?: string;
  cardDetails?: CardDetails;
  bankDetails?: BankDetails;
  ewalletProvider?: EWalletProvider;
}

export interface WithdrawalForm {
  amount: number;
  method: 'bank' | 'ewallet';
  description?: string;
  bankDetails?: BankDetails;
  ewalletProvider?: EWalletProvider;
}

// API response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Context interfaces
export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (userData: SignupForm) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  enableTwoFactor: () => Promise<void>;
  disableTwoFactor: () => Promise<void>;
}

// System Configuration types
export interface SystemConfig {
  id: string;
  companyInfo: CompanyInfo;
  branding: BrandingConfig;
  contact: ContactInfo;
  features: SystemFeatures;
  security: SecurityConfig;
  notifications: NotificationConfig;
  supportEmailTemplates: SupportEmailTemplates;
  updatedAt: Date;
  updatedBy: string;
  version: string;
}

export interface CompanyInfo {
  name: string;
  legalName: string;
  description?: string;
  tagline?: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  establishedYear?: number;
  industry: string;
  timezone: string;
  defaultCurrency: string;
  supportedCurrencies: string[];
}

export interface BrandingConfig {
  logo: {
    primary: string; // URL to primary logo
    secondary?: string; // URL to secondary/white version
    favicon?: string; // URL to favicon
    width?: number;
    height?: number;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
  };
  layout: {
    sidebarWidth: number;
    headerHeight: number;
    footerHeight: number;
    borderRadius: string;
  };
}

export interface ContactInfo {
  email: {
    primary: string;
    support: string;
    billing?: string;
    legal?: string;
    noreply?: string;
  };
  phone: {
    primary: string;
    support?: string;
    international?: string;
    fax?: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  socialMedia?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    instagram?: string;
    youtube?: string;
  };
  businessHours: {
    timezone: string;
    schedule: {
      [key: string]: {
        open: string;
        close: string;
        closed?: boolean;
      };
    };
  };
}

export interface SystemFeatures {
  multiCurrency: boolean;
  twoFactorAuth: boolean;
  emailVerification: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  maintenance: boolean;
  registration: boolean;
  passwordReset: boolean;
  accountRecovery: boolean;
  auditLogs: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  exportData: boolean;
  importData: boolean;
  bulkOperations: boolean;
}

export interface SecurityConfig {
  sessionTimeout: number; // in minutes
  maxLoginAttempts: number;
  lockoutDuration: number; // in minutes
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays?: number;
  };
  twoFactorAuth: {
    enforced: boolean;
    methods: ('sms' | 'email' | 'totp' | 'backup')[];
  };
  ipWhitelist: string[];
  rateLimiting: {
    enabled: boolean;
    requestsPerMinute: number;
  };
}

export interface NotificationConfig {
  email: {
    enabled: boolean;
    templates: {
      welcome: boolean;
      transactionAlert: boolean;
      securityAlert: boolean;
      maintenance: boolean;
      newsletter: boolean;
    };
  };
  sms: {
    enabled: boolean;
    provider?: string;
    templates: {
      twoFactorAuth: boolean;
      transactionAlert: boolean;
      securityAlert: boolean;
    };
  };
  push: {
    enabled: boolean;
    templates: {
      transactionAlert: boolean;
      securityAlert: boolean;
      maintenance: boolean;
    };
  };
  inApp: {
    enabled: boolean;
    retention: number; // days
  };
}

export interface SupportEmailTemplates {
  autoReply: {
    enabled: boolean;
    subject: string;
    message: string;
  };
  accountOpening: {
    acknowledgment: {
      subject: string;
      message: string;
    };
    approved: {
      subject: string;
      message: string;
    };
    requiresDocuments: {
      subject: string;
      message: string;
    };
  };
  general: {
    received: {
      subject: string;
      message: string;
    };
    resolved: {
      subject: string;
      message: string;
    };
    followUp: {
      subject: string;
      message: string;
    };
  };
}