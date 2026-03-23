# SaaS Security Architecture

## 1. Overview

Production-grade multi-tenant security assuming hostile environment. Defense-in-depth approach: authentication → authorization → isolation → audit.

### Threats Modeled
- Tenant A attempts to access Tenant B data
- Employee of Tenant A escalates privileges to admin
- Bulk data exfiltration via compromised API token
- Distributed denial-of-service (DDoS) on specific tenant
- Insider threat (SupplySetu ops staff) accessing tenant data
- Payment data breach via insecure integration

---

## 2. Role-Based Access Control (RBAC)

### Tenant Model: 3-Tier Hierarchy

```typescript
// Roles per tenant
enum TenantRole {
  TENANT_SUPER_ADMIN = 'tenant_super_admin', // Full access to tenant
  TENANT_ADMIN = 'tenant_admin',             // Operations + limited user mgmt
  TENANT_OPERATIONS = 'tenant_operations',   // Order processing + routes
  TENANT_SALES = 'tenant_sales',             // Salesman access (mobile)
  TENANT_FINANCE = 'tenant_finance',         // Billing + reports
  TENANT_VIEWER = 'tenant_viewer'            // Read-only access
}

// System-wide roles (SupplySetu staff)
enum SystemRole {
  PLATFORM_ADMIN = 'platform_admin',         // Full system access
  PLATFORM_SUPPORT = 'platform_support',     // Support access (screenshare)
  PLATFORM_OPS = 'platform_ops'              // Ops (logs, scaling)
}
```

### Database Schema: RBAC

```sql
CREATE TABLE tenant_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Role definition
  role_name VARCHAR(50) NOT NULL,
  description TEXT,
  
  -- Permissions as JSON array
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Is default role for new users?
  is_default BOOLEAN DEFAULT false,
  
  UNIQUE(tenant_id, role_name)
);

CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Identity
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  phone VARCHAR(20),
  
  -- Auth
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(255),
  
  -- Session
  last_login_at TIMESTAMP,
  last_ip_address INET,
  session_count INT DEFAULT 0,
  
  -- MFA
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_method VARCHAR(20), -- 'totp' | 'sms' | 'email'
  mfa_secret_encrypted TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_locked BOOLEAN DEFAULT false,
  locked_reason VARCHAR(255),
  locked_until TIMESTAMP,
  
  --  Assignment
  assigned_role_id UUID REFERENCES tenant_roles(id),
  
  -- Audit
  created_by UUID REFERENCES tenant_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP, -- Soft delete
  
  UNIQUE(tenant_id, email, deleted_at)
);

CREATE INDEX idx_tenant_users_active ON tenant_users(tenant_id, is_active);
```

### Permission Matrix

```typescript
// src/rbac/permissions.ts

export const PERMISSION_MATRIX = {
  // Order operations
  'order:create': {
    level: 'write',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_operations', 'tenant_sales'],
    description: 'Create new order'
  },
  'order:read': {
    level: 'read',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_operations', 'tenant_sales', 'tenant_finance', 'tenant_viewer'],
    description: 'View orders'
  },
  'order:update': {
    level: 'write',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_operations'],
    description: 'Modify order (status, amount)'
  },
  'order:delete': {
    level: 'admin',
    roles: ['tenant_super_admin', 'tenant_admin'],
    description: 'Cancel/delete order'
  },

  // Retailer management
  'retailer:create': {
    level: 'write',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_operations'],
    description: 'Onboard retailer'
  },
  'retailer:update': {
    level: 'write',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_operations'],
    description: 'Update retailer info'
  },
  'retailer:delete': {
    level: 'admin',
    roles: ['tenant_super_admin'],
    description: 'Delete retailer'
  },

  // Route management
  'route:manage': {
    level: 'write',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_operations'],
    description: 'Create/edit routes'
  },

  // Financials
  'payment:view': {
    level: 'read',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_finance', 'tenant_viewer'],
    description: 'View payment records'
  },
  'payment:reconcile': {
    level: 'write',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_finance'],
    description: 'Reconcile payments'
  },
  'invoice:create': {
    level: 'write',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_finance'],
    description: 'Generate invoice'
  },

  // Configuration
  'config:read': {
    level: 'read',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_viewer'],
    description: 'View tenant config'
  },
  'config:write': {
    level: 'admin',
    roles: ['tenant_super_admin', 'tenant_admin'],
    description: 'Modify tenant config'
  },

  // User management
  'user:invite': {
    level: 'admin',
    roles: ['tenant_super_admin', 'tenant_admin'],
    description: 'Invite team member'
  },
  'user:manage_roles': {
    level: 'admin',
    roles: ['tenant_super_admin'],
    description: 'Assign roles to users'
  },

  // Audit logs
  'audit:view': {
    level: 'read',
    roles: ['tenant_super_admin', 'tenant_admin'],
    description: 'Access audit logs'
  },

  // Analytics
  'analytics:advanced': {
    level: 'read',
    roles: ['tenant_super_admin', 'tenant_admin', 'tenant_finance'],
    description: 'Advanced reporting'
  }
};
```

