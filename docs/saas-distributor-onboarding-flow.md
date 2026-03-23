# Distributor SaaS Onboarding Flow

## 1. Overview

Zero-touch distributor onboarding: signup → profile → routing → SKU catalog → retailers → go-live. No developer intervention required.

### Success Metrics
- Onboarding completion rate: >80% (pilot cohort)
- Time-to-first-order: <72 hours
- SKU import success: >95% (valid products)
- Retailer upload success: >90% (valid addresses)
- Support tickets during onboarding: <15% of new distributors

---

## 2. Onboarding API Endpoints

### Phase 1: Signup & Tenant Creation

#### POST /auth/signup
```typescript
/**
 * Create distributor account + tenant + admin user
 * Returns auth token for session continuity
 */
request {
  email: "distributor@company.com",
  password: "SecurePass123!", // Min 8 chars, 1 special, 1 number
  full_name: "John Manager",
  business_name: "ABC Distribution Hub",
  business_type: "distributor" | "super_distributor" | "wholesaler",
  contact_phone: "+91-9876543210",
  city: "Mumbai",
  state: "MH",
  gst_no: "27AABCT1234C1Z0" // Optional, can update later
}

response.201 {
  tenant_id: "uuid-tenant-123",
  tenant_slug: "abc-distribution-hub",
  admin_user_id: "uuid-user-456",
  auth_token: "eyJhbGciOiJIUzI1NiIs...",
  onboarding_url: "https://abc-distribution-hub.supplysetu.com/onboard",
  next_step: "profile_completion"
}

errors:
  - 400 Bad Request: password too weak
  - 409 Conflict: email already registered or business name taken
  - 500 Internal Error: tenant creation failed
```

#### POST /auth/login
```typescript
request {
  email: "distributor@company.com",
  password: "SecurePass123!"
}

response.200 {
  auth_token: "jwt-token",
  tenant_id: "uuid",
  user_id: "uuid",
  onboarding_state: {
    current_step: "profile_setup",
    completion_percentage: 20,
    steps_completed: ["signup"],
    steps_pending: ["profile", "routes", "skus", "retailers", "go_live"]
  }
}
```

---

### Phase 2: Business Profile Setup

#### PATCH /onboard/profile
```typescript
/**
 * Update business profile
 * Persists to tenants table + tenant_configs
 */
request {
  business_legal_name: "ABC Distribution Services Pvt Ltd",
  business_type: "distributor",
  gst_no: "27AABCT1234C1Z0",
  business_registration_number: "BRN-12345",
  headquarters_address: {
    street: "Plot 123, Industrial Area",
    city: "Mumbai",
    state: "MH",
    pincode: "400001",
    country: "IN"
  },
  warehouse_address: {
    street: "Plot 456, Warehouse Zone",
    city: "Mumbai",
    state: "MH",
    pincode: "400002",
    country: "IN"
  },
  billing_address: "same_as_headquarters",
  brand_logo_url: "https://company.com/logo.png",
  primary_contact: {
    name: "John Manager",
    email: "john@company.com",
    phone: "+91-9876543210"
  },
  finance_contact: {
    name: "Jane Accountant",
    email: "jane@company.com",
    phone: "+91-8765432109"
  },
  operational_contact: {
    name: "Bob Operations",
    email: "bob@company.com",
    phone: "+91-7654321098"
  }
}

response.200 {
  profile_completed: true,
  validation_errors: [],
  next_step: "route_configuration",
  completion_percentage: 35
}

validation_errors.400 [
  {
    field: "gst_no",
    message: "Invalid GST number format",
    code: "INVALID_GST_FORMAT"
  },
  {
    field: "headquarters_address.pincode",
    message: "Pincode must be 6 digits",
    code: "INVALID_PINCODE"
  }
]
```

---

### Phase 3: Route Configuration Wizard

