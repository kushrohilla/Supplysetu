// Load brands from session
const sessionData = JSON.parse(localStorage.getItem("supplysetu_session") || "{}");
const sessionBrands = sessionData.brands || ["Amul", "Britannia", "Local company", "Prime Foods"];
const brands = ["All brands", ...sessionBrands];

const globalCatalogue = {
  Amul: [
    { id: "gp-101", name: "Amul Gold Milk", packSize: "500 ml", description: "Toned milk pack", mrp: 33, suggestedMin: 30, suggestedMax: 31, image: "https://cdn.supplysetu.local/amul-gold.jpg" },
    { id: "gp-102", name: "Amul Buttermilk", packSize: "200 ml", description: "Chilled buttermilk", mrp: 15, suggestedMin: 13.5, suggestedMax: 14.2, image: "https://cdn.supplysetu.local/amul-buttermilk.jpg" }
  ],
  Britannia: [
    { id: "gp-201", name: "Britannia Marie Gold", packSize: "120 g", description: "Tea biscuit pack", mrp: 12, suggestedMin: 10.2, suggestedMax: 10.8, image: "https://cdn.supplysetu.local/brit-marie.jpg" },
    { id: "gp-202", name: "Britannia Good Day", packSize: "100 g", description: "Cookie pack", mrp: 20, suggestedMin: 17.6, suggestedMax: 18.5, image: "https://cdn.supplysetu.local/brit-goodday.jpg" }
  ],
  "Local company": [
    { id: "gp-301", name: "Fresh Chakki Atta", packSize: "5 kg", description: "Whole wheat flour", mrp: 245, suggestedMin: 221, suggestedMax: 228, image: "https://cdn.supplysetu.local/atta.jpg" }
  ],
  "Prime Foods": [
    { id: "gp-401", name: "Prime Oil Pouch", packSize: "1 L", description: "Refined oil", mrp: 162, suggestedMin: 149, suggestedMax: 154, image: "https://cdn.supplysetu.local/oil.jpg" }
  ],
  Patanjali: [
    { id: "gp-501", name: "Patanjali Ghee", packSize: "500 ml", description: "Pure cow ghee", mrp: 280, suggestedMin: 255, suggestedMax: 265, image: "" },
    { id: "gp-502", name: "Patanjali Honey", packSize: "250 g", description: "Natural honey", mrp: 120, suggestedMin: 108, suggestedMax: 112, image: "" }
  ],
  Parle: [
    { id: "gp-601", name: "Parle-G Biscuit", packSize: "80 g", description: "Glucose biscuit", mrp: 10, suggestedMin: 8.5, suggestedMax: 9.2, image: "" }
  ],
  Dabur: [
    { id: "gp-701", name: "Dabur Chyawanprash", packSize: "500 g", description: "Immunity booster", mrp: 195, suggestedMin: 176, suggestedMax: 182, image: "" }
  ],
  ITC: [
    { id: "gp-801", name: "Aashirvaad Atta", packSize: "5 kg", description: "Whole wheat atta", mrp: 265, suggestedMin: 238, suggestedMax: 248, image: "" }
  ],
  "Hindustan Unilever": [
    { id: "gp-901", name: "Surf Excel Quick Wash", packSize: "1 kg", description: "Detergent powder", mrp: 110, suggestedMin: 99, suggestedMax: 103, image: "" }
  ],
  Marico: [
    { id: "gp-1001", name: "Parachute Coconut Oil", packSize: "200 ml", description: "Coconut oil", mrp: 60, suggestedMin: 54, suggestedMax: 56.5, image: "" }
  ],
  Godrej: [
    { id: "gp-1101", name: "Godrej No.1 Soap", packSize: "4x100 g", description: "Bathing soap", mrp: 99, suggestedMin: 88, suggestedMax: 92, image: "" }
  ],
  Nestle: [
    { id: "gp-1201", name: "Maggi 2-Minute Noodles", packSize: "70 g", description: "Instant noodles", mrp: 14, suggestedMin: 12, suggestedMax: 13, image: "" }
  ],
  "Sifi Prakash": [
    { id: "gp-1301", name: "Sifi Prakash Aloo Bhujia", packSize: "200 g", description: "Namkeen snack", mrp: 40, suggestedMin: 35, suggestedMax: 37, image: "" }
  ]
};