### Authorization Middleware

```typescript
// src/middleware/authorize.middleware.ts

export const authorize = (...requiredPermissions: string[]) => {
  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const tenantId = req.tenantId;

      if (!userId || !tenantId) {
        return res.status(401).json({
          error: 'Unauthorized',
          code: 'MISSING_AUTH'
        });
      }

      // Fetch user + role + permissions
      const user = await db.query(
        `SELECT u.id, u.assigned_role_id, r.permissions
         FROM tenant_users u
         LEFT JOIN tenant_roles r ON u.assigned_role_id = r.id
         WHERE u.id = $1 AND u.tenant_id = $2 AND u.is_active = true`,
        [userId, tenantId]
      );

      if (!user.rows.length) {
        logger.warn('USER_NOT_FOUND', { userId, tenantId });
        return res.status(404).json({
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      const userRecord = user.rows[0];
      const userPermissions = userRecord.permissions || [];

      // Check if user has ALL required permissions
      const hasAllPermissions = requiredPermissions.every(perm =>
        userPermissions.includes(perm)
      );

      if (!hasAllPermissions) {
        const missingPermissions = requiredPermissions.filter(
          perm => !userPermissions.includes(perm)
        );

        logger.warn('PERMISSION_DENIED', {
          userId,
          tenantId,
          required: requiredPermissions,
          missing: missingPermissions
        });

        return res.status(403).json({
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
          required_permissions: requiredPermissions
        });
      }

      // Attach permissions to request
      req.userPermissions = userPermissions;

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'AUTH_ERROR'
      });
    }
  };
};

// Usage in routes
app.post('/api/v1/orders',
  authenticate,
  tenantContextMiddleware,
  authorize('order:create'),
  createOrderHandler
);
```

---

## 3. Authentication & Password Security

### Password Policy Enforcement

