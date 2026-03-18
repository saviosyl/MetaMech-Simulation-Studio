export interface User {
  id: number;
  email: string;
  password_hash?: string;
  display_name: string;
  role: string;
  account_status?: string;
  email_verified_at?: Date | null;
  token_version?: number;
  trial_used_at?: Date | null;
  stripe_customer_id?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  data: any;
  created_at: Date;
  updated_at: Date;
}

export interface PasswordReset {
  id: number;
  user_id: number;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

export interface SubscriptionEntitlement {
  status: 'pending_verification' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | 'none';
  entitled: boolean;
  requiresEmailVerification: boolean;
  planCode: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
}

export interface JWTPayload {
  userId: number;
  email: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}