// Backend API configuration
const API_BASE = "http://localhost:3000/api/v1/admin";

// Filter initial demo products to only include those from session brands
let products = [];
let totalProductsCount = 0;
let totalPagesCount = 1;

async function fetchProducts() {
  try {
    const brandQ = state.brand === "All brands" ? "all" : state.brand;
    const res = await fetch(`${API_BASE}/products?page=${state.page}&page_size=${state.pageSize}&search=${encodeURIComponent(state.search)}&brand_name=${encodeURIComponent(brandQ)}&status=${state.status}`);
    const body = await res.json();
    if (body.success) {
      products = body.data.items.map(p => ({
        id: p.id,
        sku: p.sku_code,
        name: p.product_name,
        brand: p.brand_name,
        packSize: p.pack_size,
        basePrice: p.base_price,
        advancePrice: p.advance_price,
        schemeText: p.active_scheme ? p.active_scheme.text : "",
        schemeStart: p.active_scheme ? p.active_scheme.start_date || "" : "",
        schemeEnd: p.active_scheme ? p.active_scheme.end_date || "" : "",
        stockQty: p.stock_snapshot.qty,
        status: p.status,
        globalProductId: p.global_product_id
      }));
      totalProductsCount = body.data.pagination.total_items;
      totalPagesCount = body.data.pagination.total_pages;
      
      // Additional filter for frontend UI if sessionBrands restrict it strictly
      products = products.filter(p => sessionBrands.some(b => b.toLowerCase() === p.brand.toLowerCase()));
      
      renderKpis();
      renderTableUI();
    }
  } catch (err) {
    console.warn("Backend not reachable. Falling back to mock data.", err);
    if (products.length === 0) {
      // Generate some mock products from the globalCatalogue for the session brands
      sessionBrands.forEach((brand) => {
        (globalCatalogue[brand] || []).forEach((source, index) => {
          products.push({
            id: `tp-mock-${brand}-${index}`,
            sku: `${brand.slice(0, 4).toUpperCase()}-${source.name.replace(/\s+/g, "").slice(0,8).toUpperCase()}-${100+index}`,
            name: source.name,
            brand: brand,
            packSize: source.packSize,
            basePrice: source.mrp * 0.8,
            advancePrice: source.mrp * 0.75,
            schemeText: index % 2 === 0 ? "5% off on 10 pcs" : "",
            schemeStart: "",
            schemeEnd: "",
            stockQty: Math.floor(Math.random() * 100) + 10,
            status: index % 3 === 0 ? "inactive" : "active",
            globalProductId: source.id
          });
        });
      });
      totalProductsCount = products.length;
      totalPagesCount = 1;
    }
    renderKpis();
    renderTableUI();
  }
}

const state = {
  page: 1,
  pageSize: 10,
  search: "",
  brand: "All brands",
  status: "all",
  importRows: [],
  importErrors: []
};

const dom = {
  searchInput: document.getElementById("search-input"),
  brandFilter: document.getElementById("brand-filter"),
  statusFilter: document.getElementById("status-filter"),
  tbody: document.getElementById("product-tbody"),
  tableCount: document.getElementById("table-count"),
  pageLabel: document.getElementById("page-label"),
  prevPage: document.getElementById("prev-page"),
  nextPage: document.getElementById("next-page"),
  kpiGrid: document.getElementById("kpi-grid"),
  addDrawer: document.getElementById("add-drawer"),
  importDrawer: document.getElementById("import-drawer"),
  catalogueDrawer: document.getElementById("catalogue-drawer"),
  quickDrawer: document.getElementById("quick-drawer"),
  addForm: document.getElementById("add-form"),
  quickForm: document.getElementById("quick-form"),
  importFile: document.getElementById("import-file"),
  importPreview: document.getElementById("import-preview"),
  importErrors: document.getElementById("import-errors"),
  confirmImportBtn: document.getElementById("confirm-import"),
  catalogueBrand: document.getElementById("catalogue-brand"),
  catalogueGrid: document.getElementById("catalogue-grid")
};

