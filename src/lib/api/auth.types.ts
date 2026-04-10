/** Matches Nest JWT strategy `validate` payload exposed on `GET /auth/me`. */
export type AuthUser = {
  userId: string;
  email: string;
  role: string;
  tokenType: "access" | "refresh";
};

export type RequestOtpResponse = {
  message: string;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type LogoutResponse = {
  message: string;
};