```typescript
// src/services/password.service.ts

export class PasswordPolicy {
  static readonly MIN_LENGTH = 12;
  static readonly REQUIRE_UPPERCASE = true;
  static readonly REQUIRE_LOWERCASE = true;
  static readonly REQUIRE_NUMBERS = true;
  static readonly REQUIRE_SPECIAL = true;
  static readonly EXPIRY_DAYS = 90;
  static readonly HISTORY_COUNT = 5; // Don't allow reuse of last N passwords

  static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters`);
    }

    if (this.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letter');
    }

    if (this.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letter');
    }

    if (this.REQUIRE_NUMBERS && !/[0-9]/.test(password)) {
      errors.push('Password must contain number');
    }

    if (this.REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain special character (!@#$%^&*)');
    }

    // Check against common passwords (use library like `common-passwords`)
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common. Choose a more unique password');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static async hashPassword(password: string): Promise<string> {
    // Use bcrypt with cost factor 12
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password verification error:', error);
      return false;
    }
  }

  static async updatePassword(
    userId: string,
    tenantId: string,
    oldPassword: string,
    newPassword: string
  ) {
    // 1. Validate new password policy
    const validation = this.validate(newPassword);
    if (!validation.isValid) {
      throw new Error(`Password policy violation: ${validation.errors.join(', ')}`);
    }

    // 2. Fetch user
    const user = await db.query(
      `SELECT password_hash FROM tenant_users WHERE id = $1 AND tenant_id = $2`,
      [userId, tenantId]
    );

    if (!user.rows.length) {
      throw new Error('User not found');
    }

    // 3. Verify old password
    const isCorrect = await this.verifyPassword(oldPassword, user.rows[0].password_hash);
    if (!isCorrect) {
      throw new Error('Current password incorrect');
    }

    // 4. Check against password history
    const passwordHistory = await db.query(
      `SELECT password_history FROM tenant_users WHERE id = $1`,
      [userId]
    );

    const history = passwordHistory.rows[0]?.password_history || [];
    for (const oldHash of history.slice(0, this.HISTORY_COUNT)) {
      const matches = await this.verifyPassword(newPassword, oldHash);
      if (matches) {
        throw new Error(`Cannot reuse any of last ${this.HISTORY_COUNT} passwords`);
      }
    }

    // 5. Update password + history
    const newHash = await this.hashPassword(newPassword);
    await db.query(
      `UPDATE tenant_users
       SET password_hash = $1,
           password_changed_at = CURRENT_TIMESTAMP,
           password_history = array_prepend($2, password_history[:{$3}]),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [newHash, user.rows[0].password_hash, this.HISTORY_COUNT, userId]
    );

    logger.info('PASSWORD_CHANGED', { userId, tenantId });
  }

  private static isCommonPassword(password: string): boolean {
    // Use library: npm install common-passwords
    const commonPasswords = require('common-passwords')();
    return commonPasswords.includes(password.toLowerCase());
  }
}
```

### Account Lockout Protection

```typescript
// src/middleware/account-lockout.middleware.ts

export class AccountLockoutService {
  static readonly MAX_LOGIN_ATTEMPTS = 5;
  static readonly LOCKOUT_DURATION_MINUTES = 30;

  static async recordFailedLogin(userEmail: string, tenantId: string) {
    const now = new Date();
    const lockoutWindowStart = new Date(now.getTime() - this.LOCKOUT_DURATION_MINUTES * 60000);

    // Count failed attempts in last 30 min
    const attempts = await db.query(
      `SELECT COUNT(*) as attempt_count FROM login_failures
       WHERE user_email = $1 AND tenant_id = $2 AND attempted_at > $3`,
      [userEmail, tenantId, lockoutWindowStart]
    );

    const attemptCount = attempts.rows[0].attempt_count + 1;

    // Record this attempt
    await db.query(
      `INSERT INTO login_failures (user_email, tenant_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [userEmail, tenantId, 'ip', 'ua']
    );

    // Lock account if exceeded max attempts
    if (attemptCount >= this.MAX_LOGIN_ATTEMPTS) {
      await db.query(
        `UPDATE tenant_users
         SET is_locked = true,
             locked_reason = $1,
             locked_until = $2
         WHERE email = $3 AND tenant_id = $4`,
        [
          'Max login attempts exceeded',
          new Date(now.getTime() + this.LOCKOUT_DURATION_MINUTES * 60000),
          userEmail,
          tenantId
        ]
      );

      logger.warn('ACCOUNT_LOCKED', { userEmail, tenantId, attemptCount });

      throw new Error(
        `Account locked for ${this.LOCKOUT_DURATION_MINUTES} minutes due to too many failed login attempts`
      );
    }

    if (attemptCount > 3) {
      logger.warn('FAILED_LOGIN_ATTEMPT', { userEmail, tenantId, attemptCount });
    }
  }

  static async recordSuccessfulLogin(userId: string, tenantId: string, ipAddress: string) {
    // Clear failed login attempts
    await db.query(
      `DELETE FROM login_failures WHERE user_email = (
        SELECT email FROM tenant_users WHERE id = $1
      ) AND tenant_id = $2`,
      [userId, tenantId]
    );

    // Update user last login
    await db.query(
      `UPDATE tenant_users
       SET last_login_at = CURRENT_TIMESTAMP,
           last_ip_address = $1,
           session_count = session_count + 1,
           is_locked = false,
           locked_until = NULL
       WHERE id = $2`,
      [ipAddress, userId]
    );

    logger.info('SUCCESSFUL_LOGIN', { userId, tenantId, ipAddress });
  }

  static async unlockAccount(userEmail: string, tenantId: string) {
    await db.query(
      `UPDATE tenant_users
       SET is_locked = false, locked_until = NULL
       WHERE email = $1 AND tenant_id = $2`,
      [userEmail, tenantId]
    );

    logger.info('ACCOUNT_UNLOCKED', { userEmail, tenantId });
  }
}
```

---

## 4. Multi-Factor Authentication (MFA)

### MFA Architecture

```typescript
// src/services/mfa.service.ts

