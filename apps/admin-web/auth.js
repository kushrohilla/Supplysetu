/* ── SupplySetu Auth Logic ── */

// Available brands for selection during signup
const AVAILABLE_BRANDS = [
  { name: "Amul", category: "Dairy" },
  { name: "Britannia", category: "Biscuits & Bakery" },
  { name: "Prime Foods", category: "Edible Oils" },
  { name: "Local company", category: "Local Products" },
  { name: "Patanjali", category: "FMCG & Ayurveda" },
  { name: "Parle", category: "Biscuits & Snacks" },
  { name: "Dabur", category: "Health & Personal Care" },
  { name: "ITC", category: "Foods & FMCG" },
  { name: "Hindustan Unilever", category: "Home & Personal Care" },
  { name: "Marico", category: "Hair & Edible Oils" },
  { name: "Godrej", category: "Consumer Products" },
  { name: "Nestle", category: "Foods & Beverages" },
  { name: "Sifi Prakash", category: "Namkeen & Snacks" }
];

// ── State ──
let signupData = {
  type: "",
  company: "",
  owner: "",
  phone: "",
  password: "",
  brands: []
};
let currentStep = 1;

// ── DOM Refs ──
const loginCard = document.getElementById("login-card");
const signupCard = document.getElementById("signup-card");
const welcomeCard = document.getElementById("welcome-card");

// ── Particles ──
function createParticles() {
  const container = document.getElementById("particles");
  const colors = [
    "rgba(140, 59, 42, 0.5)",
    "rgba(47, 107, 58, 0.4)",
    "rgba(163, 107, 0, 0.3)",
    "rgba(50, 95, 122, 0.35)"
  ];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 6 + 3;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "%";
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.animationDuration = (Math.random() * 15 + 12) + "s";
    p.style.animationDelay = (Math.random() * 10) + "s";
    container.appendChild(p);
  }
}

// ── Auth Check ──
function checkAuth() {
  const session = localStorage.getItem("supplysetu_session");
  if (session) {
    try {
      const data = JSON.parse(session);
      if (data && data.company && data.brands && data.brands.length > 0) {
        // Already logged in => redirect to admin panel
        window.location.href = "./index.html";
        return;
      }
    } catch (_) {}
  }
}

