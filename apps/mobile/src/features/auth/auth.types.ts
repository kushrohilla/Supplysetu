export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
};

export type AuthUser = {
  id: string;
  name: string;
  role: "retailer";
  tenantId: string;
  mobileNumber: string;
};

export type AuthSession = {
  tokens: AuthTokens;
  user: AuthUser;
};
