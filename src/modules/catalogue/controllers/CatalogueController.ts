import { Request, Response } from "express";
import { Knex } from "knex";
import { CatalogueRepository } from "../repositories/CatalogueRepository";

export class CatalogueController {
  private catalogueRepo: CatalogueRepository;

  constructor(private db: Knex) {
    this.catalogueRepo = new CatalogueRepository(db);
  }

  /**
   * GET /catalogue/brands?tenant_id=X
   * Get all brands for tenant
   */
  async getBrands(req: Request, res: Response): Promise<void> {
    try {
      const { tenant_id } = req.query;

      if (!tenant_id) {
        res.status(400).json({ error: "tenant_id required" });
        return;
      }

      // Add cache header for 1 hour (brands change infrequently)
      res.set("Cache-Control", "public, max-age=3600");

      const brands = await this.catalogueRepo.getBrands(Number(tenant_id));
      res.json(brands);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brands" });
    }
  }

  /**
   * GET /catalogue/brands/:brandId/products?tenant_id=X&page=1
   * Get products for a brand (paginated)
   */
  async getProductsByBrand(req: Request, res: Response): Promise<void> {
    try {
      const { brandId } = req.params;
      const { tenant_id, page = "1", page_size = "30" } = req.query;

      if (!tenant_id || !brandId) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      // Add cache header for 30 minutes
      res.set("Cache-Control", "public, max-age=1800");

      const result = await this.catalogueRepo.getProductsByBrand(
        Number(tenant_id),
        Number(brandId),
        Number(page),
        Math.min(Number(page_size), 30) // Cap at 30 items
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch products" });
    }
  }

  /**
   * GET /catalogue/search?tenant_id=X&q=detergent
   * Search products
   */
  async searchProducts(req: Request, res: Response): Promise<void> {
    try {
      const { tenant_id, q } = req.query;

      if (!tenant_id || !q) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      // Debounce check: don't allow searches shorter than 2 characters
      if ((q as string).length < 2) {
        res.json([]);
        return;
      }

      const products = await this.catalogueRepo.searchProducts(
        Number(tenant_id),
        q as string,
        30
      );

      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  }

  /**
   * GET /catalogue/products/:productId?tenant_id=X
   * Get product details with schemes and stock
   */
  async getProduct(req: Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { tenant_id } = req.query;

      if (!tenant_id || !productId) {
        res.status(400).json({ error: "Missing parameters" });
        return;
      }

      const product = await this.catalogueRepo.getProductDetail(
        Number(tenant_id),
        Number(productId)
      );

      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      // Cache for 15 minutes
      res.set("Cache-Control", "public, max-age=900");

      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch product" });
    }
  }

  /**
   * POST /catalogue/stock/batch
   * Get stock levels for multiple products
   */
  async getStockBatch(req: Request, res: Response): Promise<void> {
    try {
      const { tenant_id, product_ids } = req.body;

      if (!tenant_id || !Array.isArray(product_ids)) {
        res.status(400).json({ error: "Invalid request" });
        return;
      }

      const stocks = await this.catalogueRepo.getStockBatch(Number(tenant_id), product_ids);
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stock" });
    }
  }
}
