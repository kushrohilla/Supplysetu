import { apiService } from "@/services/api.service";
import type {
  DeliveryAgentOption,
  DeliveryBatchOption,
  DeliveryFilterType,
  DeliveryOrder,
  SaveDeliveryUpdatesPayload
} from "@/types/delivery";

const USE_MOCK_DELIVERY = process.env.NEXT_PUBLIC_USE_MOCK_DELIVERY !== "false";

const shortReasonOptions = [
  "Cash Not Available",
  "Amount Dispute",
  "Partial Invoice Acceptance",
  "Retailer Requested Hold"
];

const batchOptions: DeliveryBatchOption[] = [
  { id: "DB-782145", label: "DB-782145" },
  { id: "DB-782219", label: "DB-782219" }
];

const agentOptions: DeliveryAgentOption[] = [
  { id: "AG-11", label: "Mahesh Solanki" },
  { id: "AG-29", label: "Ravi Parmar" },
  { id: "AG-41", label: "Hitesh Chauhan" }
];

const mockOutForDeliveryOrders: DeliveryOrder[] = [
  {
    id: "ORD-100551",
    retailerName: "Shree Balaji Stores",
    areaRoute: "Route 3 - Naranpura",
    paymentMode: "COD",
    packedQuantity: 34,
    deliveredQuantity: 34,
    expectedCodAmount: 12840,
    collectedAmount: 12840,
    shortCollectionReason: "",
    deliveryStatus: "DELIVERED",
    lifecycleState: "OUT_FOR_DELIVERY",
    paymentStatus: "COD_PENDING",
    dispatchBatchId: "DB-782145",
    deliveryAgentId: "AG-11"
  },
  {
    id: "ORD-100552",
    retailerName: "Patel Provision Mart",
    areaRoute: "Route 1 - Memnagar",
    paymentMode: "ADVANCE",
    packedQuantity: 19,
    deliveredQuantity: 19,
    expectedCodAmount: 0,
    collectedAmount: 0,
    shortCollectionReason: "",
    deliveryStatus: "DELIVERED",
    lifecycleState: "OUT_FOR_DELIVERY",
    paymentStatus: "PAID",
    dispatchBatchId: "DB-782145",
    deliveryAgentId: "AG-11"
  },
  {
    id: "ORD-100553",
    retailerName: "Ganesh Provision",
    areaRoute: "Route 1 - Memnagar",
    paymentMode: "COD",
    packedQuantity: 22,
    deliveredQuantity: 18,
    expectedCodAmount: 7540,
    collectedAmount: 6200,
    shortCollectionReason: "Cash Not Available",
    deliveryStatus: "PARTIALLY_DELIVERED",
    lifecycleState: "OUT_FOR_DELIVERY",
    paymentStatus: "COD_PENDING",
    dispatchBatchId: "DB-782219",
    deliveryAgentId: "AG-29"
  },
  {
    id: "ORD-100554",
    retailerName: "Krishna Mart",
    areaRoute: "Route 4 - Ranip",
    paymentMode: "COD",
    packedQuantity: 16,
    deliveredQuantity: 0,
    expectedCodAmount: 5200,
    collectedAmount: 0,
    shortCollectionReason: "",
    deliveryStatus: "SHOP_CLOSED",
    lifecycleState: "OUT_FOR_DELIVERY",
    paymentStatus: "COD_PENDING",
    dispatchBatchId: "DB-782219",
    deliveryAgentId: "AG-41"
  }
];

const cloneOrders = (orders: DeliveryOrder[]): DeliveryOrder[] => orders.map((order) => ({ ...order }));

class DeliveryService {
  getBatchOptions(): DeliveryBatchOption[] {
    return batchOptions;
  }

  getAgentOptions(): DeliveryAgentOption[] {
    return agentOptions;
  }

  getShortCollectionReasonOptions(): string[] {
    return shortReasonOptions;
  }

  async fetchDeliveryOrders(
    filterType: DeliveryFilterType,
    filterId: string
  ): Promise<DeliveryOrder[]> {
    if (!filterId) {
      return [];
    }

    if (USE_MOCK_DELIVERY) {
      return this.filterMockOrders(filterType, filterId);
    }

    try {
      return await apiService.request<DeliveryOrder[]>(
        `/delivery/orders?filterType=${filterType}&filterId=${encodeURIComponent(filterId)}`,
        { method: "GET" }
      );
    } catch {
      return this.filterMockOrders(filterType, filterId);
    }
  }

  async updateDeliveryResults(payload: SaveDeliveryUpdatesPayload): Promise<void> {
    if (USE_MOCK_DELIVERY) {
      this.applyMockResults(payload);
      return;
    }

    try {
      await apiService.request<void>("/delivery/results", {
        method: "POST",
        body: payload,
        parseJson: false
      });
    } catch {
      this.applyMockResults(payload);
    }
  }

  async recordCodCollection(payload: SaveDeliveryUpdatesPayload): Promise<void> {
    if (USE_MOCK_DELIVERY) {
      return;
    }

    await apiService.request<void>("/delivery/cod-collection", {
      method: "POST",
      body: payload,
      parseJson: false
    });
  }

  private filterMockOrders(filterType: DeliveryFilterType, filterId: string): DeliveryOrder[] {
    const filtered = mockOutForDeliveryOrders.filter((order) => {
      if (order.lifecycleState !== "OUT_FOR_DELIVERY") {
        return false;
      }

      return filterType === "BATCH"
        ? order.dispatchBatchId === filterId
        : order.deliveryAgentId === filterId;
    });

    return cloneOrders(filtered);
  }

  private applyMockResults(payload: SaveDeliveryUpdatesPayload): void {
    payload.updates.forEach((update) => {
      const order = mockOutForDeliveryOrders.find((item) => item.id === update.orderId);
      if (!order) {
        return;
      }

      order.deliveredQuantity = update.deliveredQuantity;
      order.deliveryStatus = update.deliveryStatus;
      order.lifecycleState = update.lifecycleState;
      order.paymentStatus = update.paymentStatus;

      if (update.cod) {
        order.expectedCodAmount = update.cod.expectedAmount;
        order.collectedAmount = update.cod.collectedAmount;
        order.shortCollectionReason = update.cod.shortCollectionReason;
      }
    });
  }
}

export const deliveryService = new DeliveryService();