#### GET /onboard/routes/templates
```typescript
/**
 * List pre-built route templates based on distributor geography
 */
response.200 [
  {
    id: "template-1",
    name: "Urban Core (Mumbai East)",
    description: "High-density retail area, <5km avg distance",
    coverage_area: "Chembur, Powai, Vile Parle",
    estimated_retailers: 150,
    estimated_route_time_hours: 8,
    weekly_frequency: "2-3 days/week"
  },
  {
    id: "template-2",
    name: "Suburban Ring (Mumbai Suburbs)",
    description: "Medium-density, 5-15km between stops",
    coverage_area: "Thane, Navi Mumbai",
    estimated_retailers: 80,
    estimated_route_time_hours: 6,
    weekly_frequency: "1-2 days/week"
  }
]
```

#### POST /onboard/routes
```typescript
/**
 * Create sales routes
 * Can use template or custom definition
 */
request {
  routes: [
    {
      name: "Route 1 - Mumbai East",
      template_id: "template-1", // Optional: auto-populate retailers from template
      salesman_name: "Rajesh Kumar",
      salesman_phone: "+91-9876543211",
      coverage_area_polygon: [
        { lat: 19.1, lng: 72.85 },
        { lat: 19.2, lng: 72.85 },
        { lat: 19.2, lng: 72.95 },
        { lat: 19.1, lng: 72.95 }
      ],
      assigned_retailers: [], // Will be populated from template or bulk upload
      days_per_week: 3,
      preferred_days: ["Monday", "Wednesday", "Friday"]
    }
  ]
}

response.201 {
  routes_created: 1,
  route_ids: ["route-uuid-1"],
  template_retailers_pending: 150, // Requires retailer master data to assign
  next_step: "sku_import",
  completion_percentage: 45
}
```

---

### Phase 4: SKU Catalog Import

#### GET /onboard/skus/import-template
```typescript
/**
 * Download Excel template for SKU import
 * Pre-populated with common SupplySetu SKUs
 */
response:
  File: "SupplySetu_SKU_Import_Template.xlsx"
  Format: 
    - Column A: SKU Code (required)
    - Column B: Product Name (required)
    - Column C: Category (dropdown list)
    - Column D: Brand (required)
    - Column E: Packaging Unit (e.g., "Pack of 10")
    - Column F: HSN Code (optional)
    - Column G: Distributor Purchase Price (required)
    - Column H: Distributor Margin % (optional)
    - Column I: Minimum Retail Price (MRP) (required)
    - Column J: Tax % (5%, 12%, 18%)
    - Column K: Whether Seller Must Display Tax Separately (Y/N)
    - Column L: Notes (optional)
  
  Pre-populated:
    - 500 common SKUs across Fast Moving Consumer Goods (FMCG)
    - Categories: [Beverages, Snacks, Dairy, Personal Care, Household, Medicines]
    - User can delete unused SKUs, modify prices, add custom SKUs
```

#### POST /onboard/skus/import
```typescript
/**
 * Validate and import SKU file
 * Returns validation report (errors + warnings)
 */
request:
  file: Form multipart/form-data (xlsx)
  allow_duplicates: false // Fail if SKU code duplicated

response.202 {
  import_job_id: "import-456",
  status: "validating",
  message: "Validating SKU file...",
  polling_url: "/onboard/skus/import-status/import-456"
}

// Async job results (polled every 2s)
response.200 (GET polling_url) {
  status: "completed", // validating | completed | failed
  timestamp: "2026-03-21T10:30:00Z",
  summary: {
    total_skus_in_file: 523,
    valid_skus: 515,
    rejected_skus: 8,
    import_success_rate: "98.5%"
  },
  imported_skus_count: 515,
  errors: [
    {
      row: 125,
      sku_code: "SKU-BAD-001",
      field: "distributor_purchase_price",
      error: "Price must be positive number",
      severity: "error"
    }
  ],
  warnings: [
    {
      row: 234,
      sku_code: "SKU-009",
      field: "tax_percentage",
      warning: "Tax not matching GST slabs (expected 5%, 12%, 18% or 28%)",
      severity: "warning",
      action: "auto_corrected_to: 12%"
    }
  ],
  next_step: "retailer_upload",
  completion_percentage: 60
}
```

