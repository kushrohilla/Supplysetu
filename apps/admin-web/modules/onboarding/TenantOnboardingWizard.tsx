"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  DeliveryArea,
  FirstProduct,
  Retailer,
  StaffUser,
  TenantOnboardingState
} from "@/types/onboarding";
import { setTenantOnboardingComplete } from "@/services/onboarding.service";

const STORAGE_KEY = "tenant_onboarding_progress_v1";

const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const initialState: TenantOnboardingState = {
  currentStep: 1,
  businessSetup: {
    distributorBusinessName: "",
    warehouseAddress: "",
    cityRegion: "",
    businessCategory: "FMCG",
    orderWorkingHours: "",
    businessSetupCompleted: false
  },
  staffUsers: [],
  catalogueSetupStarted: false,
  firstProducts: [],
  retailers: [],
  deliveryAreas: [],
  onboardingComplete: false
};

const stepTitles = [
  "Business Setup",
  "Staff Setup",
  "Catalogue Setup",
  "Retailer Setup",
  "Delivery Area Setup"
];

export function TenantOnboardingWizard() {
  const router = useRouter();
  const [state, setState] = useState<TenantOnboardingState>(() => {
    if (typeof window === "undefined") {
      return initialState;
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return initialState;
    }
    try {
      return JSON.parse(raw) as TenantOnboardingState;
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
      return initialState;
    }
  });
  const [message, setMessage] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [staffDraft, setStaffDraft] = useState<Omit<StaffUser, "id">>({
    name: "",
    phone: "",
    role: "Warehouse Staff"
  });
  const [productDraft, setProductDraft] = useState<Omit<FirstProduct, "id">>({
    productName: "",
    variantPackSize: ""
  });
  const [retailerDraft, setRetailerDraft] = useState<Omit<Retailer, "id">>({
    shopName: "",
    ownerName: "",
    phone: "",
    area: ""
  });
  const [deliveryAreaDraft, setDeliveryAreaDraft] = useState<Omit<DeliveryArea, "id">>({
    areaName: "",
    deliveryDay: "Monday"
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const progressPercent = useMemo(
    () => Math.round((Math.min(Math.max(state.currentStep, 1), 5) / 5) * 100),
    [state.currentStep]
  );

  const completionReady = state.firstProducts.length > 0 && state.retailers.length > 0;

  const updateState = (updater: (current: TenantOnboardingState) => TenantOnboardingState) => {
    setState((previous) => updater(previous));
  };

  const goToStep = (step: number) => {
    updateState((current) => ({
      ...current,
      currentStep: Math.min(5, Math.max(1, step))
    }));
    setWarning(null);
    setMessage(null);
  };

  const saveBusinessSetup = () => {
    const form = state.businessSetup;
    if (
      !form.distributorBusinessName.trim() ||
      !form.warehouseAddress.trim() ||
      !form.cityRegion.trim() ||
      !form.orderWorkingHours.trim()
    ) {
      setWarning("Complete business setup fields before continuing.");
      return;
    }
    updateState((current) => ({
      ...current,
      businessSetup: { ...current.businessSetup, businessSetupCompleted: true },
      currentStep: 2
    }));
    setMessage("Business setup saved.");
    setWarning(null);
  };

  const addStaffUser = () => {
    if (!staffDraft.name.trim() || !staffDraft.phone.trim()) {
      setWarning("Enter staff name and phone.");
      return;
    }
    updateState((current) => ({
      ...current,
      staffUsers: [...current.staffUsers, { id: createId("STF"), ...staffDraft }]
    }));
    setStaffDraft({ name: "", phone: "", role: "Warehouse Staff" });
    setMessage("Staff user added.");
    setWarning(null);
  };

  const skipStaffSetup = () => {
    updateState((current) => ({ ...current, currentStep: 3 }));
    setWarning("Staff setup skipped. You can add staff later from settings.");
    setMessage(null);
  };

  const addFirstProduct = () => {
    if (!productDraft.productName.trim() || !productDraft.variantPackSize.trim()) {
      setWarning("Enter product name and pack size.");
      return;
    }
    updateState((current) => ({
      ...current,
      catalogueSetupStarted: true,
      firstProducts: [...current.firstProducts, { id: createId("PRD"), ...productDraft }]
    }));
    setProductDraft({ productName: "", variantPackSize: "" });
    setMessage("Product added.");
    setWarning(null);
  };

  const handleCataloguePdf = (file: File | undefined) => {
    if (!file) {
      return;
    }
    updateState((current) => ({
      ...current,
      catalogueSetupStarted: true
    }));
    setMessage(`Catalogue upload placeholder captured: ${file.name}`);
    setWarning(null);
  };

  const addRetailer = () => {
    if (
      !retailerDraft.shopName.trim() ||
      !retailerDraft.ownerName.trim() ||
      !retailerDraft.phone.trim() ||
      !retailerDraft.area.trim()
    ) {
      setWarning("Complete retailer fields before adding.");
      return;
    }
    updateState((current) => ({
      ...current,
      retailers: [...current.retailers, { id: createId("RTL"), ...retailerDraft }]
    }));
    setRetailerDraft({ shopName: "", ownerName: "", phone: "", area: "" });
    setMessage("Retailer added.");
    setWarning(null);
  };

  const generateInviteLink = () => {
    setMessage("Invite link placeholder generated: https://app.supplysetu.example/invite/TENANT-001");
    setWarning(null);
  };

  const addDeliveryArea = () => {
    if (!deliveryAreaDraft.areaName.trim()) {
      setWarning("Enter area name.");
      return;
    }
    updateState((current) => ({
      ...current,
      deliveryAreas: [...current.deliveryAreas, { id: createId("DAR"), ...deliveryAreaDraft }]
    }));
    setDeliveryAreaDraft({ areaName: "", deliveryDay: "Monday" });
    setMessage("Delivery area added.");
    setWarning(null);
  };

  const completeOnboarding = () => {
    if (!completionReady) {
      setWarning("Onboarding completion requires at least one product and one retailer.");
      return;
    }

    updateState((current) => ({ ...current, onboardingComplete: true }));
    setTenantOnboardingComplete();
    localStorage.removeItem(STORAGE_KEY);
    setMessage("Onboarding complete. Redirecting to operations dashboard...");
    setWarning(null);
    setTimeout(() => {
      router.replace("/review-orders");
      router.refresh();
    }, 300);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="rounded-lg border border-slate-200 bg-white p-4">
          <h1 className="text-xl font-semibold text-slate-900">Tenant Onboarding & Setup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Complete core setup to activate distributor operations.
          </p>
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>Progress</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 rounded bg-slate-200">
              <div className="h-2 rounded bg-slate-900" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {stepTitles.map((step, index) => {
              const stepNumber = index + 1;
              const active = stepNumber === state.currentStep;
              return (
                <button
                  key={step}
                  type="button"
                  onClick={() => goToStep(stepNumber)}
                  className={[
                    "rounded border px-2 py-1 text-xs",
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700"
                  ].join(" ")}
                >
                  {stepNumber}. {step}
                </button>
              );
            })}
          </div>
        </header>

        {message ? (
          <div className="rounded-md bg-emerald-100 px-3 py-2 text-sm text-emerald-700">{message}</div>
        ) : null}
        {warning ? (
          <div className="rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-700">{warning}</div>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          {state.currentStep === 1 ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                Distributor Business Name
                <input
                  value={state.businessSetup.distributorBusinessName}
                  onChange={(event) =>
                    updateState((current) => ({
                      ...current,
                      businessSetup: {
                        ...current.businessSetup,
                        distributorBusinessName: event.target.value
                      }
                    }))
                  }
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                Warehouse Address
                <input
                  value={state.businessSetup.warehouseAddress}
                  onChange={(event) =>
                    updateState((current) => ({
                      ...current,
                      businessSetup: { ...current.businessSetup, warehouseAddress: event.target.value }
                    }))
                  }
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                City / Region
                <input
                  value={state.businessSetup.cityRegion}
                  onChange={(event) =>
                    updateState((current) => ({
                      ...current,
                      businessSetup: { ...current.businessSetup, cityRegion: event.target.value }
                    }))
                  }
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                Business Category
                <select
                  value={state.businessSetup.businessCategory}
                  onChange={(event) =>
                    updateState((current) => ({
                      ...current,
                      businessSetup: { ...current.businessSetup, businessCategory: event.target.value }
                    }))
                  }
                  className="rounded border border-slate-300 px-2 py-1.5"
                >
                  <option>FMCG</option>
                  <option>Grocery</option>
                  <option>General Trade</option>
                  <option>Pharma</option>
                </select>
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                Order Working Hours
                <input
                  value={state.businessSetup.orderWorkingHours}
                  onChange={(event) =>
                    updateState((current) => ({
                      ...current,
                      businessSetup: { ...current.businessSetup, orderWorkingHours: event.target.value }
                    }))
                  }
                  placeholder="e.g. 08:00 - 18:00"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
              </label>
              <div className="col-span-2">
                <button
                  type="button"
                  onClick={saveBusinessSetup}
                  className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Save Business Setup
                </button>
              </div>
            </div>
          ) : null}

          {state.currentStep === 2 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-sm">
                <input
                  value={staffDraft.name}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Name"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <input
                  value={staffDraft.phone}
                  onChange={(event) => setStaffDraft((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Phone"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <select
                  value={staffDraft.role}
                  onChange={(event) =>
                    setStaffDraft((current) => ({
                      ...current,
                      role: event.target.value as StaffUser["role"]
                    }))
                  }
                  className="rounded border border-slate-300 px-2 py-1.5"
                >
                  <option>Warehouse Staff</option>
                  <option>Delivery Agent</option>
                  <option>Sales Rep</option>
                </select>
                <button
                  type="button"
                  onClick={addStaffUser}
                  className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Add Staff
                </button>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">Name</th>
                    <th className="border-b border-slate-200 px-2 py-2">Phone</th>
                    <th className="border-b border-slate-200 px-2 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {state.staffUsers.map((user) => (
                    <tr key={user.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{user.name}</td>
                      <td className="px-2 py-2">{user.phone}</td>
                      <td className="px-2 py-2">{user.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={skipStaffSetup}
                  className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-700"
                >
                  Skip With Warning
                </button>
              </div>
            </div>
          ) : null}

          {state.currentStep === 3 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <input
                  value={productDraft.productName}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, productName: event.target.value }))
                  }
                  placeholder="Product Name"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <input
                  value={productDraft.variantPackSize}
                  onChange={(event) =>
                    setProductDraft((current) => ({ ...current, variantPackSize: event.target.value }))
                  }
                  placeholder="Variant / Pack Size"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={addFirstProduct}
                  className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Quick Add Product
                </button>
              </div>
              <div className="rounded border border-slate-200 p-3 text-sm">
                <p className="mb-2 font-medium text-slate-700">Upload Catalogue PDF (Placeholder)</p>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(event) => handleCataloguePdf(event.target.files?.[0])}
                  className="text-xs"
                />
              </div>
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">Product</th>
                    <th className="border-b border-slate-200 px-2 py-2">Pack Size</th>
                  </tr>
                </thead>
                <tbody>
                  {state.firstProducts.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{product.productName}</td>
                      <td className="px-2 py-2">{product.variantPackSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                onClick={() => goToStep(4)}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm"
              >
                Continue
              </button>
            </div>
          ) : null}

          {state.currentStep === 4 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-5 gap-2 text-sm">
                <input
                  value={retailerDraft.shopName}
                  onChange={(event) =>
                    setRetailerDraft((current) => ({ ...current, shopName: event.target.value }))
                  }
                  placeholder="Shop Name"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <input
                  value={retailerDraft.ownerName}
                  onChange={(event) =>
                    setRetailerDraft((current) => ({ ...current, ownerName: event.target.value }))
                  }
                  placeholder="Owner Name"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <input
                  value={retailerDraft.phone}
                  onChange={(event) =>
                    setRetailerDraft((current) => ({ ...current, phone: event.target.value }))
                  }
                  placeholder="Phone"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <input
                  value={retailerDraft.area}
                  onChange={(event) =>
                    setRetailerDraft((current) => ({ ...current, area: event.target.value }))
                  }
                  placeholder="Area"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={addRetailer}
                  className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Add Retailer
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={generateInviteLink}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Generate Invite Link
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(5)}
                  className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                >
                  Continue
                </button>
              </div>
              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">Shop</th>
                    <th className="border-b border-slate-200 px-2 py-2">Owner</th>
                    <th className="border-b border-slate-200 px-2 py-2">Phone</th>
                    <th className="border-b border-slate-200 px-2 py-2">Area</th>
                  </tr>
                </thead>
                <tbody>
                  {state.retailers.map((retailer) => (
                    <tr key={retailer.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{retailer.shopName}</td>
                      <td className="px-2 py-2">{retailer.ownerName}</td>
                      <td className="px-2 py-2">{retailer.phone}</td>
                      <td className="px-2 py-2">{retailer.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {state.currentStep === 5 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <input
                  value={deliveryAreaDraft.areaName}
                  onChange={(event) =>
                    setDeliveryAreaDraft((current) => ({ ...current, areaName: event.target.value }))
                  }
                  placeholder="Area Name"
                  className="rounded border border-slate-300 px-2 py-1.5"
                />
                <select
                  value={deliveryAreaDraft.deliveryDay}
                  onChange={(event) =>
                    setDeliveryAreaDraft((current) => ({ ...current, deliveryDay: event.target.value }))
                  }
                  className="rounded border border-slate-300 px-2 py-1.5"
                >
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                </select>
                <button
                  type="button"
                  onClick={addDeliveryArea}
                  className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                >
                  Add Delivery Area
                </button>
              </div>

              <table className="w-full border-collapse text-xs">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-2 py-2">Area</th>
                    <th className="border-b border-slate-200 px-2 py-2">Delivery Day</th>
                  </tr>
                </thead>
                <tbody>
                  {state.deliveryAreas.map((area) => (
                    <tr key={area.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{area.areaName}</td>
                      <td className="px-2 py-2">{area.deliveryDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
                <p>Completion checklist:</p>
                <p>At least one product: {state.firstProducts.length > 0 ? "Yes" : "No"}</p>
                <p>At least one retailer: {state.retailers.length > 0 ? "Yes" : "No"}</p>
              </div>

              <button
                type="button"
                onClick={completeOnboarding}
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white"
              >
                Complete Onboarding
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
