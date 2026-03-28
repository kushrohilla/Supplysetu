"use client";

import { apiService } from "@/services/api.service";
import type { DistributorInviteLinkResponse } from "@/types/retailer-invite";

export const generateDistributorInvite = () =>
  apiService.request<DistributorInviteLinkResponse>("/invites", {
    method: "POST",
  });
