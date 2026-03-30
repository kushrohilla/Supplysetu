import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import type {
  AdminRetailerDetail,
  AdminRetailerListFilters,
  AdminRetailerListResult,
  RetailerCreateInput,
  RetailerRepository,
  RetailerUpdateInput,
} from "./retailer.repository";

const isUniqueViolation = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === "23505";

export class RetailerService {
  constructor(private readonly retailerRepository: RetailerRepository) {}

  async createRetailer(tenantId: string, input: RetailerCreateInput) {
    const existing = await this.retailerRepository.findByMobileNumber(tenantId, input.mobile_number);
    if (existing) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        "RETAILER_MOBILE_NUMBER_EXISTS",
        "A retailer already exists with this mobile number",
      );
    }

    try {
      return await this.retailerRepository.create(tenantId, input);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          HTTP_STATUS.CONFLICT,
          "RETAILER_MOBILE_NUMBER_EXISTS",
          "A retailer already exists with this mobile number",
        );
      }

      throw error;
    }
  }

  async listRetailers(tenantId: string) {
    return this.retailerRepository.listByTenant(tenantId);
  }

  async listAdminRetailers(tenantId: string, filters: AdminRetailerListFilters): Promise<AdminRetailerListResult> {
    return this.retailerRepository.listAdminRetailers(tenantId, filters);
  }

  async getAdminRetailerDetail(tenantId: string, retailerId: string): Promise<AdminRetailerDetail> {
    const retailer = await this.retailerRepository.findAdminRetailerDetailById(tenantId, retailerId);
    if (!retailer) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
    }

    return retailer;
  }

  async getRetailer(tenantId: string, retailerId: string) {
    const retailer = await this.retailerRepository.findById(tenantId, retailerId);
    if (!retailer) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
    }

    return retailer;
  }

  async updateRetailer(tenantId: string, retailerId: string, input: RetailerUpdateInput) {
    if (input.mobile_number) {
      const existing = await this.retailerRepository.findByMobileNumber(tenantId, input.mobile_number, retailerId);
      if (existing) {
        throw new AppError(
          HTTP_STATUS.CONFLICT,
          "RETAILER_MOBILE_NUMBER_EXISTS",
          "A retailer already exists with this mobile number",
        );
      }
    }

    try {
      const retailer = await this.retailerRepository.update(tenantId, retailerId, input);
      if (!retailer) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
      }

      return retailer;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(
          HTTP_STATUS.CONFLICT,
          "RETAILER_MOBILE_NUMBER_EXISTS",
          "A retailer already exists with this mobile number",
        );
      }

      throw error;
    }
  }

  async softDeleteRetailer(tenantId: string, retailerId: string) {
    const retailer = await this.retailerRepository.softDelete(tenantId, retailerId);
    if (!retailer) {
      throw new AppError(HTTP_STATUS.NOT_FOUND, "RETAILER_NOT_FOUND", "Retailer not found");
    }

    return retailer;
  }
}
