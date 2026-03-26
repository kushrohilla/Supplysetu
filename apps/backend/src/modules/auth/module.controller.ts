import type { FastifyReply, FastifyRequest } from "fastify";

import { HTTP_STATUS } from "../../shared/constants/http-status";
import { AppError } from "../../shared/errors/app-error";
import {
  adminLoginSchema,
  refreshTokenSchema,
  registerDistributorSchema,
  requestOtpSchema,
  updateProfileSchema,
  verifyOtpSchema,
} from "./module.schema";

export class AuthController {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const adminPayload = adminLoginSchema.safeParse(request.body);
    if (adminPayload.success) {
      const result = await request.server.container.authService.loginDistributor(
        adminPayload.data.identifier,
        adminPayload.data.password,
      );

      if (!result) {
        throw new AppError(HTTP_STATUS.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid distributor credentials");
      }

      return reply.send({
        success: true,
        data: {
          access_token: result.tokens.accessToken,
          refresh_token: result.tokens.refreshToken,
          token_type: "Bearer",
          expires_in: result.tokens.expiresInSeconds,
          user: result.user,
          tenant: result.tenant,
        },
      });
    }

    const payload = requestOtpSchema.parse(request.body);
    const result = await request.server.container.authService.requestOtp(payload.phone);
    return reply.send({ success: true, data: result });
  }

  async registerDistributor(request: FastifyRequest, reply: FastifyReply) {
    const payload = registerDistributorSchema.parse(request.body);
    const result = await request.server.container.authService.registerDistributor(payload);

    if (!result) {
      throw new AppError(
        HTTP_STATUS.CONFLICT,
        "DISTRIBUTOR_ALREADY_EXISTS",
        "A distributor account already exists with this name or mobile number",
      );
    }

    return reply.status(HTTP_STATUS.CREATED).send({
      success: true,
      data: {
        access_token: result.tokens.accessToken,
        refresh_token: result.tokens.refreshToken,
        token_type: "Bearer",
        expires_in: result.tokens.expiresInSeconds,
        user: result.user,
        tenant: result.tenant,
      },
    });
  }

  async verifyOtp(request: FastifyRequest, reply: FastifyReply) {
    const payload = verifyOtpSchema.parse(request.body);
    const result = await request.server.container.authService.verifyOtp(payload.phone, payload.otp);

    if (!result) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "INVALID_OTP", "Invalid or expired OTP");
    }

    return reply.send({
      success: true,
      data: {
        access_token: result.tokens.accessToken,
        refresh_token: result.tokens.refreshToken,
        token_type: "Bearer",
        expires_in: result.tokens.expiresInSeconds,
        retailer: result.retailer,
        tenant_ids: result.tenantIds,
      },
    });
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const payload = refreshTokenSchema.parse(request.body);
    const result = await request.server.container.authService.refreshAccessToken(payload.refresh_token);

    if (!result) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Invalid refresh token");
    }

    return reply.send({
      success: true,
      data: {
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        expires_in: result.expiresInSeconds,
      },
    });
  }

  async getDistributors(request: FastifyRequest, reply: FastifyReply) {
    const retailerId = request.auth?.retailerId;
    if (!retailerId) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
    }

    const distributors = await request.server.container.distributorService.listDistributors(retailerId);
    return reply.send({ success: true, data: distributors });
  }

  async updateProfile(request: FastifyRequest, reply: FastifyReply) {
    const retailerId = request.auth?.retailerId;
    if (!retailerId) {
      throw new AppError(HTTP_STATUS.UNAUTHORIZED, "UNAUTHORIZED", "Unauthorized");
    }

    const payload = updateProfileSchema.parse(request.body);
    const retailer = await request.server.container.authService.updateRetailerProfile(retailerId, payload);
    return reply.send({ success: true, data: retailer });
  }
}
