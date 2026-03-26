"use client";

import { useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

// Placeholder data based on inventory-ui-components.ts
const MOCK_HEALTH = {
  totalProducts: 250,
  inStock: 210,
  lowStock: 35,
  outOfStock: 5,
  healthPercentage: 86,
  lastSyncAt: new Date().toLocaleTimeString()
};

export function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "table" | "config">("overview");
  
  const handleUploadCsv = () => {
    alert("Trigger CSV Upload flow here. This will be wired to POST /api/inventory/sync");
  };

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-sm text-slate-500">Manage real-time stock levels and accounting sync</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white px-3 py-1.5 rounded-md border border-slate-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Synced today at {MOCK_HEALTH.lastSyncAt}
          </div>
          <button 
            onClick={handleUploadCsv}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-800"
          >
            Manual Sync
          </button>
        </div>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500">Health Score</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{MOCK_HEALTH.healthPercentage}%</div>
          <div className="mt-1 text-xs text-slate-500">Based on availability</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-slate-500">Total Products</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{MOCK_HEALTH.totalProducts}</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-amber-600">Low Stock</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{MOCK_HEALTH.lowStock}</div>
          <div className="mt-1 text-xs text-amber-600">Requires review</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="text-sm font-medium text-rose-600">Out of Stock</div>
          <div className="mt-2 text-3xl font-bold text-slate-900">{MOCK_HEALTH.outOfStock}</div>
          <div className="mt-1 text-xs text-rose-600">Zero availability</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          {(["overview", "table", "config"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                "whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium capitalize",
                activeTab === tab 
                  ? "border-slate-900 text-slate-900" 
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">Low Stock Alerts</h3>
              </div>
              <div className="p-4 flex flex-col items-center justify-center min-h-[200px] text-center">
                <p className="text-slate-500">No active alerts</p>
                <p className="text-xs text-slate-400 mt-1">Products below your defined threshold appear here.</p>
              </div>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <h3 className="font-semibold text-slate-800">Recent Sync Jobs</h3>
              </div>
              <ul className="divide-y divide-slate-100">
                <li className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Manual Batch Import (CSV)</p>
                    <p className="text-xs text-slate-500">Processed 250 records in 1.2s</p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Success</span>
                    <p className="text-xs text-slate-500 mt-1">Today {MOCK_HEALTH.lastSyncAt}</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "table" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">All Products</h3>
              <input type="text" placeholder="Search SKU or Brand..." className="border border-slate-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900" />
            </div>
            <div className="p-8 flex flex-col items-center justify-center">
               <EmptyState
                  icon={<span className="text-4xl">📚</span>}
                  title="Inventory ledger is clean."
                  helper="We have simulated data in your overview, but your actual product table relies on the real backend API."
                />
            </div>
          </div>
        )}

        {activeTab === "config" && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-2xl">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Sync Configuration</h3>
            </div>
            <div className="p-6 space-y-6">
              <div>
                 <h4 className="text-sm font-medium text-slate-900">Accounting Integration</h4>
                 <p className="text-sm text-slate-500 mb-3">Configure how SupplySetu connects to Tally or your ERP.</p>
                 <button className="bg-slate-100 text-slate-700 px-4 py-2 rounded-md text-sm cursor-not-allowed opacity-70">
                   Generate Webhook URL
                 </button>
              </div>
              <div>
                 <h4 className="text-sm font-medium text-slate-900 mb-2">Order Validation</h4>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" className="rounded text-slate-900 focus:ring-slate-900" defaultChecked />
                   <span className="text-sm text-slate-700">Strict Validation (Block orders without sufficient stock)</span>
                 </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
