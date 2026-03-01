export interface User {
  id: number;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
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
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}