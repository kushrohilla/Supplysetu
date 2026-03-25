import { Router } from "express";

/**
 * INACTIVE_ROUTE NOTICE
 * 
 * Admin Product Management Routes - ALL MOCK DATA (not database-backed)
 * These routes use in-memory data structures and are NOT connected to the database.
 * They are mock/placeholder implementations for testing/demonstration only.
 * 
 * Status: All 8 routes use mock data
 * TODO_IMPLEMENTATION_REQUIRED: Connect to real product repositories
 * Blocked on: Database product table schema finalization
 */

type ProductRecord = {
  id: string;
  sku_code: string;
  product_name: string;
  brand_name: string;
  pack_size: string;
  base_price: number;
  advance_price: number;
  scheme_text: string;
  scheme_start_date: string | null;
  scheme_end_date: string | null;
  stock_qty: number;
  status: "active" | "inactive";
  global_product_id: string | null;
};

const catalogueByBrand: Record<string, Array<Record<string, unknown>>> = {
  br_amul: [
    {
      global_product_id: "gp_101",
      standard_name: "Amul Gold Milk",
      pack_size: "500 ml",
      description: "Toned milk pack",
      image_url: "https://cdn.supplysetu.local/amul-gold.jpg",
      classification: { category: "Dairy", segment: "Milk" },
      mrp: 33,
      suggested_price_band: { min: 30, max: 31 }
    },
    {
      global_product_id: "gp_102",
      standard_name: "Amul Buttermilk",
      pack_size: "200 ml",
      description: "Chilled buttermilk",
      image_url: "https://cdn.supplysetu.local/amul-buttermilk.jpg",
      classification: { category: "Dairy", segment: "Buttermilk" },
      mrp: 15,
      suggested_price_band: { min: 13.5, max: 14.2 }
    }
  ],
  br_britannia: [
    {
      global_product_id: "gp_201",
      standard_name: "Britannia Marie Gold",
      pack_size: "120 g",
      description: "Tea biscuit pack",
      image_url: "https://cdn.supplysetu.local/brit-marie.jpg",
      classification: { category: "Biscuits", segment: "Tea-time" },
      mrp: 12,
      suggested_price_band: { min: 10.2, max: 10.8 }
    }
  ],
  br_local: [
    {
      global_product_id: "gp_301",
      standard_name: "Fresh Chakki Atta",
      pack_size: "5 kg",
      description: "Whole wheat flour",
      image_url: "https://cdn.supplysetu.local/atta.jpg",
      classification: { category: "Staples", segment: "Atta" },
      mrp: 245,
      suggested_price_band: { min: 221, max: 228 }
    }
  ]
};

const catalogueBrands = [
  { id: "br_amul", name: "Amul" },
  { id: "br_britannia", name: "Britannia" },
  { id: "br_local", name: "Local company" }
];

let products: ProductRecord[] = [
  {
    id: "tp_001",
    sku_code: "AMUL-GLD-500",
    product_name: "Amul Gold Milk",
    brand_name: "Amul",
    pack_size: "500 ml",
    base_price: 31,
    advance_price: 30,
    scheme_text: "2% March Booster",
    scheme_start_date: "2026-03-20",
    scheme_end_date: "2026-03-31",
    stock_qty: 188,
    status: "active",
    global_product_id: "gp_101"
  },
  {
    id: "tp_002",
    sku_code: "BRIT-MARIE-120",
    product_name: "Britannia Marie Gold",
    brand_name: "Britannia",
    pack_size: "120 g",
    base_price: 10.5,
    advance_price: 10.2,
    scheme_text: "Case Mix Scheme",
    scheme_start_date: "2026-03-18",
    scheme_end_date: "2026-03-29",
    stock_qty: 74,
    status: "active",
    global_product_id: "gp_201"
  }
];

const asNumber = (value: unknown): number => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    return Number(value);
  }

  return Number.NaN;
};

