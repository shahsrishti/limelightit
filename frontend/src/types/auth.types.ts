export interface Role {
  id: string;
  name: 'SUPER_ADMIN' | 'ADMIN' | 'SUPERVISOR' | 'VIEWER';
  description?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
}

export interface ChangePasswordPayload {
  oldPassword: string;
  newPassword: string;
}