#### GET /onboard/skus/categories
```typescript
/**
 * List available product categories for importing
 */
response.200 [
  {
    id: "cat-fmcg-beverages",
    name: "Beverages",
    description: "Non-alcoholic drinks",
    sub_categories: ["Soft Drinks", "Water Bottles", "Juices", "Tea/Coffee"]
  },
  {
    id: "cat-fmcg-snacks",
    name: "Snacks & Confectionery",
    description: "Ready-to-eat snacks",
    sub_categories: ["Chips", "Biscuits", "Candy", "Nuts"]
  }
]
```

---

### Phase 5: Retailer Bulk Upload

#### GET /onboard/retailers/import-template
```typescript
/**
 * Download Excel template for retailer master data
 */
response:
  File: "SupplySetu_Retailer_Import_Template.xlsx"
  Format:
    - Column A: Retailer Name (required)
    - Column B: Shop Location Hint (required) — "Near Bombay High school"
    - Column C: Address Street (required)
    - Column D: City (required)
    - Column E: Pincode (required)
    - Column F: Latitude (optional, for route optimization)
    - Column G: Longitude (optional)
    - Column H: Owner Name (required)
    - Column I: Owner Phone (required, for OTP)
    - Column J: Alternative Contact (optional)
    - Column K: Shop Type (Kirana/General Store/Chemist/SuperMarket/etc.)
    - Column L: Average Monthly Order Value (estimate, optional)
    - Column M: Notes (optional)
  
  Validation Rules (enforced):
    - Retailer Name: 3-100 chars
    - Phone: 10 digits, +91 prefix
    - Pincode: 6 digits
    - Coordinates: valid lat/lng if provided
    - No duplicates by (name, phone) combo
```

#### POST /onboard/retailers/import
```typescript
/**
 * Validate and bulk import retailers
 */
request:
  file: Form multipart/form-data (xlsx)
  assign_to_routes: true // Auto-assign retailers to routes based on lat/lng
  send_onboarding_sms: false // Don't spam OTP yet; wait for approval

response.202 {
  import_job_id: "import-789",
  status: "processing",
  message: "Importing 450 retailers...",
  polling_url: "/onboard/retailers/import-status/import-789",
  estimated_duration_seconds: 30
}

// Polled results
response.200 (GET polling_url) {
  status: "completed",
  timestamp: "2026-03-21T10:35:00Z",
  summary: {
    total_retailers_in_file: 450,
    valid_retailers: 442,
    rejected_retailers: 8,
    import_success_rate: "98.2%"
  },
  imported_retailers: {
    count: 442,
    by_route: {
      "route-uuid-1": 225,
      "route-uuid-2": 217
    }
  },
  geo_validation: {
    retailers_with_coordinates: 380,
    route_assignment_success_rate: "98.0%"
  },
  errors: [
    {
      row: 15,
      retailer_name: "ABC Kirana",
      field: "phone",
      error: "Phone number invalid (must be 10 digits after +91)",
      severity: "error"
    }
  ],
  warnings: [
    {
      row: 67,
      retailer_name: "XYZ Shop",
      field: "coordinates",
      warning: "Pincode coordinates differ by >5km from provided lat/lng",
      action: "using_pincode_coordinates",
      severity: "warning"
    }
  ],
  next_step: "review_and_launch",
  completion_percentage: 85
}
```

---

### Phase 6: Pre-Launch Review & Validation

#### GET /onboard/preflight-check
```typescript
/**
 * Final validation before go-live
 * Ensure all required setup complete and valid
 */
response.200 {
  status: "ready_for_launch", // ready_for_launch | blocked | warning
  timestamp: "2026-03-21T10:40:00Z",
  checks: {
    business_profile: {
      status: "pass",
      message: "Complete",
      required_fields_filled: 100
    },
    routes: {
      status: "pass",
      details: {
        total_routes: 2,
        total_salesmen: 2,
        all_routes_have_retailers: true
      }
    },
    skus: {
      status: "pass",
      details: {
        total_skus_active: 515,
        skus_with_pricing: 515,
        skus_with_images: 480
      }
    },
    retailers: {
      status: "pass",
      details: {
        total_retailers: 442,
        retailers_with_contact: 442,
        retailers_route_assigned: 442,
        retailers_awaiting_activation: 442
      }
    },
    payment_setup: {
      status: "warning",
      message: "Razorpay integration pending",
      action_required: "connect_payment_gateway_in_settings"
    }
  },
  warnings: [
    {
      type: "missing_feature",
      message: "Advanced reporting not configured",
      impact: "low"
    }
  ],
  next_step: "confirm_and_launch"
}

// Possible status values:
// - ready_for_launch: All critical checks pass
// - blocked: Missing required data; can't launch
// - warning: Can launch but some features limited
```

