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
