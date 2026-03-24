import jwt from "jsonwebtoken";
import crypto from "crypto";

interface TokenPayload {
  retailer_id: number;
  phone: string;
  tenant_ids: number[];
  iat: number;
  exp?: number;
}

export class AuthService {
  private accessTokenSecret = process.env.JWT_SECRET || "dev-secret-key";
  private refreshTokenSecret = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret";
  private accessTokenExpiry = "24h";
  private refreshTokenExpiry = "7d";

  /**
   * Generate OTP for phone login
   * In production, send via Twilio/SMS service
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Store OTP in Redis/cache with 5-minute TTL
   * Placeholder - integrate with cache module
   */
  async storeOTP(phone: string, otp: string): Promise<void> {
    // TODO: Implement with Redis
    console.log(`[OTP] ${phone}: ${otp}`);
  }

  /**
   * Verify OTP validity
   */
  async verifyOTP(phone: string, otp: string): Promise<boolean> {
    // TODO: Retrieve from Redis and compare
    // For development: accept any 6-digit code
    return /^\d{6}$/.test(otp);
  }

  /**
   * Generate JWT access token
   */
  generateAccessToken(retailerId: number, phone: string, tenantIds: number[]): string {
    const payload: TokenPayload = {
      retailer_id: retailerId,
      phone,
      tenant_ids: tenantIds,
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.accessTokenSecret, {
      algorithm: "HS256",
      expiresIn: this.accessTokenExpiry as any,
    });
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(retailerId: number, phone: string): string {
    const payload = {
      retailer_id: retailerId,
      phone,
      type: "refresh",
      iat: Math.floor(Date.now() / 1000),
    };

    return jwt.sign(payload, this.refreshTokenSecret, {
      algorithm: "HS256",
      expiresIn: this.refreshTokenExpiry as any,
    });
  }

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.accessTokenSecret) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verify and decode refresh token
   */
  verifyRefreshToken(token: string): any {
    try {
      return jwt.verify(token, this.refreshTokenSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate idempotency key for order retry safety
   */
  generateIdempotencyKey(): string {
    return crypto.randomUUID();
  }
}

export default new AuthService();