#### POST /onboard/launch-confirmation
```typescript
/**
 * Confirm and activate tenant
 * Transitions to "active" status
 * Sends activation emails to admin + salesmen
 */
request {
  confirmed: true,
  distributor_name: "ABC Distribution Hub",
  activation_message: "We're ready to transform your distribution!"
}

response.200 {
  tenant_status: "active",
  activation_timestamp: "2026-03-21T10:45:00Z",
  onboarding_complete: true,
  next_actions: [
    {
      action: "send_activation_email_to_admin",
      details: "Welcome email + access credentials"
    },
    {
      action: "send_activation_sms_to_retailers",
      details: "442 retailers will receive OTP signup SMS"
    },
    {
      action: "send_training_resources_to_salesmen",
      details: "Video tutorials + user guides via email"
    }
  ],
  dashboard_url: "https://abc-distribution-hub.supplysetu.com/dashboard",
  support_contact: "support@supplysetu.com",
  support_phone: "+91-1800-SUPPLYSETU"
}
```

---

## 3. Onboarding Progress State Machine

### State Diagram

```
                    signup_complete
                           |
                           v
                  profile_setup_pending
                           |
                     [validate profile]
                           |
                           v
                  profile_setup_complete
                           |
                           v
                 route_config_pending
                           |
                    [create routes]
                           |
                           v
                 route_config_complete
                           |
                           v
                   sku_import_pending
                           |
                  [upload SKU file]
                           |
                           v
                   sku_import_complete
                           |
                           v
                  retailer_upload_pending
                           |
                   [upload retailers]
                           |
                           v
                  retailer_upload_complete
                           |
                   [preflight check]
                           |
              [Yes]  PASS?  [No]
               |              |
               v              v
         go_live_ready    blocked
                           /
                         [Fix]
                          \
                           v
                    [Re-validate]
```

### Database Schema: State Machine

```sql
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY,
  tenant_id UUID UNIQUE NOT NULL REFERENCES tenants(id),
  
  -- Current state
  current_step VARCHAR(50) NOT NULL,
  step_started_at TIMESTAMP,
  step_completed_at TIMESTAMP,
  
  -- Checklist completion
  steps_completed JSONB DEFAULT jsonb_build_object(
    'signup', false,
    'profile', false,
    'routes', false,
    'skus', false,
    'retailers', false,
    'go_live', false
  ),
  
  -- Validation state
  validation_status VARCHAR(20) DEFAULT 'pending', -- pending, valid, invalid
  validation_errors JSONB DEFAULT '{}'::jsonb,
  
  -- Timeline
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Audit
  updated_by UUID REFERENCES tenant_admins(id)
);

CREATE INDEX idx_onboarding_tenant ON onboarding_progress(tenant_id);
CREATE INDEX idx_onboarding_current_step ON onboarding_progress(current_step);
```

---

## 4. Validation Rules & Error Handling

### Business Profile Validation

