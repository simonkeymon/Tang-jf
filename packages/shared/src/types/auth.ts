// Authentication-related types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName?: string;
}

export interface TokenPayload {
  sub: string; // subject / user id
  exp: number; // expiry as unix epoch seconds
  iat?: number; // issued at
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}
