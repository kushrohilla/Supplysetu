import { Router, Request, Response } from "express";
import { Knex } from "knex";
import { AuthController } from "../modules/auth/controllers/AuthController";
import { OrderController } from "../modules/orders/controllers/OrderController";
import { CatalogueController } from "../modules/catalogue/controllers/CatalogueController";
import AuthService from "../modules/auth/services/AuthService";

// TODO_IMPLEMENTATION_REQUIRED: Auth middleware token verification
// Blocked on: Complete JWT validation implementation
// Status: INCOMPLETE - only checks for Bearer token presence
const authMiddleware = (_db: Knex) => {
  return async (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const token = authHeader.substring(7);
    const decoded = AuthService.verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid authorization token" });
    }

    (req as Request & { retailer?: { id: number; phone: string; tenantIds: number[] } }).retailer = {
      id: decoded.retailer_id,
      phone: decoded.phone,
      tenantIds: decoded.tenant_ids
    };

    next();
  };
};

export function createRetailerRoutes(db: Knex): Router {
  const router = Router();
  const authController = new AuthController(db);
  const orderController = new OrderController(db);
  const catalogueController = new CatalogueController(db);

  // ========== AUTH ENDPOINTS ==========
  // POST /retailer-api/auth/login - Send OTP
  router.post("/auth/login", (req, res) => authController.loginWithOTP(req, res));

  // POST /retailer-api/auth/verify - Verify OTP and get tokens
  router.post("/auth/verify", (req, res) => authController.verifyOTP(req, res));

  // POST /retailer-api/auth/refresh - Refresh access token
  router.post("/auth/refresh", (req, res) => authController.refreshToken(req, res));

  // GET /retailer-api/auth/distributors - Get connected distributors
  router.get("/auth/distributors", authMiddleware(db), (req, res) =>
    authController.getDistributors(req, res)
  );

  // POST /retailer-api/auth/profile - Update retailer profile
  router.post("/auth/profile", authMiddleware(db), (req, res) =>
    authController.updateProfile(req, res)
  );

  // ========== CATALOGUE ENDPOINTS ==========
  // GET /retailer-api/catalogue/brands - Get brands for tenant
  router.get("/catalogue/brands", (req, res) => catalogueController.getBrands(req, res));

  // GET /retailer-api/catalogue/brands/:brandId/products - Get products for brand
  router.get("/catalogue/brands/:brandId/products", (req, res) =>
    catalogueController.getProductsByBrand(req, res)
  );

  // GET /retailer-api/catalogue/search - Search products
  router.get("/catalogue/search", (req, res) => catalogueController.searchProducts(req, res));

  // GET /retailer-api/catalogue/products/:productId - Get product details
  router.get("/catalogue/products/:productId", (req, res) =>
    catalogueController.getProduct(req, res)
  );

  // POST /retailer-api/catalogue/stock/batch - Get stock for multiple products
  router.post("/catalogue/stock/batch", (req, res) =>
    catalogueController.getStockBatch(req, res)
  );

  // ========== ORDER ENDPOINTS ==========
  // POST /retailer-api/orders/quick-reorder - Get quick reorder data
  router.post("/orders/quick-reorder", authMiddleware(db), (req, res) =>
    orderController.getQuickReorderData(req, res)
  );

  // POST /retailer-api/orders/create - Create new order
  router.post("/orders/create", authMiddleware(db), (req, res) =>
    orderController.createOrder(req, res)
  );

  // GET /retailer-api/orders/list - Get order history
  router.get("/orders/list", authMiddleware(db), (req, res) =>
    orderController.getOrderHistory(req, res)
  );

  // GET /retailer-api/orders/:orderId - Get order details
  router.get("/orders/:orderId", authMiddleware(db), (req, res) =>
    orderController.getOrder(req, res)
  );

  // GET /retailer-api/orders/:orderId/status - Get order status
  router.get("/orders/:orderId/status", authMiddleware(db), (req, res) =>
    orderController.getOrderStatus(req, res)
  );

  return router;
}