const invalidPayload = (message: string) => ({
  success: false as const,
  error_code: "VALIDATION_ERROR",
  message
});

const paginate = <T>(items: T[], page: number, pageSize: number) => {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page: safePage,
      page_size: pageSize,
      total_items: totalItems,
      total_pages: totalPages,
      has_next: safePage < totalPages
    }
  };
};

export const adminProductManagementRouter = Router();

// INACTIVE_ROUTE: GET /admin/products - Mock data (in-memory array)
// TODO_IMPLEMENTATION_REQUIRED: Connect to database products table
adminProductManagementRouter.get("/admin/products", (req, res) => {
  const search = String(req.query.search ?? "").trim().toLowerCase();
  const status = String(req.query.status ?? "").trim().toLowerCase();
  const brandName = String(req.query.brand_name ?? "").trim().toLowerCase();
  const page = Math.max(1, Number(req.query.page ?? 1));
  const pageSize = Math.max(1, Math.min(100, Number(req.query.page_size ?? 20)));

  const filtered = products.filter((product) => {
    const matchesSearch =
      !search ||
      product.product_name.toLowerCase().includes(search) ||
      product.sku_code.toLowerCase().includes(search) ||
      product.brand_name.toLowerCase().includes(search);
    const matchesStatus = !status || status === "all" || product.status === status;
    const matchesBrand = !brandName || brandName === "all" || product.brand_name.toLowerCase() === brandName;
    return matchesSearch && matchesStatus && matchesBrand;
  });

  const { items, pagination } = paginate(filtered, page, pageSize);
  const data = items.map((item) => ({
    id: item.id,
    sku_code: item.sku_code,
    product_name: item.product_name,
    brand_name: item.brand_name,
    pack_size: item.pack_size,
    base_price: item.base_price,
    advance_price: item.advance_price,
    active_scheme: item.scheme_text
      ? {
          text: item.scheme_text,
          start_date: item.scheme_start_date,
          end_date: item.scheme_end_date
        }
      : null,
    stock_snapshot: {
      qty: item.stock_qty,
      captured_at: new Date().toISOString()
    },
    status: item.status,
    global_product_id: item.global_product_id
  }));

  res.status(200).json({
    success: true,
    data: {
      items: data,
      pagination
    }
  });
});

// INACTIVE_ROUTE: POST /admin/products - Mock data (in-memory array)
// TODO_IMPLEMENTATION_REQUIRED: Connect to database products table
adminProductManagementRouter.post("/admin/products", (req, res) => {
  const brandName = String(req.body.brand_name ?? "").trim();
  const productName = String(req.body.product_name ?? "").trim();
  const packSize = String(req.body.pack_size ?? "").trim();
  const skuCode = String(req.body.sku_code ?? "").trim();
  const basePrice = asNumber(req.body.base_price);
  const advancePriceRaw = req.body.advance_price;
  const advancePrice = advancePriceRaw == null ? basePrice : asNumber(advancePriceRaw);

  if (!brandName || !productName || !packSize || !skuCode) {
    res.status(400).json(invalidPayload("brand_name, product_name, pack_size and sku_code are required"));
    return;
  }

  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    res.status(400).json(invalidPayload("base_price must be a positive number"));
    return;
  }

  if (!Number.isFinite(advancePrice) || advancePrice <= 0 || advancePrice > basePrice) {
    res.status(400).json(invalidPayload("advance_price must be <= base_price and > 0"));
    return;
  }

  if (products.some((product) => product.sku_code.toLowerCase() === skuCode.toLowerCase())) {
    res.status(409).json({
      success: false,
      error_code: "DUPLICATE_SKU",
      message: `sku_code '${skuCode}' already exists`
    });
    return;
  }

  const nextProduct: ProductRecord = {
    id: `tp_${Date.now()}`,
    sku_code: skuCode,
    product_name: productName,
    brand_name: brandName,
    pack_size: packSize,
    base_price: basePrice,
    advance_price: advancePrice,
    scheme_text: String(req.body.scheme_text ?? ""),
    scheme_start_date: req.body.scheme_start_date ? String(req.body.scheme_start_date) : null,
    scheme_end_date: req.body.scheme_end_date ? String(req.body.scheme_end_date) : null,
    stock_qty: asNumber(req.body.opening_stock_snapshot) || 0,
    status: "active",
    global_product_id: req.body.global_product_id ? String(req.body.global_product_id) : null
  };

  products = [nextProduct, ...products];

  res.status(201).json({
    success: true,
    data: nextProduct
  });
});

