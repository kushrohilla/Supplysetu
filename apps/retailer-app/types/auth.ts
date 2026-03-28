export type RetailerProfile = {
  id: string;
  name: string;
  phone: string;
};

export type DistributorOption = {
  id: string;
  name: string;
  logo_url?: string | null;
  city?: string | null;
};

export type RetailerSession = {
  stage: "preselected" | "selected";
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  retailer?: RetailerProfile;
  distributor?: DistributorOption;
  tenantId?: string;
  retailerId?: string;
};

export type OtpRequestResponse = {
  verification_id: string;
  resend_after_seconds: number;
  otp?: string;
};

export type VerifyOtpResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  retailer: {
    id: string;
    name: string;
    phone: string;
  };
};

export type SelectDistributorResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  tenant_id: string;
  retailer_id: string;
};