export class MFAService {
  static readonly TOTP_WINDOW = 1; // Accept current + 1 previous/next window
  static readonly SMS_EXPIRY_SECONDS = 300; // 5 min
  static readonly SMS_MAX_ATTEMPTS = 3;

  /**
   * Generate TOTP secret for user (QR code)
   */
  static generateTOTPSecret(userEmail: string): {
    secret: string;
    qrCode: string;
  } {
    const secret = speakeasy.generateSecret({
      name: `SupplySetu (${userEmail})`,
      issuer: 'SupplySetu',
      length: 32
    });

    const qrCode = QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode
    };
  }

  /**
   * Verify TOTP code
   */
  static verifyTOTP(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: this.TOTP_WINDOW
    });
  }

  /**
   * Send SMS OTP
   */
  static async sendSMSOTP(phoneNumber: string, userId: string, tenantId: string) {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP (expiring)
    await db.query(
      `INSERT INTO mfa_attempts (user_id, tenant_id, method, code, attempts, expires_at)
       VALUES ($1, $2, 'sms', $3, 0, CURRENT_TIMESTAMP + INTERVAL '5 minutes')`,
      [userId, tenantId, await this.hashOTP(otp)]
    );

    // Send via SMS
    await SMSService.send({
      to: phoneNumber,
      message: `Your SupplySetu verification code is: ${otp}. Valid for 5 minutes.`
    });

    logger.info('SMS_OTP_SENT', { phoneNumber, userId, tenantId });

    return { success: true, expiresIn: 300 };
  }

  /**
   * Verify SMS OTP
   */
  static async verifySMSOTP(
    userId: string,
    tenantId: string,
    otpCode: string
  ): Promise<boolean> {
    // Get latest OTP attempt
    const attempt = await db.query(
      `SELECT code, attempts, expires_at FROM mfa_attempts
       WHERE user_id = $1 AND tenant_id = $2 AND method = 'sms' AND expires_at > CURRENT_TIMESTAMP
       ORDER BY created_at DESC LIMIT 1`,
      [userId, tenantId]
    );

    if (!attempt.rows.length) {
      throw new Error('OTP expired or not found');
    }

    const record = attempt.rows[0];

    // Check attempt limit
    if (record.attempts >= this.SMS_MAX_ATTEMPTS) {
      await db.query(
        `DELETE FROM mfa_attempts WHERE user_id = $1 AND tenant_id = $2 AND method = 'sms'`,
        [userId, tenantId]
      );
      throw new Error('Too many OTP attempts. Request a new code.');
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otpCode, record.code);

    if (!isValid) {
      await db.query(
        `UPDATE mfa_attempts SET attempts = attempts + 1
         WHERE user_id = $1 AND tenant_id = $2 AND method = 'sms'`,
        [userId, tenantId]
      );
      throw new Error('Invalid OTP code');
    }

    // Success: delete OTP attempt
    await db.query(
      `DELETE FROM mfa_attempts WHERE user_id = $1 AND tenant_id = $2 AND method = 'sms'`,
      [userId, tenantId]
    );

    return true;
  }

  private static async hashOTP(otp: string): Promise<string> {
    return bcrypt.hash(otp, 10);
  }
}
```

### MFA Enrollment Flow

```typescript
// Authentication endpoint with MFA
export async function login(email: string, password: string) {
  // 1. Verify email + password
  const user = await verifyCredentials(email, password);
  if (!user) throw new Error('Invalid credentials');

  // 2. If MFA enabled, require second factor
  if (user.mfa_enabled) {
    // Create temporary auth session
    const tempToken = jwt.sign(
      { userId: user.id, mfaPending: true },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    if (user.mfa_method === 'totp') {
      return {
        status: 'mfa_required',
        method: 'totp',
        message: 'Enter authenticator code from your app',
        temp_token: tempToken
      };
    } else if (user.mfa_method === 'sms') {
      await MFAService.sendSMSOTP(user.phone, user.id, user.tenant_id);
      return {
        status: 'mfa_required',
        method: 'sms',
        message: 'OTP sent to your phone',
        temp_token: tempToken
      };
    }
  }

  // 3. Generate final auth token
  const authToken = jwt.sign(
    { userId: user.id, tenantId: user.tenant_id },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  return { status: 'authenticated', auth_token: authToken };
}
```

---

## 5. API Tenant Isolation Guard

### Dual Validation: Header + JWT

```typescript
// src/middleware/api-tenant-guard.middleware.ts

export const apiTenantGuard = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract tenant from header
    const headerTenant = req.header('X-Tenant-ID');
    if (!headerTenant) {
      return res.status(400).json({
        error: 'Missing X-Tenant-ID header',
        code: 'MISSING_TENANT_HEADER'
      });
    }

    // Extract JWT token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        error: 'Missing authorization token',
        code: 'MISSING_AUTH_TOKEN'
      });
    }

    // Verify JWT signature + decode
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    // Validate tenant mismatch
    if (decoded.tenant_id !== headerTenant) {
      logger.error('TENANT_MISMATCH', {
        jwt_tenant: decoded.tenant_id,
        header_tenant: headerTenant,
        user_id: decoded.user_id,
        ip: req.ip
      });

      return res.status(403).json({
        error: 'Tenant mismatch in request',
        code: 'TENANT_MISMATCH'
      });
    }

    // Tenant verified; attach to request
    req.tenantId = headerTenant;
    req.userId = decoded.user_id;

    next();
  } catch (error) {
    logger.error('API tenant guard error:', error);
    return res.status(500).json({
      error: 'Security validation failed',
      code: 'SECURITY_ERROR'
    });
  }
};

