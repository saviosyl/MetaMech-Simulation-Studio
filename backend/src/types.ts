export interface User {
  id: number;
  email: string;
  password_hash: string;
  display_name: string;
  role: string;
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
  email: string;
  token: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface JWTPayload {
  userId: number;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}