// INACTIVE_ROUTE: PATCH /admin/products/:id/pricing - Mock data (in-memory array)
// TODO_IMPLEMENTATION_REQUIRED: Connect to database products table
adminProductManagementRouter.patch("/admin/products/:id/pricing", (req, res) => {
  const id = String(req.params.id);
  const product = products.find((item) => item.id === id);

  if (!product) {
    res.status(404).json({ success: false, error_code: "PRODUCT_NOT_FOUND", message: "product not found" });
    return;
  }

  const advancePrice = asNumber(req.body.advance_price);
  if (!Number.isFinite(advancePrice) || advancePrice <= 0 || advancePrice > product.base_price) {
    res.status(400).json(invalidPayload("advance_price must be <= base_price and > 0"));
    return;
  }

  const startDate = req.body.scheme_start_date ? String(req.body.scheme_start_date) : null;
  const endDate = req.body.scheme_end_date ? String(req.body.scheme_end_date) : null;
  if (startDate && endDate && startDate > endDate) {
    res.status(400).json(invalidPayload("scheme_start_date must be before scheme_end_date"));
    return;
  }

  product.advance_price = advancePrice;
  product.scheme_text = String(req.body.scheme_text ?? "");
  product.scheme_start_date = startDate;
  product.scheme_end_date = endDate;

  res.status(200).json({
    success: true,
    data: product
  });
});

// INACTIVE_ROUTE: PATCH /admin/products/:id/status - Mock data (in-memory array)
// TODO_IMPLEMENTATION_REQUIRED: Connect to database products table
adminProductManagementRouter.patch("/admin/products/:id/status", (req, res) => {
  const id = String(req.params.id);
  const product = products.find((item) => item.id === id);

  if (!product) {
    res.status(404).json({ success: false, error_code: "PRODUCT_NOT_FOUND", message: "product not found" });
    return;
  }

  const status = String(req.body.status ?? "").toLowerCase();
  if (status !== "active" && status !== "inactive") {
    res.status(400).json(invalidPayload("status must be active or inactive"));
    return;
  }

  product.status = status;
  res.status(200).json({
    success: true,
    data: product
  });
});

// INACTIVE_ROUTE: GET /admin/catalogue/brands - Mock data (hardcoded array)
// TODO_IMPLEMENTATION_REQUIRED: Connect to database brands table
adminProductManagementRouter.get("/admin/catalogue/brands", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      items: catalogueBrands
    }
  });
});

// INACTIVE_ROUTE: GET /admin/catalogue/brands/:brandId/products - Mock data (hardcoded object)
// TODO_IMPLEMENTATION_REQUIRED: Connect to database products table
adminProductManagementRouter.get("/admin/catalogue/brands/:brandId/products", (req, res) => {
  const brandId = String(req.params.brandId);
  const items = catalogueByBrand[brandId] ?? [];
  res.status(200).json({
    success: true,
    data: {
      items
    }
  });
});

