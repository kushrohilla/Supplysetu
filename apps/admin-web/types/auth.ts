export type DistributorUser = {
  id: string;
  tenant_id: string;
  username: string;
  mobile_number: string;
  role: string;
};

export type DistributorTenant = {
  id: string;
  code: string;
  distributor_name: string;
  owner_name: string;
  mobile_number: string;
  gst_number: string;
  full_address: string;
};

export type DistributorAuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  user: DistributorUser;
  tenant: DistributorTenant;
};

export type DistributorLoginPayload = {
  identifier: string;
  password: string;
};

export type DistributorSignupPayload = {
  distributor_name: string;
  owner_name: string;
  mobile_number: string;
  gst_number: string;
  full_address: string;
  password: string;
};

export type DistributorAuthApiResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: DistributorUser;
  tenant: DistributorTenant;
};