```typescript
// src/validators/onboarding.validator.ts

export class OnboardingValidator {
  static validateBusinessProfile(input: BusinessProfile) {
    const errors: ValidationError[] = [];

    // Business name
    if (!input.business_legal_name || input.business_legal_name.trim().length < 3) {
      errors.push({
        field: 'business_legal_name',
        message: 'Business name must be at least 3 characters',
        code: 'NAME_TOO_SHORT'
      });
    }

    // GST validation
    if (input.gst_no) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[D]{1}[0-9]{1}$/;
      if (!gstRegex.test(input.gst_no)) {
        errors.push({
          field: 'gst_no',
          message: 'Invalid GST number format',
          code: 'INVALID_GST'
        });
      }
    }

    // Address validation
    const addressErrors = this.validateAddress(input.headquarters_address);
    errors.push(...addressErrors);

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateAddress(address: Address) {
    const errors: ValidationError[] = [];

    if (!address.street || address.street.trim().length < 5) {
      errors.push({
        field: 'address.street',
        message: 'Street address must be at least 5 characters',
        code: 'INVALID_STREET'
      });
    }

    if (!address.pincode || !/^\d{6}$/.test(address.pincode)) {
      errors.push({
        field: 'address.pincode',
        message: 'Pincode must be exactly 6 digits',
        code: 'INVALID_PINCODE'
      });
    }

    return errors;
  }

  static validateSKUImport(data: SKURecord[]) {
    const errors: ImportError[] = [];
    const validRecords: SKURecord[] = [];

    data.forEach((record, index) => {
      const recordErrors: ValidationError[] = [];

      // SKU code
      if (!record.sku_code || record.sku_code.trim().length === 0) {
        recordErrors.push({
          field: 'sku_code',
          message: 'SKU code required',
          code: 'SKU_CODE_MISSING'
        });
      }

      // Price validation
      if (!record.distributor_purchase_price || record.distributor_purchase_price <= 0) {
        recordErrors.push({
          field: 'distributor_purchase_price',
          message: 'Purchase price must be greater than 0',
          code: 'INVALID_PRICE'
        });
      }

      // MRP validation
      if (
        record.minimum_retail_price &&
        record.distributor_purchase_price &&
        record.minimum_retail_price < record.distributor_purchase_price
      ) {
        recordErrors.push({
          field: 'minimum_retail_price',
          message: 'MRP cannot be less than purchase price',
          code: 'MRP_LESS_THAN_COST',
          severity: 'warning'
        });
      }

      if (recordErrors.length > 0) {
        errors.push({
          row: index + 2, // Excel row (1-indexed + header)
          sku_code: record.sku_code,
          errors: recordErrors
        });
      } else {
        validRecords.push(record);
      }
    });

    return {
      isValid: errors.length === 0,
      totalRecords: data.length,
      validRecords: validRecords.length,
      errors,
      successRate: ((validRecords.length / data.length) * 100).toFixed(1)
    };
  }

  static validateRetailerImport(data: RetailerRecord[]) {
    const errors: ImportError[] = [];

    // Check for duplicates (by name + phone)
    const seen = new Set<string>();
    data.forEach((record, index) => {
      const key = `${record.retailer_name}-${record.owner_phone}`;
      if (seen.has(key)) {
        errors.push({
          row: index + 2,
          retailer_name: record.retailer_name,
          errors: [
            {
              field: 'name_phone_combination',
              message: 'Duplicate retailer detected',
              code: 'DUPLICATE_RETAILER',
              severity: 'error'
            }
          ]
        });
      }
      seen.add(key);
    });

    // Phone validation
    data.forEach((record, index) => {
      const phoneRegex = /^[0-9]{10}$/;
      if (!phoneRegex.test(record.owner_phone?.replace(/^\+91/, ''))) {
        errors.push({
          row: index + 2,
          retailer_name: record.retailer_name,
          errors: [
            {
              field: 'owner_phone',
              message: 'Invalid phone number (must be 10 digits)',
              code: 'INVALID_PHONE'
            }
          ]
        });
      }
    });

    return {
      isValid: errors.filter(e => e.errors.some(err => err.severity !== 'warning')).length === 0,
      totalRecords: data.length,
      errors
    };
  }
}
```

---

## 5. Onboarding Dashboard UI Endpoints