// INACTIVE_ROUTE: POST /admin/products/from-catalogue - Mock data (in-memory array manipulation)
// TODO_IMPLEMENTATION_REQUIRED: Connect to database products table
adminProductManagementRouter.post("/admin/products/from-catalogue", (req, res) => {
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  const created: ProductRecord[] = [];

  items.forEach((item: Record<string, unknown>) => {
    const globalProductId = String(item.global_product_id ?? "");
    const matchingGlobal = Object.values(catalogueByBrand)
      .flat()
      .find((entry) => String(entry.global_product_id) === globalProductId);

    if (!matchingGlobal) {
      return;
    }

    const basePrice = asNumber(item.base_price);
    const advancePrice = asNumber(item.advance_price);
    if (!Number.isFinite(basePrice) || !Number.isFinite(advancePrice) || advancePrice > basePrice) {
      return;
    }

    const nextProduct: ProductRecord = {
      id: `tp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sku_code: String(item.sku_code ?? `SKU_${Date.now()}`),
      product_name: String(matchingGlobal.standard_name ?? "Unnamed Product"),
      brand_name: catalogueBrands.find((brand) => (catalogueByBrand[brand.id] ?? []).some((entry) => entry.global_product_id === globalProductId))
        ?.name ?? "Unknown",
      pack_size: String(matchingGlobal.pack_size ?? ""),
      base_price: basePrice,
      advance_price: advancePrice,
      scheme_text: String(item.scheme_text ?? ""),
      scheme_start_date: null,
      scheme_end_date: null,
      stock_qty: 0,
      status: "active",
      global_product_id: globalProductId
    };

    products = [nextProduct, ...products];
    created.push(nextProduct);
  });

  res.status(201).json({
    success: true,
    data: {
      created_count: created.length,
      items: created
    }
  });
});

// INACTIVE_ROUTE: POST /admin/products/import/validate - Validation only, no database persistence
// TODO_IMPLEMENTATION_REQUIRED: Connect to database products table for persistence
adminProductManagementRouter.post("/admin/products/import/validate", (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
  const seen = new Set<string>();
  const errors: Array<{ row_no: number; error_codes: string[]; message: string }> = [];

  rows.forEach((row: Record<string, unknown>, index: number) => {
    const rowNo = Number(row.row_no ?? index + 1);
    const brandName = String(row.brand_name ?? "").trim();
    const productName = String(row.product_name ?? "").trim();
    const packSize = String(row.pack_size ?? "").trim();
    const basePriceRaw = row.base_price;
    const advancePriceRaw = row.advance_price;
    const errorCodes: string[] = [];

    const duplicateKey = `${brandName.toLowerCase()}|${productName.toLowerCase()}|${packSize.toLowerCase()}`;
    if (seen.has(duplicateKey)) {
      errorCodes.push("DUPLICATE_PRODUCT_NAME_PACK_BRAND");
    }
    seen.add(duplicateKey);

    if (!brandName) errorCodes.push("MISSING_BRAND");
    if (!productName) errorCodes.push("MISSING_PRODUCT_NAME");
    if (!packSize) errorCodes.push("MISSING_PACK_SIZE");
    if (basePriceRaw == null || String(basePriceRaw).trim() === "") errorCodes.push("MISSING_BASE_PRICE");

    const basePrice = asNumber(basePriceRaw);
    if (basePriceRaw != null && String(basePriceRaw).trim() !== "" && !Number.isFinite(basePrice)) {
      errorCodes.push("INVALID_PRICE_FORMAT");
    }

    const advancePrice = asNumber(advancePriceRaw);
    if (advancePriceRaw != null && String(advancePriceRaw).trim() !== "" && !Number.isFinite(advancePrice)) {
      errorCodes.push("INVALID_ADVANCE_PRICE");
    }

    if (Number.isFinite(basePrice) && Number.isFinite(advancePrice) && advancePrice > basePrice) {
      errorCodes.push("INVALID_ADVANCE_PRICE");
    }

    if (errorCodes.length > 0) {
      errors.push({
        row_no: rowNo,
        error_codes: errorCodes,
        message: "Validation failed for row"
      });
    }
  });

  res.status(200).json({
    success: true,
    data: {
      summary: {
        total_rows: rows.length,
        valid_rows: rows.length - errors.length,
        invalid_rows: errors.length
      },
      errors
    }
  });
});