function badgeTone(value, type) {
  if (type === "stock") {
    if (value >= 100) return "good";
    if (value >= 35) return "warn";
    return "risk";
  }
  if (type === "status") return value === "active" ? "good" : "neutral";
  if (type === "performance") {
    if (value === "fast_moving") return "good";
    if (value === "slow_moving") return "warn";
    return "neutral";
  }
  return "neutral";
}

function getPerformanceBand(product) {
  if (product.status !== "active") return "inactive";
  if (product.stockQty >= 120) return "fast_moving";
  if (product.stockQty >= 35) return "slow_moving";
  return "inactive";
}

function fillSelect(selectEl, values) {
  selectEl.innerHTML = "";
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function renderBrandOptions() {
  const scopedBrands = brands.filter((brand) => brand !== "All brands");
  fillSelect(dom.brandFilter, brands);
  fillSelect(dom.catalogueBrand, scopedBrands);
  fillSelect(dom.addForm.elements.brand, scopedBrands);
}

function filteredProducts() {
  return products.filter((item) => {
    const matchesSearch = [item.name, item.brand, item.sku].join(" ").toLowerCase().includes(state.search.toLowerCase());
    const matchesBrand = state.brand === "All brands" || item.brand === state.brand;
    const matchesStatus = state.status === "all" || item.status === state.status;
    return matchesSearch && matchesBrand && matchesStatus;
  });
}

function renderKpis() {
  const activeCount = products.filter((item) => item.status === "active").length;
  const inactiveCount = products.length - activeCount;
  const schemeCount = products.filter((item) => item.schemeText).length;
  const fastCount = products.filter((item) => getPerformanceBand(item) === "fast_moving").length;
  dom.kpiGrid.innerHTML = [
    ["Active SKUs", activeCount, "Ready for retailer ordering"],
    ["Inactive SKUs", inactiveCount, "Temporarily unavailable"],
    ["Scheme linked", schemeCount, "Pricing strategy in motion"],
    ["Fast moving", fastCount, "Priority replenishment list"]
  ].map((kpi) => `<article class="metric-card"><dl><dt>${kpi[0]}</dt><dd>${kpi[1]}</dd></dl><p class="metric-trend">${kpi[2]}</p></article>`).join("");
}

function renderTableUI() {
  const data = products;
  
  dom.tbody.innerHTML = data.map((item) => {
    const schemeBadge = item.schemeText ? `<span class="badge warn">${item.schemeText}</span>` : `<span class="badge neutral">No scheme</span>`;
    const stockBadge = `<span class="badge ${badgeTone(item.stockQty, "stock")}">${item.stockQty} qty</span>`;
    const statusBadge = `<span class="badge ${badgeTone(item.status, "status")}">${item.status}</span>`;
    const performance = `<span class="badge ${badgeTone(getPerformanceBand(item), "performance")}">${getPerformanceBand(item).replace("_", " ")}</span>`;
    return `
      <tr>
        <td><strong>${item.name}</strong><div>${item.sku}</div></td>
        <td>${item.brand}</td>
        <td>${item.packSize}</td>
        <td>Rs ${item.basePrice.toFixed(2)}</td>
        <td>Rs ${item.advancePrice.toFixed(2)}</td>
        <td>${schemeBadge} ${performance}</td>
        <td>${stockBadge}</td>
        <td><button class="icon-btn" data-toggle="${item.id}">${statusBadge}</button></td>
        <td><button class="icon-btn" data-quick="${item.id}">Edit</button></td>
      </tr>
    `;
  }).join("");

  dom.tableCount.textContent = `${totalProductsCount} products visible`;
  dom.pageLabel.textContent = `Page ${state.page} of ${totalPagesCount}`;
  dom.prevPage.disabled = state.page <= 1;
  dom.nextPage.disabled = state.page >= totalPagesCount;
}

function renderTable() {
  fetchProducts(); // Triggers API call, which then calls renderTableUI
}

function openDrawer(id) {
  document.getElementById(id).hidden = false;
}

function closeDrawer(id) {
  document.getElementById(id).hidden = true;
}

function closeAllDrawers() {
  [dom.addDrawer, dom.importDrawer, dom.catalogueDrawer, dom.quickDrawer].forEach((drawer) => {
    drawer.hidden = true;
  });
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line, index) => {
    const values = line.split(",").map((v) => v.trim());
    const row = { rowNo: index + 2 };
    headers.forEach((header, i) => {
      row[header] = values[i] || "";
    });
    return row;
  });
}