### GET /onboard/dashboard
```typescript
/**
 * Main onboarding dashboard view
 * Shows progress, current step, action items
 */
response.200 {
  tenant_id: "uuid",
  tenant_name: "ABC Distribution Hub",
  overall_progress: {
    percentage: 60,
    step_count: {
      completed: 3,
      pending: 2,
      total: 5
    }
  },
  current_step: {
    name: "SKU Import",
    status: "in_progress",
    description: "Upload your product catalog",
    action_url: "/onboard/skus/import",
    time_estimate_minutes: 20,
    help_link: "https://help.supplysetu.com/sku-import"
  },
  steps_timeline: [
    {
      step: "Business Profile",
      status: "completed", // completed | current | pending
      completed_at: "2026-03-21T08:00:00Z",
      icon: "✓"
    },
    {
      step: "Routes Setup",
      status: "completed",
      completed_at: "2026-03-21T08:30:00Z",
      icon: "✓"
    },
    {
      step: "SKU Catalog",
      status: "current",
      started_at: "2026-03-21T09:00:00Z",
      icon: "⏳"
    },
    {
      step: "Retailer Network",
      status: "pending",
      icon: "○"
    },
    {
      step: "Go Live Review",
      status: "pending",
      icon: "○"
    }
  ],
  quick_stats: {
    routes_configured: 2,
    salesmen_registered: 2,
    skus_imported: 515,
    retailers_uploaded: 0,
    estimated_go_live_date: "2026-03-21"
  },
  pending_actions: [
    {
      action: "Upload retailer data",
      priority: "high",
      description: "Import your 450 retailers",
      action_url: "/onboard/retailers/import"
    },
    {
      action: "Review preflight checklist",
      priority: "medium",
      description: "Ensure all requirements met",
      action_url: "/onboard/preflight-check"
    }
  ],
  support: {
    contact_email: "onboarding-support@supplysetu.com",
    phone: "+91-1800-SUPPLYSETU",
    estimated_response_time_minutes: 30,
    live_chat_available: true
  }
}
```

### GET /onboard/profile/summary
```typescript
/**
 * Display current business profile for review
 */
response.200 {
  business_legal_name: "ABC Distribution Services Pvt Ltd",
  business_type: "distributor",
  gst_no: "27AABCT1234C1Z0",
  headquarters_address: {
    street: "Plot 123, Industrial Area",
    city: "Mumbai",
    state: "MH",
    pincode: "400001"
  },
  primary_contact: {
    name: "John Manager",
    email: "john@company.com",
    phone: "+91-9876543210"
  },
  branding: {
    logo_url: "https://company.com/logo.png"
  },
  edit_url: "/onboard/profile/edit"
}
```

### GET /onboard/routes/summary
```typescript
/**
 * Display configured routes for review
 */
response.200 {
  routes: [
    {
      id: "route-1",
      name: "Route 1 - Mumbai East",
      salesman_name: "Rajesh Kumar",
      salesman_phone: "+91-9876543211",
      retailers_assigned: 225,
      days_per_week: 3,
      coverage_area: "Chembur, Powai, Vile Parle"
    }
  ],
  total_retailers_assigned: 225,
  total_salesmen: 1,
  edit_url: "/onboard/routes/edit"
}
```

### GET /onboard/skus/summary
```typescript
/**
 * Display imported SKUs for review
 */
response.200 {
  total_skus_imported: 515,
  by_category: {
    "Beverages": 125,
    "Snacks": 180,
    "Dairy": 95,
    "Personal Care": 115
  },
  pricing_validation: {
    skus_with_valid_pricing: 515,
    skus_missing_mrp: 0,
    skus_margin_too_low: 3
  },
  actions: [
    {
      label: "View All SKUs",
      url: "/onboard/skus/list"
    },
    {
      label: "Re-import",
      url: "/onboard/skus/import"
    }
  ]
}
```

---

## 6. Onboarding Experience: User Flow

### Day 1: Signup & Profile
```
Time: 10 min
1. Visit https://distributor.supplysetu.com/signup
2. Enter email, password, business name → Confirm
3. Email verification (click link)
4. Redirect to onboard dashboard
5. Fill business profile (name, address, GST)
6. Save → Route to setup wizard
```

### Day 1: Route Configuration
```
Time: 15 min
1. View route templates (pre-populated by city/state)
2. Select: "Urban Core (Mumbai East)"
3. Template auto-fills retailers from template
4. Add salesman name + phone
5. Review coverage area
6. Create route → Continue
```

### Day 2: SKU Import
```
Time: 20 min
1. Download Excel template (pre-populated with 500 common SKUs)
2. Modify/delete as needed
3. Add own SKUs if necessary
4. Upload file
5. Validation runs async
6. Review validation report (98.5% success)
7. Confirm import
```

