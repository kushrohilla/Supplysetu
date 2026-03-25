import { apiService } from "@/services/api.service";
import { env } from "@/services/env";
import type { ConfirmPartialPayload, ReviewQueueOrder } from "@/types/order-review";

const USE_MOCK_ORDER_REVIEW = process.env.NEXT_PUBLIC_USE_MOCK_ORDER_REVIEW !== "false";

const buildMockOrders = (): ReviewQueueOrder[] => {
  const now = Date.now();
  return [
    {
      id: "ORD-100245",
      retailerName: "Shree Balaji Stores",
      areaRoute: "Route 3 - Naranpura",
      totalLineItems: 4,
      totalOrderValue: 12840,
      paymentMode: "COD",
      placedAt: new Date(now - 1000 * 60 * 215).toISOString(),
      stockRisk: "HIGH",
      status: "PLACED",
      lineItems: [
        {
          id: "LI-1",
          skuName: "Sunflower Oil 1L",
          orderedQuantity: 36,
          availableStock: 22,
          confirmQuantity: 22,
          substituteSkuId: null,
          schemeLabel: "Scheme TBD",
          substituteOptions: [
            { id: "SKU-SUN-900", label: "Sunflower Oil 900ml" },
            { id: "SKU-SOY-1L", label: "Soyabean Oil 1L" }
          ]
        },
        {
          id: "LI-2",
          skuName: "Toor Dal 1kg",
          orderedQuantity: 20,
          availableStock: 48,
          confirmQuantity: 20,
          substituteSkuId: null,
          schemeLabel: "No Scheme",
          substituteOptions: []
        },
        {
          id: "LI-3",
          skuName: "Sugar 5kg",
          orderedQuantity: 8,
          availableStock: 8,
          confirmQuantity: 8,
          substituteSkuId: null,
          schemeLabel: "Scheme TBD",
          substituteOptions: []
        },
        {
          id: "LI-4",
          skuName: "Tea 250g",
          orderedQuantity: 30,
          availableStock: 19,
          confirmQuantity: 19,
          substituteSkuId: null,
          schemeLabel: "No Scheme",
          substituteOptions: [{ id: "SKU-TEA-200", label: "Tea 200g" }]
        }
      ]
    },
    {
      id: "ORD-100247",
      retailerName: "Patel Provision Mart",
      areaRoute: "Route 1 - Memnagar",
      totalLineItems: 3,
      totalOrderValue: 6540,
      paymentMode: "ADVANCE",
      placedAt: new Date(now - 1000 * 60 * 190).toISOString(),
      stockRisk: "LOW",
      status: "PLACED",
      lineItems: [
        {
          id: "LI-5",
          skuName: "Wheat Flour 10kg",
          orderedQuantity: 12,
          availableStock: 19,
          confirmQuantity: 12,
          substituteSkuId: null,
          schemeLabel: "No Scheme",
          substituteOptions: []
        },
        {
          id: "LI-6",
          skuName: "Rice 5kg",
          orderedQuantity: 18,
          availableStock: 22,
          confirmQuantity: 18,
          substituteSkuId: null,
          schemeLabel: "Scheme TBD",
          substituteOptions: []
        },
        {
          id: "LI-7",
          skuName: "Chana Dal 1kg",
          orderedQuantity: 25,
          availableStock: 40,
          confirmQuantity: 25,
          substituteSkuId: null,
          schemeLabel: "No Scheme",
          substituteOptions: []
        }
      ]
    },
    {
      id: "ORD-100249",
      retailerName: "Ravi Departmental",
      areaRoute: "Route 4 - Ranip",
      totalLineItems: 5,
      totalOrderValue: 15320,
      paymentMode: "COD",
      placedAt: new Date(now - 1000 * 60 * 95).toISOString(),
      stockRisk: "MEDIUM",
      status: "PLACED",
      lineItems: [
        {
          id: "LI-8",
          skuName: "Mustard Oil 1L",
          orderedQuantity: 24,
          availableStock: 24,
          confirmQuantity: 24,
          substituteSkuId: null,
          schemeLabel: "No Scheme",
          substituteOptions: []
        },
        {
          id: "LI-9",
          skuName: "Turmeric Powder 100g",
          orderedQuantity: 60,
          availableStock: 38,
          confirmQuantity: 38,
          substituteSkuId: null,
          schemeLabel: "Scheme TBD",
          substituteOptions: [{ id: "SKU-TUR-80", label: "Turmeric Powder 80g" }]
        },
        {
          id: "LI-10",
          skuName: "Red Chilli Powder 200g",
          orderedQuantity: 48,
          availableStock: 50,
          confirmQuantity: 48,
          substituteSkuId: null,
          schemeLabel: "No Scheme",
          substituteOptions: []
        },
        {
          id: "LI-11",
          skuName: "Salt 1kg",
          orderedQuantity: 36,
          availableStock: 64,
          confirmQuantity: 36,
          substituteSkuId: null,
          schemeLabel: "No Scheme",
          substituteOptions: []
        },
        {
          id: "LI-12",
          skuName: "Poha 500g",
          orderedQuantity: 16,
          availableStock: 10,
          confirmQuantity: 10,
          substituteSkuId: null,
          schemeLabel: "Scheme TBD",
          substituteOptions: [{ id: "SKU-POHA-1KG", label: "Poha 1kg" }]
        }
      ]
    }
  ];
};

