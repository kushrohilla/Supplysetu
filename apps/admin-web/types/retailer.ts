export type Retailer = {
  id: string;
  tenant_id: string;
  name: string;
  owner_name: string | null;
  mobile_number: string;
  gst_number: string | null;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminRetailerListItem = {
  id: string;
  name: string;
  phone: string;
  linked_at: string;
  last_order_date: string | null;
  total_orders: number;
  total_value: number;
};

export type AdminRetailerListResponse = {
  items: AdminRetailerListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export type AdminRetailerProfile = {
  id: string;
  name: string;
  phone: string;
  owner_name: string | null;
  gst_number: string | null;
  address_line1: string | null;
  locality: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  linked_at: string;
};

export type AdminRetailerSummary = {
  last_order_date: string | null;
  total_orders: number;
  total_value: number;
};

export type AdminRetailerRecentOrder = {
  id: string;
  order_number: string;
  status: string;
  total_amount_paise: number;
  created_at: string;
};

export type AdminRetailerDetail = {
  retailer: AdminRetailerProfile;
  summary: AdminRetailerSummary;
  recent_orders: AdminRetailerRecentOrder[];
};
