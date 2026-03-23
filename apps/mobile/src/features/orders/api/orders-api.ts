import { catalogueApi } from "@/features/ordering/api/catalogue-api";

import { RetailerOrder } from "../orders.types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildSeedOrders = async (): Promise<RetailerOrder[]> => {
  const firstPage = await catalogueApi.getProducts({ page: 1 });
  const products = firstPage.items;

  return [
    {
      id: "ord-20260312-001",
      orderDate: "2026-03-12",
      status: "dispatched",
      paymentMode: "cod",
      totalAmount: 1824,
      expectedDeliveryDate: "2026-03-16",
      items: [
        { product: products[0], quantity: 4 },
        { product: products[1], quantity: 6 },
        { product: products[2], quantity: 3 }
      ],
      timeline: [
        { key: "invoiced", label: "Invoiced", timestamp: "2026-03-13 08:20", completed: true },
        { key: "dispatched", label: "Dispatched", timestamp: "2026-03-13 18:10", completed: true },
        { key: "delivered", label: "Delivered", timestamp: "Expected 2026-03-16", completed: false }
      ]
    },
    {
      id: "ord-20260308-002",
      orderDate: "2026-03-08",
      status: "delivered",
      paymentMode: "advance",
      totalAmount: 2360,
      expectedDeliveryDate: "2026-03-11",
      items: [
        { product: products[3], quantity: 5 },
        { product: products[4], quantity: 7 }
      ],
      timeline: [
        { key: "invoiced", label: "Invoiced", timestamp: "2026-03-08 09:00", completed: true },
        { key: "dispatched", label: "Dispatched", timestamp: "2026-03-09 16:30", completed: true },
        { key: "delivered", label: "Delivered", timestamp: "2026-03-11 11:05", completed: true }
      ]
    },
    {
      id: "ord-20260303-003",
      orderDate: "2026-03-03",
      status: "invoiced",
      paymentMode: "cod",
      totalAmount: 1542,
      expectedDeliveryDate: "2026-03-17",
      items: [
        { product: products[5], quantity: 4 },
        { product: products[6], quantity: 4 }
      ],
      timeline: [
        { key: "invoiced", label: "Invoiced", timestamp: "2026-03-03 10:20", completed: true },
        { key: "dispatched", label: "Dispatched", timestamp: "Awaiting route dispatch", completed: false },
        { key: "delivered", label: "Delivered", timestamp: "Expected after dispatch", completed: false }
      ]
    }
  ];
};

let cachedOrders: RetailerOrder[] | null = null;

export const ordersApi = {
  async listOrders(): Promise<RetailerOrder[]> {
    await delay(300);

    if (!cachedOrders) {
      cachedOrders = await buildSeedOrders();
    }

    return cachedOrders;
  },

  async getOrder(orderId: string): Promise<RetailerOrder | null> {
    const orders = await ordersApi.listOrders();
    return orders.find((order) => order.id === orderId) ?? null;
  }
};
