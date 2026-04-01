export type DistributorInviteLinkResponse = {
  invite_link: string;
};

export type RetailerInviteRecord = {
  tenant_id: string;
  invite_code: string;
  invite_url: string;
  created_at: string;
};

export type JoinedRetailerRecord = {
  retailer_id: string;
  join_source: string;
  status: string;
  created_at: string;
};