const mockQueue: ReviewQueueOrder[] = buildMockOrders();

const cloneMockOrders = (): ReviewQueueOrder[] =>
  mockQueue
    .filter((order) => order.status === "PLACED")
    .map((order) => ({ ...order, lineItems: order.lineItems.map((line) => ({ ...line })) }));

class OrderReviewService {
  async getPlacedOrders(): Promise<ReviewQueueOrder[]> {
    if (USE_MOCK_ORDER_REVIEW) {
      return cloneMockOrders();
    }

    try {
      const response = await apiService.request<ReviewQueueOrder[]>("/orders/review-queue", {
        method: "GET"
      });
      return response.filter((order) => order.status === "PLACED");
    } catch {
      return cloneMockOrders();
    }
  }

  async confirmFullOrder(orderId: string): Promise<void> {
    if (USE_MOCK_ORDER_REVIEW) {
      this.updateMockStatus(orderId, "READY_FOR_PACKING");
      return;
    }

    try {
      await apiService.request<void>(`/orders/${orderId}/confirm-full`, {
        method: "POST",
        parseJson: false
      });
    } catch {
      this.updateMockStatus(orderId, "READY_FOR_PACKING");
    }
  }

  async confirmPartialOrder(orderId: string, payload: ConfirmPartialPayload): Promise<void> {
    if (USE_MOCK_ORDER_REVIEW) {
      this.updateMockPartial(orderId, payload);
      return;
    }

    try {
      await apiService.request<void>(`/orders/${orderId}/confirm-partial`, {
        method: "POST",
        body: payload,
        parseJson: false
      });
    } catch {
      this.updateMockPartial(orderId, payload);
    }
  }

  async cancelOrder(orderId: string, reason: string): Promise<void> {
    if (USE_MOCK_ORDER_REVIEW) {
      this.updateMockStatus(orderId, "CANCELLED");
      return;
    }

    try {
      await apiService.request<void>(`/orders/${orderId}/cancel`, {
        method: "POST",
        body: { reason },
        parseJson: false
      });
    } catch {
      this.updateMockStatus(orderId, "CANCELLED");
    }
  }

  getBackendBaseUrl(): string {
    return env.apiBaseUrl;
  }

  private updateMockStatus(
    orderId: string,
    status: "READY_FOR_PACKING" | "CANCELLED" | "PARTIALLY_CONFIRMED"
  ): void {
    const order = mockQueue.find((item) => item.id === orderId);
    if (!order) {
      return;
    }
    order.status = status;
  }

  private updateMockPartial(orderId: string, payload: ConfirmPartialPayload): void {
    const order = mockQueue.find((item) => item.id === orderId);
    if (!order) {
      return;
    }

    payload.lineItems.forEach((linePayload) => {
      const line = order.lineItems.find((lineItem) => lineItem.id === linePayload.lineItemId);
      if (!line) {
        return;
      }
      line.confirmQuantity = linePayload.confirmQuantity;
      line.substituteSkuId = linePayload.substituteSkuId ?? null;
    });

    order.status = "PARTIALLY_CONFIRMED";
  }
}

export const orderReviewService = new OrderReviewService();
