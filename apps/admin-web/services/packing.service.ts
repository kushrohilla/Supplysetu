import { apiService } from "@/services/api.service";
import type {
  PackingOrder,
  PackingOrderStatus,
  SkuAggregate,
  UpdatePickedQuantitiesPayload
} from "@/types/packing";

const USE_MOCK_PACKING = process.env.NEXT_PUBLIC_USE_MOCK_PACKING !== "false";

const mockPackingOrders: PackingOrder[] = [
  {
    id: "ORD-100301",
    retailerName: "Gokul Traders",
    priority: "HIGH",
    status: "CONFIRMED",
    lineItems: [
      {
        id: "PK-1",
        skuCode: "SKU-RICE-5KG",
        skuName: "Rice 5kg",
        confirmedQuantity: 18,
        pickedQuantity: 8,
        shortageFlag: false,
        availableStock: 42
      },
      {
        id: "PK-2",
        skuCode: "SKU-DAL-1KG",
        skuName: "Toor Dal 1kg",
        confirmedQuantity: 24,
        pickedQuantity: 24,
        shortageFlag: false,
        availableStock: 30
      }
    ]
  },
  {
    id: "ORD-100302",
    retailerName: "Ganesh Provision",
    priority: "MEDIUM",
    status: "PARTIALLY_CONFIRMED",
    lineItems: [
      {
        id: "PK-3",
        skuCode: "SKU-RICE-5KG",
        skuName: "Rice 5kg",
        confirmedQuantity: 12,
        pickedQuantity: 4,
        shortageFlag: false,
        availableStock: 42
      },
      {
        id: "PK-4",
        skuCode: "SKU-OIL-1L",
        skuName: "Sunflower Oil 1L",
        confirmedQuantity: 20,
        pickedQuantity: 10,
        shortageFlag: false,
        availableStock: 16
      },
      {
        id: "PK-5",
        skuCode: "SKU-SALT-1KG",
        skuName: "Salt 1kg",
        confirmedQuantity: 30,
        pickedQuantity: 30,
        shortageFlag: false,
        availableStock: 90
      }
    ]
  },
  {
    id: "ORD-100303",
    retailerName: "Krishna Mart",
    priority: "LOW",
    status: "CONFIRMED",
    lineItems: [
      {
        id: "PK-6",
        skuCode: "SKU-ATTA-10KG",
        skuName: "Wheat Flour 10kg",
        confirmedQuantity: 10,
        pickedQuantity: 0,
        shortageFlag: false,
        availableStock: 13
      },
      {
        id: "PK-7",
        skuCode: "SKU-OIL-1L",
        skuName: "Sunflower Oil 1L",
        confirmedQuantity: 14,
        pickedQuantity: 3,
        shortageFlag: false,
        availableStock: 16
      }
    ]
  }
];

const cloneQueue = (orders: PackingOrder[]): PackingOrder[] =>
  orders.map((order) => ({
    ...order,
    lineItems: order.lineItems.map((line) => ({ ...line }))
  }));

const activeStatuses: PackingOrderStatus[] = ["CONFIRMED", "PARTIALLY_CONFIRMED"];

class PackingService {
  async fetchPackingQueue(): Promise<PackingOrder[]> {
    if (USE_MOCK_PACKING) {
      return cloneQueue(mockPackingOrders.filter((order) => activeStatuses.includes(order.status)));
    }

    try {
      return await apiService.request<PackingOrder[]>("/packing/queue", { method: "GET" });
    } catch {
      return cloneQueue(mockPackingOrders.filter((order) => activeStatuses.includes(order.status)));
    }
  }

  async updatePickedQuantities(
    orderId: string,
    payload: UpdatePickedQuantitiesPayload
  ): Promise<void> {
    if (USE_MOCK_PACKING) {
      this.applyPickedUpdate(orderId, payload);
      return;
    }

    try {
      await apiService.request<void>(`/packing/orders/${orderId}/picked-quantities`, {
        method: "PATCH",
        body: payload,
        parseJson: false
      });
    } catch {
      this.applyPickedUpdate(orderId, payload);
    }
  }

  async markOrderPacked(orderId: string): Promise<void> {
    if (USE_MOCK_PACKING) {
      this.updateOrderStatus(orderId, "READY_TO_DISPATCH");
      return;
    }

    try {
      await apiService.request<void>(`/packing/orders/${orderId}/mark-packed`, {
        method: "POST",
        parseJson: false
      });
    } catch {
      this.updateOrderStatus(orderId, "READY_TO_DISPATCH");
    }
  }

  async reportStockIssue(orderId: string, message: string): Promise<void> {
    if (USE_MOCK_PACKING) {
      return;
    }

    await apiService.request<void>(`/packing/orders/${orderId}/stock-issue`, {
      method: "POST",
      body: { message },
      parseJson: false
    });
  }

  aggregateSkuRequirements(orders: PackingOrder[]): SkuAggregate[] {
    const skuMap = new Map<string, SkuAggregate>();

    orders.forEach((order) => {
      order.lineItems.forEach((line) => {
        const existing = skuMap.get(line.skuCode);
        if (!existing) {
          skuMap.set(line.skuCode, {
            skuCode: line.skuCode,
            skuName: line.skuName,
            totalRequiredQuantity: line.confirmedQuantity,
            availableStock: line.availableStock,
            pickedQuantity: line.pickedQuantity,
            remainingQuantity: Math.max(0, line.confirmedQuantity - line.pickedQuantity)
          });
          return;
        }

        existing.totalRequiredQuantity += line.confirmedQuantity;
        existing.pickedQuantity += line.pickedQuantity;
        existing.remainingQuantity = Math.max(0, existing.totalRequiredQuantity - existing.pickedQuantity);
      });
    });

    return [...skuMap.values()].sort((left, right) => left.skuName.localeCompare(right.skuName));
  }

  private applyPickedUpdate(orderId: string, payload: UpdatePickedQuantitiesPayload): void {
    const order = mockPackingOrders.find((item) => item.id === orderId);
    if (!order) {
      return;
    }

    payload.lineItems.forEach((linePayload) => {
      const line = order.lineItems.find((item) => item.id === linePayload.lineItemId);
      if (!line) {
        return;
      }
      line.pickedQuantity = Math.max(0, Math.min(linePayload.pickedQuantity, line.confirmedQuantity));
      line.shortageFlag = linePayload.shortageFlag;
    });
  }

  private updateOrderStatus(orderId: string, status: PackingOrderStatus): void {
    const order = mockPackingOrders.find((item) => item.id === orderId);
    if (!order) {
      return;
    }
    order.status = status;
  }
}

export const packingService = new PackingService();
