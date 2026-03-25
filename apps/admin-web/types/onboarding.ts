export type BusinessSetup = {
  distributorBusinessName: string;
  warehouseAddress: string;
  cityRegion: string;
  businessCategory: string;
  orderWorkingHours: string;
  businessSetupCompleted: boolean;
};

export type StaffUser = {
  id: string;
  name: string;
  phone: string;
  role: "Warehouse Staff" | "Delivery Agent" | "Sales Rep";
};

export type FirstProduct = {
  id: string;
  productName: string;
  variantPackSize: string;
};

export type Retailer = {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  area: string;
};

export type DeliveryArea = {
  id: string;
  areaName: string;
  deliveryDay: string;
};

export type TenantOnboardingState = {
  currentStep: number;
  businessSetup: BusinessSetup;
  staffUsers: StaffUser[];
  catalogueSetupStarted: boolean;
  firstProducts: FirstProduct[];
  retailers: Retailer[];
  deliveryAreas: DeliveryArea[];
  onboardingComplete: boolean;
};