function validateImportRows(rows) {
  const errors = [];
  const seenKeys = new Set();
  rows.forEach((row) => {
    const rowErrors = [];
    const identity = `${row.brand}|${row.product_name}|${row.pack_size}`.toLowerCase();
    if (seenKeys.has(identity)) rowErrors.push("DUPLICATE_SKU");
    seenKeys.add(identity);
    if (!row.brand) rowErrors.push("MISSING_BRAND");
    if (!row.product_name) rowErrors.push("MISSING_PRODUCT_NAME");
    if (!row.pack_size) rowErrors.push("MISSING_PACK_SIZE");
    if (!row.base_price) rowErrors.push("MISSING_BASE_PRICE");
    if (row.base_price && Number.isNaN(Number(row.base_price))) rowErrors.push("INVALID_PRICE_FORMAT");
    if (row.advance_price && Number.isNaN(Number(row.advance_price))) rowErrors.push("INVALID_ADVANCE_PRICE");
    if (row.advance_price && !Number.isNaN(Number(row.advance_price)) && Number(row.base_price) < Number(row.advance_price)) {
      rowErrors.push("INVALID_ADVANCE_PRICE");
    }
    if (rowErrors.length) errors.push({ rowNo: row.rowNo, rowErrors });
  });
  return errors;
}

function renderImportPanels() {
  dom.importPreview.innerHTML = state.importRows.map((row) => `<tr><td>#${row.rowNo}</td><td>${row.brand || "-"}</td><td>${row.product_name || "-"}</td><td>${row.pack_size || "-"}</td><td>${row.base_price || "-"}</td><td>${row.advance_price || "-"}</td></tr>`).join("");
  dom.importErrors.innerHTML = state.importErrors.length
    ? state.importErrors.map((error) => `<tr><td>#${error.rowNo}</td><td>${error.rowErrors.join(", ")}</td></tr>`).join("")
    : `<tr><td>No errors</td><td>Ready to import</td></tr>`;
  dom.confirmImportBtn.disabled = !state.importRows.length || state.importErrors.length > 0;
}

function renderCatalogueGrid() {
  const brand = dom.catalogueBrand.value;
  const items = globalCatalogue[brand] || [];
  dom.catalogueGrid.innerHTML = items.map((item) => `
    <article class="catalogue-item">
      <div class="row"><input type="checkbox" data-catalogue-id="${item.id}" /><strong>${item.name}</strong></div>
      <p>${item.packSize} | MRP Rs ${item.mrp}</p>
      <p>${item.description}</p>
      <p>Suggested band: Rs ${item.suggestedMin} to ${item.suggestedMax}</p>
      <label>Base Price<input type="number" data-base="${item.id}" min="0.01" step="0.01" value="${item.suggestedMax}" /></label>
      <label>Advance Price<input type="number" data-advance="${item.id}" min="0.01" step="0.01" value="${item.suggestedMin}" /></label>
      <label>Scheme<input data-scheme="${item.id}" placeholder="Optional scheme" /></label>
    </article>
  `).join("");
}