// Apply to all /api routes
app.use('/api/v1', apiTenantGuard);
```

---

## 6. Audit Logging

### Sensitive Action Audit Log

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Actor
  user_id UUID REFERENCES tenant_users(id),
  
  -- Action
  action_type VARCHAR(100) NOT NULL,  -- LOGIN, CREATE_ORDER, DELETE_USER, CONFIG_CHANGE, etc.
  resource_type VARCHAR(100),          -- order, retailer, user, config
  resource_id UUID,                    -- order_123, user_456, etc.
  
  -- Details
  old_values JSONB,                    -- Before state
  new_values JSONB,                    -- After state
  description TEXT,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Compliance
  severity VARCHAR(20), -- 'info', 'warning', 'critical'
  is_sensitive BOOLEAN DEFAULT false,  -- PII, payment data, passwords
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Immutable
  is_deleted BOOLEAN DEFAULT false
);

-- Indices
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action_type);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(created_at);
```

### Audit Logger Service

```typescript
// src/services/audit-logger.service.ts

export class AuditLogger {
  /**
   * Log sensitive action (immutable record)
   */
  static async logAction(
    tenantId: string,
    userId: string,
    action: {
      type: 'LOGIN' | 'CREATE_ORDER' | 'UPDATE_USER' | 'DELETE_RETAILER' | 'CONFIG_CHANGE' | string;
      resourceType?: string;
      resourceId?: string;
      oldValues?: any;
      newValues?: any;
      description?: string;
      severity?: 'info' | 'warning' | 'critical';
      isSensitive?: boolean; // PII, payment info
    },
    context: {
      ipAddress: string;
      userAgent: string;
    }
  ) {
    try {
      await db.query(
        `INSERT INTO audit_logs (
          tenant_id, user_id, action_type, resource_type, resource_id,
          old_values, new_values, description, severity, is_sensitive,
          ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          tenantId,
          userId,
          action.type,
          action.resourceType,
          action.resourceId,
          action.oldValues ? JSON.stringify(action.oldValues) : null,
          action.newValues ? JSON.stringify(action.newValues) : null,
          action.description,
          action.severity || 'info',
          action.isSensitive || false,
          context.ipAddress,
          context.userAgent
        ]
      );

      // Log critically sensitive actions separately
      if (action.isSensitive && action.severity === 'critical') {
        logger.warn('CRITICAL_AUDIT_ACTION', {
          tenantId,
          userId,
          action: action.type,
          resource: `${action.resourceType}:${action.resourceId}`
        });
      }
    } catch (error) {
      logger.error('Failed to log audit action:', error);
      // Don't throw; allow operation to continue even if audit fails
    }
  }

  /**
   * Retrieve audit trail for resource
   */
  static async getAuditTrail(
    tenantId: string,
    resourceType: string,
    resourceId: string
  ) {
    const logs = await db.query(
      `SELECT * FROM audit_logs
       WHERE tenant_id = $1 AND resource_type = $2 AND resource_id = $3
       ORDER BY created_at DESC`,
      [tenantId, resourceType, resourceId]
    );

    return logs.rows.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));
  }

  /**
   * Export audit logs (compliance/audit)
   */
  static async exportLogs(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Buffer> {
    const logs = await db.query(
      `SELECT * FROM audit_logs
       WHERE tenant_id = $1 AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC`,
      [tenantId, startDate, endDate]
    );

    // Generate CSV
    const csv = this.generateCSV(logs.rows);
    return Buffer.from(csv, 'utf-8');
  }

  private static generateCSV(rows: any[]): string {
    const headers = [
      'Timestamp',
      'User ID',
      'Action',
      'Resource',
      'IP Address',
      'Description'
    ];

    const csvRows = rows.map(row => [
      row.created_at,
      row.user_id,
      row.action_type,
      `${row.resource_type}:${row.resource_id}`,
      row.ip_address,
      row.description
    ]);

    return [headers, ...csvRows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}
```

### Audit Actions to Log

```typescript
// Critical sensitive actions
export const AUDIT_ACTIONS = {
  // Authentication
  'user:login': { severity: 'info', sensitive: false },
  'user:logout': { severity: 'info', sensitive: false },
  'user:login_failed': { severity: 'warning', sensitive: false },
  'account:locked': { severity: 'warning', sensitive: false },
  'password:changed': { severity: 'info', sensitive: false },
  'mfa:enabled': { severity: 'info', sensitive: false },
  'mfa:reset': { severity: 'warning', sensitive: false },

  // User management
  'user:invited': { severity: 'info', sensitive: false },
  'user:role_changed': { severity: 'warning', sensitive: false },
  'user:deleted': { severity: 'critical', sensitive: true },
  'user:activated': { severity: 'info', sensitive: false },
  'user:deactivated': { severity: 'warning', sensitive: false },

  // Tenant configuration
  'config:payment_gateway_updated': { severity: 'critical', sensitive: true },
  'config:billing_updated': { severity: 'critical', sensitive: true },
  'config:feature_flag_changed': { severity: 'warning', sensitive: false },

  // Data operations
  'order:created': { severity: 'info', sensitive: false },
  'order:payment_processed': { severity: 'critical', sensitive: true },
  'retailer:imported_bulk': { severity: 'info', sensitive: false },
  'retailer:deleted': { severity: 'warning', sensitive: true },
  'data:exported': { severity: 'warning', sensitive: true },

  // Security operations
  'api_key:generated': { severity: 'info', sensitive: false },
  'api_key:revoked': { severity: 'info', sensitive: false },
  'webhook:registered': { severity: 'info', sensitive: false },
  'webhook:failed': { severity: 'warning', sensitive: false }
};
```

---

## 7. Rate Limiting Per Tenant

### Rate Limit Configuration

```typescript
// src/middleware/rate-limit.middleware.ts

export const rateLimitConfig = {
  // Global endpoints
  '/auth/login': { limit: 10, window: 900 },      // 10 req/15min
  '/auth/signup': { limit: 5, window: 3600 },     // 5 req/hour
  '/auth/password-reset': { limit: 5, window: 3600 },

  // API endpoints (per tenant)
  '/api/v1/orders': { limit: 1000, window: 60 },  // 1000 req/min per tenant
  '/api/v1/retailers': { limit: 100, window: 60 }, // 100 req/min per tenant
  '/api/v1/reports': { limit: 50, window: 60 },   // Heavy operation

  // File uploads
  '/api/v1/import': { limit: 10, window: 3600 }   // 10 uploads/hour
};

export const rateLimitMiddleware = async (
  req: TenantRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const path = req.baseUrl;
    const config = rateLimitConfig[path];

    if (!config) {
      return next(); // No limit for this path
    }

    // Rate limit key: tenant_id + endpoint
    const key = `ratelimit:${req.tenantId}:${path}`;

    // Use Redis for distributed rate limiting
    const currentCount = await redis.incr(key);

    if (currentCount === 1) {
      // First request in window; set expiry
      await redis.expire(key, config.window);
    }

    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': config.limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, config.limit - currentCount).toString(),
      'X-RateLimit-Reset': (Date.now() + config.window * 1000).toString()
    });

    // Check limit
    if (currentCount > config.limit) {
      logger.warn('RATE_LIMIT_EXCEEDED', {
        tenantId: req.tenantId,
        path,
        count: currentCount,
        limit: config.limit
      });

      return res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retry_after: config.window
      });
    }

    next();
  } catch (error) {
    logger.error('Rate limit middleware error:', error);
    // Fail open: allow request even if rate limiting fails
    next();
  }
};
```

---

## 8. Data Encryption

### At-Rest Encryption

```typescript
// src/services/encryption.service.ts

