import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    tenantId?: string;
    userId?: string;
    retailer?: {
      id: string | number;
      phone?: string;
      tenantIds?: Array<string | number>;
    };
  }
}
