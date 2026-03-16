export interface User {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  subscription: SubscriptionInfo;
}

export interface SubscriptionInfo {
  status: 'pending_verification' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
  entitled: boolean;
  requiresEmailVerification?: boolean;
  planCode: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface RegisterResult {
  message: string;
  requiresEmailVerification: boolean;
  email: string;
  devVerificationLink?: string;
}

export interface Project {
  id: number;
  name: string;
  data: any;
  created_at: string;
  updated_at: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, displayName: string) => Promise<RegisterResult>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<User | null>;
}