### Day 2: Retailer Upload
```
Time: 30 min
1. Download Excel template
2. Upload 450 retailers
3. Validation + geo-assignment to routes
4. Result: 442 valid, 8 errors
5. Fix errors (via CSV or UI)
6. Re-upload + approve
```

### Day 3: Pre-Launch
```
Time: 5 min
1. Run preflight check
2. Review warnings (e.g., payment gateway pending)
3. Confirm go-live
4. Activation emails sent to admin + salesmen
5. Retailer OTP SMS queued
6. Dashboard accessible at https://abc-distribution-hub.supplysetu.com
```

---

## 7. Onboarding Completion Events

### SMS/Email Notifications

| Event | Recipient | Channel | Template | Timing |
|-------|-----------|---------|----------|--------|
| Signup Confirmation | Admin | Email | Welcome + onboarding link | Immediate |
| Profile Reminder | Admin | Email | "Complete business profile to continue" | +2 hours (if pending) |
| Routes Setup Complete | Admin | Email/SMS | "Routes configured, ready for SKU upload" | Immediate |
| SKU Import Success | Admin | Email | Details + next steps | Immediate |
| Retailer Import Success | Admin + Salesmen | Email/SMS | "Network ready, OTP spreading shortly" | Immediate |
| Go-Live Confirmation | All | Email | Celebratory + support contacts | Immediate |

### Onboarding Completion Certificate

```
email template: "distributor-launch-success.html"

Subject: "🎉 Your SupplySetu Distribution Platform is Live!"

Body:
  Thank you for choosing SupplySetu, ABC Distribution Hub!

  ✅ Onboarding Complete
  ✅ 442 retailers enrolled
  ✅ 515 products cataloged
  ✅ 2 sales routes active

  Quick Start:
  - Login: https://abc-distribution-hub.supplysetu.com
  - Your account: distributor@company.com
  - Support: +91-1800-SUPPLYSETU

  Next Steps:
  1. Retailers will receive OTP signup SMS
  2. Salesmen can start assisted ordering immediately
  3. Visit dashboard for adoption metrics

  Let's transform distribution! 🚀
```

---

## 8. Support & Escalation During Onboarding

### Support Tiers

```
Tier 1: Self-Service
- Knowledge base: https://help.supplysetu.com/onboarding
- Video tutorials: 5-min walkthroughs per step
- Email support: onboarding-support@supplysetu.com

Tier 2: Live Chat
- Hours: 9 AM - 9 PM IST
- Avg response time: <5 min
- Available from onboarding dashboard

Tier 3: Dedicated Onboarding Manager
- For enterprise/bulk distributors (>500 retailers)
- Proactive check-ins via phone/email
- Custom route optimization support
- Escalation path for complex integrations
```

---

## 9. Success Metrics & KPIs

### Onboarding Funnel

```
100% Signup                        (Day 0)
  ↓
 90% Profile Completion            (Day 0-1)
  ↓
 85% Route Configuration           (Day 1)
  ↓
 82% SKU Import                    (Day 2)
  ↓
 78% Retailer Upload               (Day 2-3)
  ↓
 75% Go-Live Activation            (Day 3)
  ↓
 72% First Order Within 72 Hours   (Day 3-6)
```

### Target Metrics

| Metric | Target | Benchmark |
|--------|--------|-----------|
| Signup to Activation Time | <72 hours | 3 days |
| Completion Rate | >80% | B2B SaaS avg: 65% |
| Support Tickets per Onboarding | <0.5 | Minimal friction |
| Time to First Order | <72 hours | Fast adoption signal |
| Onboarding NPS | ≥7.5 | Indicate good UX |

---

## Summary

**Distributor goes live via:**
1. ✅ Signup + auth (5 min)
2. ✅ Profile completion (15 min)
3. ✅ Route configuration (15 min)
4. ✅ SKU import (20 min)
5. ✅ Retailer bulk upload (30 min)
6. ✅ Preflight validation (5 min)
7. ✅ Go-live confirmation (immediate activation)

**No developer intervention. Fully self-service. Production ready.**
