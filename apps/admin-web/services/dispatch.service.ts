import { apiService } from "@/services/api.service";
import type {
  CreateDispatchBatchPayload,
  DispatchBatchSummary,
  LogisticsResourceOption,
  ReadyDispatchOrder
} from "@/types/dispatch";

const USE_MOCK_DISPATCH = process.env.NEXT_PUBLIC_USE_MOCK_DISPATCH !== "false";

const mockOrders: ReadyDispatchOrder[] = [
  {
    id: "ORD-100401",
    retailerName: "Patel Provision Mart",
    areaRoute: "Route 1 - Memnagar",
    totalUnits: 26,
    paymentMode: "ADVANCE",
    priority: "HIGH",
    dispatchBatchId: null,
    state: "READY_TO_DISPATCH"
  },
  {
    id: "ORD-100402",
    retailerName: "Shree Balaji Stores",
    areaRoute: "Route 3 - Naranpura",
    totalUnits: 32,
    paymentMode: "COD",
    priority: "MEDIUM",
    dispatchBatchId: null,
    state: "READY_TO_DISPATCH"
  },
  {
    id: "ORD-100403",
    retailerName: "Ganesh Provision",
    areaRoute: "Route 1 - Memnagar",
    totalUnits: 18,
    paymentMode: "COD",
    priority: "LOW",
    dispatchBatchId: null,
    state: "READY_TO_DISPATCH"
  },
  {
    id: "ORD-100404",
    retailerName: "Krishna Mart",
    areaRoute: "Route 4 - Ranip",
    totalUnits: 21,
    paymentMode: "ADVANCE",
    priority: "HIGH",
    dispatchBatchId: null,
    state: "READY_TO_DISPATCH"
  }
];

const routeOptions: LogisticsResourceOption[] = [
  { id: "Route 1 - Memnagar", label: "Route 1 - Memnagar" },
  { id: "Route 3 - Naranpura", label: "Route 3 - Naranpura" },
  { id: "Route 4 - Ranip", label: "Route 4 - Ranip" }
];

const vehicleOptions: LogisticsResourceOption[] = [
  { id: "VH-102", label: "Tata Ace (VH-102)" },
  { id: "VH-118", label: "Eeco Van (VH-118)" },
  { id: "VH-205", label: "Mini Truck (VH-205)" }
];

const agentOptions: LogisticsResourceOption[] = [
  { id: "AG-11", label: "Mahesh Solanki" },
  { id: "AG-29", label: "Ravi Parmar" },
  { id: "AG-41", label: "Hitesh Chauhan" }
];

const cloneOrders = (): ReadyDispatchOrder[] => mockOrders.map((order) => ({ ...order }));

class DispatchService {
  async fetchReadyToDispatchOrders(): Promise<ReadyDispatchOrder[]> {
    if (USE_MOCK_DISPATCH) {
      return cloneOrders().filter((order) => order.state === "READY_TO_DISPATCH");
    }

    try {
      return await apiService.request<ReadyDispatchOrder[]>("/dispatch/ready-orders", { method: "GET" });
    } catch {
      return cloneOrders().filter((order) => order.state === "READY_TO_DISPATCH");
    }
  }

  async createDispatchBatch(payload: CreateDispatchBatchPayload): Promise<DispatchBatchSummary> {
    if (USE_MOCK_DISPATCH) {
      return this.applyMockBatch(payload);
    }

    try {
      return await apiService.request<DispatchBatchSummary>("/dispatch/batches", {
        method: "POST",
        body: payload
      });
    } catch {
      return this.applyMockBatch(payload);
    }
  }

  async assignLogisticsResources(batchId: string, vehicleId: string, agentId: string): Promise<void> {
    if (USE_MOCK_DISPATCH) {
      return;
    }

    await apiService.request<void>(`/dispatch/batches/${batchId}/resources`, {
      method: "PATCH",
      body: { vehicleId, agentId },
      parseJson: false
    });
  }

  getRouteOptions(): LogisticsResourceOption[] {
    return routeOptions;
  }

  getVehicleOptions(): LogisticsResourceOption[] {
    return vehicleOptions;
  }

  getAgentOptions(): LogisticsResourceOption[] {
    return agentOptions;
  }

  private applyMockBatch(payload: CreateDispatchBatchPayload): DispatchBatchSummary {
    const batchId = `DB-${Date.now().toString().slice(-6)}`;

    mockOrders.forEach((order) => {
      if (!payload.orderIds.includes(order.id)) {
        return;
      }
      order.dispatchBatchId = batchId;
      order.state = "OUT_FOR_DELIVERY";
    });

    return {
      batchId,
      totalOrders: payload.orderIds.length,
      assignedRoute: payload.route,
      dispatchDate: payload.plannedDispatchDate
    };
  }
}

export const dispatchService = new DispatchService();
