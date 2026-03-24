import { Request, Response } from "express";
import { Knex } from "knex";
import AuthService from "../services/AuthService";
import { RetailerRepository } from "../repositories/RetailerRepository";
import { OTPLoginRequest, OTPVerifyRequest, AuthTokenResponse } from "../../../shared/types/retailer-ordering";

export class AuthController {
  private retailerRepo: RetailerRepository;

  constructor(private db: Knex) {
    this.retailerRepo = new RetailerRepository(db);
  }

  /**
   * POST /auth/retailer/login
   * Send OTP to phone number
   */
  async loginWithOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phone }: OTPLoginRequest = req.body;

      // Validate phone
      if (!phone || !/^\d{10}$/.test(phone)) {
        res.status(400).json({ error: "Invalid phone number format" });
        return;
      }

      // Generate OTP
      const otp = AuthService.generateOTP();
      
      // Store OTP (Redis with 5min TTL)
      await AuthService.storeOTP(phone, otp);

      // TODO: Send SMS via Twilio/provider
      console.log(`[SMS] Sending OTP to ${phone}: ${otp}`);

      res.json({
        message: "OTP sent successfully",
        phone,
        // For development only - remove in production
        ...(process.env.NODE_ENV === "development" && { otp }),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to send OTP" });
    }
  }

  /**
   * POST /auth/retailer/verify-otp
   * Verify OTP and issue tokens
   */
  async verifyOTP(req: Request, res: Response): Promise<void> {
    try {
      const { phone, otp }: OTPVerifyRequest = req.body;

      // Verify OTP
      const isValid = await AuthService.verifyOTP(phone, otp);
      if (!isValid) {
        res.status(401).json({ error: "Invalid or expired OTP" });
        return;
      }

      // Find or create retailer
      let retailer = await this.retailerRepo.findByPhone(phone);
      if (!retailer) {
        // First-time login: create retailer record
        retailer = await this.retailerRepo.create({
          phone,
          name: `User ${phone}`, // Placeholder - update from profile screen later
          credit_line_status: "none",
        });
      }

      // Get tenant IDs
      const tenantIds = await this.retailerRepo.getTenantIds(retailer.id);

      // Generate tokens
      const accessToken = AuthService.generateAccessToken(retailer.id, phone, tenantIds);
      const refreshToken = AuthService.generateRefreshToken(retailer.id, phone);

      const response: AuthTokenResponse = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: 86400, // 24 hours
        retailer: {
          id: retailer.id,
          phone: retailer.phone,
          name: retailer.name,
          city: retailer.city,
          credit_line_status: retailer.credit_line_status,
          created_at: retailer.created_at,
          updated_at: retailer.updated_at,
        },
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Authentication failed" });
    }
  }

  /**
   * POST /auth/retailer/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(401).json({ error: "Refresh token required" });
        return;
      }

      // Verify refresh token
      const decoded = AuthService.verifyRefreshToken(refresh_token);
      if (!decoded) {
        res.status(401).json({ error: "Invalid refresh token" });
        return;
      }

      // Get retailer
      const retailer = await this.retailerRepo.findById(decoded.retailer_id);
      if (!retailer) {
        res.status(404).json({ error: "Retailer not found" });
        return;
      }

      // Get updated tenant IDs
      const tenantIds = await this.retailerRepo.getTenantIds(retailer.id);

      // Issue new access token
      const newAccessToken = AuthService.generateAccessToken(retailer.id, retailer.phone, tenantIds);

      res.json({
        access_token: newAccessToken,
        token_type: "Bearer",
        expires_in: 86400,
      });
    } catch (error) {
      res.status(500).json({ error: "Token refresh failed" });
    }
  }

  /**
   * GET /auth/retailer/distributors
   * Get list of connected distributors for retailer
   */
  async getDistributors(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).retailer?.id;
      if (!retailerId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const distributors = await this.retailerRepo.getConnectedDistributors(retailerId);
      res.json(distributors);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch distributors" });
    }
  }

  /**
   * POST /auth/retailer/profile
   * Update retailer profile
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const retailerId = (req as any).retailer?.id;
      if (!retailerId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { name, locality, city, state, owner_name } = req.body;

      await this.retailerRepo.update(retailerId, {
        name,
        locality,
        city,
        state,
        owner_name,
      });

      const retailer = await this.retailerRepo.findById(retailerId);
      res.json(retailer);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  }
}
