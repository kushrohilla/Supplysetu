export type SalesmanVisitItem = {
  id: string;
  retailerName: string;
  locality: string;
  state: "yet-to-visit" | "order-placed" | "inactive";
  note: string;
};

export type SalesmanHomeData = {
  assignedRouteName: string;
  totalRetailersInRoute: number;
  retailersYetToVisitCount: number;
  ordersPlacedTodayCount: number;
  inactiveRetailersCount: number;
  activeScheme: {
    title: string;
    description: string;
  } | null;
  visitPreview: SalesmanVisitItem[];
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const homeApi = {
  async getRetailerHome(): Promise<SalesmanHomeData> {
    await delay(650);

    return {
      assignedRouteName: "Route 3 • Old City",
      totalRetailersInRoute: 28,
      retailersYetToVisitCount: 11,
      ordersPlacedTodayCount: 9,
      inactiveRetailersCount: 3,
      activeScheme: {
        title: "Monsoon push on soaps and detergents",
        description: "Pitch mixed-case bundles on the next 6 visits to unlock extra margin for eligible retailers."
      },
      visitPreview: [
        {
          id: "ret-1042",
          retailerName: "Shiv Traders",
          locality: "Shastri Chowk",
          state: "yet-to-visit",
          note: "Priority outlet • high basket potential"
        },
        {
          id: "ret-1081",
          retailerName: "Ganesh Mart",
          locality: "Railway Colony",
          state: "order-placed",
          note: "Assisted order placed • Rs 12,860"
        },
        {
          id: "ret-0954",
          retailerName: "Maa Shakti Stores",
          locality: "Bus Stand",
          state: "yet-to-visit",
          note: "Ask for scheme basket"
        },
        {
          id: "ret-0833",
          retailerName: "R K Stores",
          locality: "Market Yard",
          state: "inactive",
          note: "No order in 8 days"
        },
        {
          id: "ret-1104",
          retailerName: "Sai Provision",
          locality: "Nehru Nagar",
          state: "yet-to-visit",
          note: "Fast refill outlet"
        },
        {
          id: "ret-1172",
          retailerName: "City Wholesale",
          locality: "Old Mandi",
          state: "order-placed",
          note: "Bulk order locked • Rs 21,760"
        }
      ]
    };
  }
};