// ── Login ──
function handleLogin(e) {
  e.preventDefault();
  const company = document.getElementById("login-company").value.trim();
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("login-error");

  if (!company) {
    showError(errorEl, "Please enter your company name.");
    return;
  }
  if (!password) {
    showError(errorEl, "Please enter your password.");
    return;
  }

  // Check if account exists in localStorage
  const accounts = JSON.parse(localStorage.getItem("supplysetu_accounts") || "[]");
  const account = accounts.find(
    (a) => a.company.toLowerCase() === company.toLowerCase()
  );

  if (!account) {
    showError(errorEl, "No account found with this company name. Please sign up first.");
    return;
  }

  if (account.password !== password) {
    showError(errorEl, "Incorrect password. Please try again.");
    return;
  }

  // Login success
  hideError(errorEl);
  const session = {
    company: account.company,
    type: account.type,
    owner: account.owner,
    phone: account.phone,
    brands: account.brands,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem("supplysetu_session", JSON.stringify(session));

  // Show welcome
  showWelcome(account.company);
}

// ── Signup Step Navigation ──
function goToStep(step) {
  currentStep = step;
  [1, 2, 3].forEach((s) => {
    const panel = document.getElementById("step-" + s);
    const dot = document.getElementById("step-dot-" + s);
    const label = document.getElementById("step-label-" + s);

    if (panel) panel.classList.toggle("active", s === step);

    if (dot) {
      dot.classList.remove("active", "done");
      if (s === step) dot.classList.add("active");
      else if (s < step) dot.classList.add("done");
    }
    if (label) {
      label.classList.toggle("active", s === step);
    }
  });

  // Step lines
  const line1 = document.getElementById("step-line-1");
  const line2 = document.getElementById("step-line-2");
  if (line1) line1.classList.toggle("done", step > 1);
  if (line2) line2.classList.toggle("done", step > 2);

  // Render step-specific content
  if (step === 2) renderBrandChips();
  if (step === 3) renderSummary();
}

// ── Step 1: Validate ──
function validateStep1() {
  const type = document.getElementById("signup-type").value;
  const company = document.getElementById("signup-company").value.trim();
  const owner = document.getElementById("signup-owner").value.trim();
  const phone = document.getElementById("signup-phone").value.trim();
  const password = document.getElementById("signup-password").value;
  const errorEl = document.getElementById("step1-error");

  if (!type) { showError(errorEl, "Please select your company type."); return false; }
  if (!company) { showError(errorEl, "Please enter your company name."); return false; }
  if (!owner) { showError(errorEl, "Please enter the owner or contact name."); return false; }
  if (!phone) { showError(errorEl, "Please enter your phone number."); return false; }
  if (!password || password.length < 4) { showError(errorEl, "Password must be at least 4 characters."); return false; }

  // Check if company already exists
  const accounts = JSON.parse(localStorage.getItem("supplysetu_accounts") || "[]");
  if (accounts.some((a) => a.company.toLowerCase() === company.toLowerCase())) {
    showError(errorEl, "An account with this company name already exists. Please sign in instead.");
    return false;
  }

  hideError(errorEl);
  signupData.type = type;
  signupData.company = company;
  signupData.owner = owner;
  signupData.phone = phone;
  signupData.password = password;
  return true;
}

// ── Step 2: Brands ──
function renderBrandChips() {
  const grid = document.getElementById("brand-chips-grid");
  grid.innerHTML = "";

  // Combine available brands with any custom ones already added
  const allBrands = [...AVAILABLE_BRANDS];
  signupData.brands.forEach((b) => {
    if (!allBrands.some((ab) => ab.name.toLowerCase() === b.toLowerCase())) {
      allBrands.push({ name: b, category: "Custom Brand" });
    }
  });

  allBrands.forEach((brand) => {
    const isSelected = signupData.brands.some(
      (b) => b.toLowerCase() === brand.name.toLowerCase()
    );
    const chip = document.createElement("div");
    chip.className = "brand-chip" + (isSelected ? " selected" : "");
    chip.innerHTML = `
      <span class="brand-chip-check">${isSelected ? "✓" : ""}</span>
      <div>
        <span class="brand-chip-name">${brand.name}</span>
        <span class="brand-chip-sub">${brand.category}</span>
      </div>
    `;
    chip.addEventListener("click", () => toggleBrand(brand.name));
    grid.appendChild(chip);
  });
}

function toggleBrand(brandName) {
  const idx = signupData.brands.findIndex(
    (b) => b.toLowerCase() === brandName.toLowerCase()
  );
  if (idx >= 0) {
    signupData.brands.splice(idx, 1);
  } else {
    signupData.brands.push(brandName);
  }
  renderBrandChips();
}

function addCustomBrand() {
  const input = document.getElementById("custom-brand");
  const name = input.value.trim();
  if (!name) return;

  // Check if already exists
  const exists =
    AVAILABLE_BRANDS.some((b) => b.name.toLowerCase() === name.toLowerCase()) ||
    signupData.brands.some((b) => b.toLowerCase() === name.toLowerCase());

  if (!exists) {
    signupData.brands.push(name);
  } else {
    // Just select it if it exists but not selected
    if (!signupData.brands.some((b) => b.toLowerCase() === name.toLowerCase())) {
      signupData.brands.push(name);
    }
  }

  input.value = "";
  renderBrandChips();
}

function validateStep2() {
  const errorEl = document.getElementById("step2-error");
  if (signupData.brands.length === 0) {
    showError(errorEl, "Please select at least one brand you deal in.");
    return false;
  }
  hideError(errorEl);
  return true;
}

// ── Step 3: Summary ──
function renderSummary() {
  const container = document.getElementById("signup-summary");
  const typeLabel = signupData.type === "distributor" ? "Distributor" : "Super Stockist (SS)";
  container.innerHTML = `
    <div class="summary-row">
      <div>
        <span class="summary-key">Company Type</span>
      </div>
      <div class="summary-value">${typeLabel}</div>
    </div>
    <div class="summary-row">
      <div>
        <span class="summary-key">Company Name</span>
      </div>
      <div class="summary-value">${signupData.company}</div>
    </div>
    <div class="summary-row">
      <div>
        <span class="summary-key">Owner / Contact</span>
      </div>
      <div class="summary-value">${signupData.owner}</div>
    </div>
    <div class="summary-row">
      <div>
        <span class="summary-key">Phone</span>
      </div>
      <div class="summary-value">${signupData.phone}</div>
    </div>
    <div class="summary-row">
      <div>
        <span class="summary-key">Brands (${signupData.brands.length})</span>
      </div>
      <div class="summary-brands">
        ${signupData.brands.map((b) => `<span class="summary-brand-pill">${b}</span>`).join("")}
      </div>
    </div>
  `;
}

// ── Create Account ──
function createAccount() {
  const accounts = JSON.parse(localStorage.getItem("supplysetu_accounts") || "[]");

  const newAccount = {
    id: "acc-" + Date.now(),
    type: signupData.type,
    company: signupData.company,
    owner: signupData.owner,
    phone: signupData.phone,
    password: signupData.password,
    brands: signupData.brands,
    createdAt: new Date().toISOString()
  };

  accounts.push(newAccount);
  localStorage.setItem("supplysetu_accounts", JSON.stringify(accounts));

  // Auto-login
  const session = {
    company: newAccount.company,
    type: newAccount.type,
    owner: newAccount.owner,
    phone: newAccount.phone,
    brands: newAccount.brands,
    loggedInAt: new Date().toISOString()
  };
  localStorage.setItem("supplysetu_session", JSON.stringify(session));

  showWelcome(newAccount.company);
}

// ── Welcome & Redirect ──
function showWelcome(companyName) {
  loginCard.style.display = "none";
  signupCard.style.display = "none";
  welcomeCard.style.display = "block";

  document.getElementById("welcome-name").textContent = "Welcome, " + companyName + "!";
  document.getElementById("welcome-msg").textContent = "Setting up your admin panel...";

  setTimeout(() => {
    window.location.href = "./index.html";
  }, 1600);
}

// ── Error Helpers ──
function showError(el, msg) {
  el.textContent = msg;
  el.classList.add("show");
}
function hideError(el) {
  el.textContent = "";
  el.classList.remove("show");
}

// ── Mode Toggle ──
function showSignupMode() {
  loginCard.style.display = "none";
  signupCard.style.display = "block";
  goToStep(1);
}

function showLoginMode() {
  signupCard.style.display = "none";
  loginCard.style.display = "block";
}

// ── Bind Events ──
function init() {
  checkAuth();
  createParticles();

  // Login form
  document.getElementById("login-form").addEventListener("submit", handleLogin);

  // Mode toggles
  document.getElementById("show-signup").addEventListener("click", (e) => {
    e.preventDefault();
    showSignupMode();
  });
  document.getElementById("show-login").addEventListener("click", (e) => {
    e.preventDefault();
    showLoginMode();
  });

  // Step 1 => Step 2
  document.getElementById("step1-next").addEventListener("click", () => {
    if (validateStep1()) goToStep(2);
  });

  // Step 2 => Step 1
  document.getElementById("step2-back").addEventListener("click", () => goToStep(1));

  // Step 2 => Step 3
  document.getElementById("step2-next").addEventListener("click", () => {
    if (validateStep2()) goToStep(3);
  });

  // Step 3 => Step 2
  document.getElementById("step3-back").addEventListener("click", () => goToStep(2));

  // Step 3 => Create
  document.getElementById("step3-create").addEventListener("click", createAccount);

  // Custom brand
  document.getElementById("add-custom-brand").addEventListener("click", addCustomBrand);
  document.getElementById("custom-brand").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomBrand();
    }
  });
}

init();