function addFromCatalogue() {
  const selected = [...dom.catalogueGrid.querySelectorAll("input[data-catalogue-id]:checked")];
  if (!selected.length) {
    window.alert("Select at least one product from catalogue");
    return;
  }

  selected.forEach((checkbox) => {
    const id = checkbox.getAttribute("data-catalogue-id");
    const brand = dom.catalogueBrand.value;
    const source = (globalCatalogue[brand] || []).find((item) => item.id === id);
    if (!source) return;
    const basePrice = Number(dom.catalogueGrid.querySelector(`input[data-base="${id}"]`).value);
    const advancePrice = Number(dom.catalogueGrid.querySelector(`input[data-advance="${id}"]`).value);
    const scheme = dom.catalogueGrid.querySelector(`input[data-scheme="${id}"]`).value;
    products.unshift({
      id: `tp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sku: `${brand.slice(0, 4).toUpperCase()}-${source.name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)}-${Math.floor(Math.random() * 90 + 10)}`,
      name: source.name,
      brand,
      packSize: source.packSize,
      basePrice,
      advancePrice,
      schemeText: scheme,
      schemeStart: "",
      schemeEnd: "",
      stockQty: Math.floor(Math.random() * 70 + 20),
      status: "active",
      globalProductId: source.id
    });
  });

  renderKpis();
  renderTable();
  closeDrawer("catalogue-drawer");
}

function openQuickEdit(productId) {
  const product = products.find((item) => item.id === productId);
  if (!product) return;
  dom.quickForm.elements.id.value = product.id;
  dom.quickForm.elements.advancePrice.value = String(product.advancePrice);
  dom.quickForm.elements.schemeText.value = product.schemeText;
  dom.quickForm.elements.schemeStart.value = product.schemeStart;
  dom.quickForm.elements.schemeEnd.value = product.schemeEnd;
  openDrawer("quick-drawer");
}

function bindEvents() {
  dom.searchInput.addEventListener("input", (event) => {
    state.search = event.target.value;
    state.page = 1;
    renderTable();
  });

  dom.brandFilter.addEventListener("change", (event) => {
    state.brand = event.target.value;
    state.page = 1;
    renderTable();
  });

  dom.statusFilter.addEventListener("change", (event) => {
    state.status = event.target.value;
    state.page = 1;
    renderTable();
  });

  dom.prevPage.addEventListener("click", () => {
    state.page = Math.max(1, state.page - 1);
    renderTable();
  });

  dom.nextPage.addEventListener("click", () => {
    state.page += 1;
    renderTable();
  });

  document.getElementById("add-product-btn").addEventListener("click", () => openDrawer("add-drawer"));
  document.getElementById("import-btn").addEventListener("click", () => openDrawer("import-drawer"));
  document.getElementById("catalogue-btn").addEventListener("click", () => openDrawer("catalogue-drawer"));
  document.getElementById("scheme-manager-btn").addEventListener("click", () => window.alert("Scheme manager shortcut: integrate with /admin/schemes module."));

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => closeDrawer(button.getAttribute("data-close")));
  });

  [dom.addDrawer, dom.importDrawer, dom.catalogueDrawer, dom.quickDrawer].forEach((drawer) => {
    drawer.addEventListener("click", (event) => {
      if (event.target === drawer) closeAllDrawers();
    });
  });

  dom.addForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitter = event.submitter;
    const mode = submitter ? submitter.value : "save";
    const formData = new FormData(dom.addForm);

    const basePrice = Number(formData.get("basePrice"));
    const advancePriceRaw = formData.get("advancePrice");
    const advancePrice = advancePriceRaw ? Number(advancePriceRaw) : basePrice;
    if (advancePrice > basePrice) {
      window.alert("Advance price must be less than or equal to base price");
      return;
    }

    try {
      const payload = {
        sku_code: String(formData.get("skuCode")),
        product_name: String(formData.get("productName")),
        brand_name: String(formData.get("brand")),
        pack_size: String(formData.get("packSize")),
        base_price: basePrice,
        advance_price: advancePrice,
        scheme_text: String(formData.get("schemeText") || ""),
        opening_stock_snapshot: Number(formData.get("openingStock") || 0)
      };

      const res = await fetch(`${API_BASE}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      
      if (!body.success) {
        window.alert(`Error saving product: ${body.message || 'Validation failed'}`);
        return;
      }

      await fetchProducts();

      if (mode === "save-next") {
        dom.addForm.reset();
        dom.addForm.elements.brand.value = payload.brand_name;
      } else {
        closeDrawer("add-drawer");
        dom.addForm.reset();
      }
    } catch (err) {
      window.alert("Network error: " + err.message);
    }
  });

  dom.importFile.addEventListener("change", async () => {
    const file = dom.importFile.files[0];
    if (!file) return;
    const text = await file.text();
    state.importRows = parseCsv(text);
    state.importErrors = [];
    renderImportPanels();
  });

  document.getElementById("validate-import").addEventListener("click", () => {
    state.importErrors = validateImportRows(state.importRows);
    renderImportPanels();
  });

  dom.confirmImportBtn.addEventListener("click", () => {
    const validRows = state.importRows.filter((row) => !state.importErrors.some((error) => error.rowNo === row.rowNo));
    validRows.forEach((row) => {
      products.push({
        id: `tp-${Date.now()}-${row.rowNo}`,
        sku: row.sku_code || `SKU-${row.rowNo}`,
        name: row.product_name,
        brand: row.brand,
        packSize: row.pack_size,
        basePrice: Number(row.base_price),
        advancePrice: Number(row.advance_price || row.base_price),
        schemeText: row.scheme_text || "",
        schemeStart: "",
        schemeEnd: "",
        stockQty: Number(row.opening_stock || 0),
        status: "active",
        globalProductId: ""
      });
    });

    renderKpis();
    renderTable();
    window.alert(`Imported ${validRows.length} products successfully`);
    state.importRows = [];
    state.importErrors = [];
    dom.importPreview.innerHTML = "";
    dom.importErrors.innerHTML = "";
    dom.confirmImportBtn.disabled = true;
    closeDrawer("import-drawer");
  });

  document.getElementById("fetch-catalogue").addEventListener("click", renderCatalogueGrid);
  document.getElementById("add-selected-catalogue").addEventListener("click", addFromCatalogue);

  dom.quickForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = dom.quickForm.elements.id.value;
    const product = products.find((item) => item.id === id);
    if (!product) return;

    const nextAdvance = Number(dom.quickForm.elements.advancePrice.value);
    if (Number.isNaN(nextAdvance) || nextAdvance <= 0) {
      window.alert("Advance price must be valid and greater than zero");
      return;
    }

    if (nextAdvance > product.basePrice) {
      window.alert("Advance price cannot exceed base price");
      return;
    }

    const start = dom.quickForm.elements.schemeStart.value;
    const end = dom.quickForm.elements.schemeEnd.value;
    if (start && end && start > end) {
      window.alert("Scheme start date must be before end date");
      return;
    }

    const saveButton = dom.quickForm.querySelector("button[type='submit']");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      const payload = {
        advance_price: nextAdvance,
        scheme_text: dom.quickForm.elements.schemeText.value,
        scheme_start_date: start || null,
        scheme_end_date: end || null
      };

      const res = await fetch(`${API_BASE}/products/${id}/pricing`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = await res.json();
      
      if (!body.success) {
        window.alert(`Error updating product pricing: ${body.message || 'Validation failed'}`);
      } else {
        await fetchProducts();
        closeDrawer("quick-drawer");
      }
    } catch (err) {
      window.alert("Network error: " + err.message);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save Changes";
    }
  });

  dom.tbody.addEventListener("click", async (event) => {
    const toggleButton = event.target.closest("button[data-toggle]");
    const quickButton = event.target.closest("button[data-quick]");

    if (toggleButton) {
      const id = toggleButton.getAttribute("data-toggle");
      const product = products.find((item) => item.id === id);
      if (!product) return;
      
      const newStatus = product.status === "active" ? "inactive" : "active";
      toggleButton.disabled = true;
      try {
        const res = await fetch(`${API_BASE}/products/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
        const body = await res.json();
        
        if (!body.success) {
          window.alert(`Error toggling status: ${body.message}`);
        } else {
          await fetchProducts();
        }
      } catch (err) {
        window.alert("Network error: " + err.message);
      } finally {
        toggleButton.disabled = false;
      }
      return;
    }

    if (quickButton) {
      openQuickEdit(quickButton.getAttribute("data-quick"));
    }
  });
}

function bootstrap() {
  renderBrandOptions();
  dom.brandFilter.value = "All brands";
  dom.catalogueBrand.value = "Amul";
  dom.addForm.elements.brand.value = "Amul";
  renderCatalogueGrid();
  renderKpis();
  renderTable();
  bindEvents();
}

bootstrap();