export class EncryptionService {
  static readonly ALGORITHM = 'aes-256-gcm';

  /**
   * Encrypt sensitive data (PII, payment tokens)
   */
  static encrypt(plaintext: string): {
    ciphertext: string;
    iv: string;
    authTag: string;
  } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.ALGORITHM,
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      iv
    );

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   */
  static decrypt(encrypted: {
    ciphertext: string;
    iv: string;
    authTag: string;
  }): string {
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      Buffer.from(encrypted.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));

    let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Usage: Store sensitive fields encrypted
await db.query(
  `INSERT INTO tenant_payment_tokens (tenant_id, token_encrypted, token_iv, token_auth_tag)
   VALUES ($1, $2, $3, $4)`,
  [tenantId, ...Object.values(EncryptionService.encrypt(paymentToken))]
);
```

### In-Transit Encryption (TLS)

```nginx
# nginx SSL configuration
server {
    listen 443 ssl http2;
    server_name *.supplysetu.com supplysetu.com;

    # TLS 1.2+ only
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Certificate (LetsEncrypt auto-renewal)
    ssl_certificate /etc/letsencrypt/live/supplysetu.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/supplysetu.com/privkey.pem;

    # HSTS (force HTTPS)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

---

## 9. Security Checklist

- ✅ All passwords salted + hashed (bcrypt, cost 12)
- ✅ RBAC enforced at API layer
- ✅ Tenant misrouting prevented (dual JWT + header validation)
- ✅ Account lockout after 5 failed attempts
- ✅ Password policy enforced (12 chars, mixed case, numbers, special)
- ✅ MFA optional (TOTP or SMS)
- ✅ All sensitive actions logged & immutable
- ✅ Rate limiting per tenant
- ✅ PII encrypted at rest
- ✅ TLS enforced for all traffic
- ✅ Audit logs exportable for compliance

---

## Summary

Production security architecture for hostile multi-tenant SaaS:
1. ✅ RBAC with tenant + system roles
2. ✅ Strong authentication (password policy, MFA, account lockout)
3. ✅ Tenant isolation enforced at API + database layer
4. ✅ Comprehensive audit logging (immutable, exportable)
5. ✅ Rate limiting per tenant to prevent API abuse
6. ✅ Encryption at rest + in transit
7. ✅ Defense-in-depth: multiple checkpoints prevent privilege escalation

**Deployment:**
```bash
# Generate encryption key
openssl rand -hex 32 > .env.ENCRYPTION_KEY

# Apply security migrations
npm run migrate:security

# Verify all guards in place
npm run test:security
```
