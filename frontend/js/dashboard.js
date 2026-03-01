// OilSeed Pro - Dashboard Module

// ============== FARMER DASHBOARD FUNCTIONS ==============

// Load farmer statistics
async function loadFarmerStats() {
  try {
    const profile = await apiRequest("/profile");
    const stats = profile.stats;

    document.getElementById("totalListings").textContent =
      stats.totalListings || 0;
    document.getElementById("totalSales").textContent = stats.totalSales || 0;
    document.getElementById("totalRevenue").textContent =
      "₹" + (stats.totalRevenue || 0).toLocaleString();
  } catch (error) {
    console.error("Error loading farmer stats:", error);
  }
}

// Upload oilseed listing
async function uploadOilseed(formData) {
  return await apiRequest("/farmer/upload", {
    method: "POST",
    body: JSON.stringify(formData),
  });
}

// Load farmer's listings
async function loadRecentListings() {
  try {
    const listings = await apiRequest("/farmer/my-listings");
    const tbody = document.querySelector("#recentListingsTable tbody");

    if (!listings || listings.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">No listings yet</td></tr>';
      return;
    }

    // Show only recent 5
    const recent = listings.slice(0, 5);
    tbody.innerHTML = recent
      .map(
        (item) => `
      <tr>
        <td>${item.oilseed_type}</td>
        <td>${item.quantity} q</td>
        <td>₹${item.expected_price}</td>
        <td><span class="badge ${item.status === "available" ? "badge-success" : "badge-warning"}">${item.status}</span></td>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading listings:", error);
  }
}

// Load all listings
async function loadAllListings() {
  try {
    const listings = await apiRequest("/farmer/my-listings");
    const tbody = document.querySelector("#allListingsTable tbody");

    if (!listings || listings.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">No listings yet</td></tr>';
      return;
    }

    tbody.innerHTML = listings
      .map(
        (item) => `
      <tr>
        <td>${item.oilseed_type}</td>
        <td>${item.quantity} q</td>
        <td>₹${item.expected_price}</td>
        <td>${item.grade}</td>
        <td><span class="badge ${item.status === "available" ? "badge-success" : "badge-warning"}">${item.status}</span></td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editListing('${item.id}')">
            <i class="fas fa-edit"></i>
          </button>
        </td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading all listings:", error);
  }
}

// Load sales history
async function loadSalesHistory() {
  try {
    const sales = await apiRequest("/farmer/sales-history");
    const tbody = document.querySelector("#salesTable tbody");

    if (!sales || sales.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No sales yet</td></tr>';
      return;
    }

    tbody.innerHTML = sales
      .map(
        (item) => `
      <tr>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
        <td>${item.raw_oilseeds?.oilseed_type || "N/A"}</td>
        <td>${item.quantity} q</td>
        <td>₹${item.price}</td>
        <td>₹${item.total_amount?.toLocaleString()}</td>
        <td>${item.buyer?.full_name || "N/A"}</td>
        <td><span class="badge badge-success">Completed</span></td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading sales history:", error);
  }
}

// ============== PROCESSOR DASHBOARD FUNCTIONS ==============

// Load processor statistics
async function loadProcessorStats() {
  try {
    const profile = await apiRequest("/profile");
    const stats = profile.stats;

    document.getElementById("totalByproducts").textContent =
      stats.totalByproducts || 0;
    document.getElementById("totalPurchases").textContent =
      stats.totalPurchases || 0;
    document.getElementById("purchaseValue").textContent =
      "₹" + (stats.purchaseValue || 0).toLocaleString();
    document.getElementById("salesValue").textContent =
      "₹" + (stats.salesValue || 0).toLocaleString();
  } catch (error) {
    console.error("Error loading processor stats:", error);
  }
}

// Upload by-product
async function uploadByproduct(formData) {
  return await apiRequest("/processor/upload-byproduct", {
    method: "POST",
    body: JSON.stringify(formData),
  });
}

// Load available oilseeds
async function loadAvailableOilseeds() {
  try {
    const oilseeds = await apiRequest("/processor/available-oilseeds");

    // Store for reference
    localStorage.setItem("availableOilseeds", JSON.stringify(oilseeds));

    // Update table
    const tbody = document.querySelector("#availableOilseedsTable tbody");
    if (tbody) {
      if (!oilseeds || oilseeds.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align: center;">No oilseeds available</td></tr>';
      } else {
        const recent = oilseeds.slice(0, 5);
        tbody.innerHTML = recent
          .map(
            (item) => `
          <tr>
            <td>${item.oilseed_type}</td>
            <td>${item.quantity} q</td>
            <td>₹${item.expected_price}</td>
            <td><button class="btn btn-primary btn-sm" onclick="buyOilseed('${item.id}', ${item.quantity}, ${item.expected_price})">Buy</button></td>
          </tr>
        `,
          )
          .join("");
      }
    }

    // Update product grid
    const productGrid = document.getElementById("oilseedProducts");
    if (productGrid) {
      if (!oilseeds || oilseeds.length === 0) {
        productGrid.innerHTML =
          '<p style="text-align: center; grid-column: 1/-1;">No oilseeds available</p>';
      } else {
        productGrid.innerHTML = oilseeds
          .map(
            (item) => `
          <div class="product-card">
            <div class="product-image">🌱</div>
            <div class="product-content">
              <h4 class="product-title">${item.oilseed_type}</h4>
              <div class="product-meta">
                <span class="product-meta-item">${item.quantity} q</span>
                <span class="product-meta-item">Grade ${item.grade}</span>
              </div>
              <div class="product-price">₹${item.expected_price}/q</div>
              <p style="font-size: 0.875rem; color: var(--gray); margin-bottom: 0.5rem;">
                <i class="fas fa-user"></i> ${item.farmer?.full_name || "Unknown"}
              </p>
              <p style="font-size: 0.875rem; color: var(--gray); margin-bottom: 1rem;">
                <i class="fas fa-map-marker-alt"></i> ${item.farmer?.location || "Unknown"}
              </p>
              <button class="btn btn-primary" style="width: 100%;" onclick="buyOilseed('${item.id}', ${item.quantity}, ${item.expected_price})">
                <i class="fas fa-shopping-cart"></i> Purchase
              </button>
            </div>
          </div>
        `,
          )
          .join("");
      }
    }
  } catch (error) {
    console.error("Error loading available oilseeds:", error);
  }
}

// Load processor's by-products
async function loadMyByproducts() {
  try {
    const byproducts = await apiRequest("/processor/my-byproducts");

    // Update table
    const tbody = document.querySelector("#myByproductsTable tbody");
    if (tbody) {
      if (!byproducts || byproducts.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="4" style="text-align: center;">No by-products listed</td></tr>';
      } else {
        const recent = byproducts.slice(0, 5);
        tbody.innerHTML = recent
          .map(
            (item) => `
          <tr>
            <td>${item.product_type}</td>
            <td>${item.quantity} kg</td>
            <td>₹${item.price}</td>
            <td><span class="badge ${item.status === "available" ? "badge-success" : "badge-warning"}">${item.status}</span></td>
          </tr>
        `,
          )
          .join("");
      }
    }

    // Update inventory table
    const invTbody = document.querySelector("#inventoryTable tbody");
    if (invTbody) {
      if (!byproducts || byproducts.length === 0) {
        invTbody.innerHTML =
          '<tr><td colspan="7" style="text-align: center;">No by-products listed</td></tr>';
      } else {
        invTbody.innerHTML = byproducts
          .map(
            (item) => `
          <tr>
            <td>${item.product_type}</td>
            <td>${item.source_oilseed}</td>
            <td>${item.quantity} kg</td>
            <td>₹${item.price}</td>
            <td>${item.batch_number}</td>
            <td><span class="badge ${item.status === "available" ? "badge-success" : "badge-warning"}">${item.status}</span></td>
            <td>
              <button class="btn btn-sm btn-outline" onclick="editByproduct('${item.id}')">
                <i class="fas fa-edit"></i>
              </button>
            </td>
          </tr>
        `,
          )
          .join("");
      }
    }
  } catch (error) {
    console.error("Error loading by-products:", error);
  }
}

// Load purchase history
async function loadPurchaseHistory() {
  try {
    const purchases = await apiRequest("/processor/purchase-history");
    const tbody = document.querySelector("#purchaseHistoryTable tbody");

    if (!tbody) return;

    if (!purchases || purchases.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No purchases yet</td></tr>';
      return;
    }

    tbody.innerHTML = purchases
      .map(
        (item) => `
      <tr>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
        <td>${item.raw_oilseeds?.oilseed_type || "N/A"}</td>
        <td>${item.quantity} q</td>
        <td>₹${item.price}</td>
        <td>₹${item.total_amount?.toLocaleString()}</td>
        <td>${item.seller?.full_name || "N/A"}</td>
        <td><span class="badge badge-success">Completed</span></td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading purchase history:", error);
  }
}

// Load by-product sales history
async function loadByproductSalesHistory() {
  try {
    const profile = await apiRequest("/profile");
    const transactions = profile.transactions;

    const tbody = document.querySelector("#salesHistoryTable tbody");
    if (!tbody) return;

    if (
      !transactions ||
      !transactions.sales ||
      transactions.sales.length === 0
    ) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No sales yet</td></tr>';
      return;
    }

    tbody.innerHTML = transactions.sales
      .map(
        (item) => `
      <tr>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
        <td>${item.byproducts?.product_type || "N/A"}</td>
        <td>${item.quantity} kg</td>
        <td>₹${item.price}</td>
        <td>₹${item.total_amount?.toLocaleString()}</td>
        <td>${item.buyer?.full_name || "N/A"}</td>
        <td><span class="badge badge-success">Completed</span></td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading sales history:", error);
  }
}

// ============== BUYER DASHBOARD FUNCTIONS ==============

// Load available by-products
async function loadAvailableByproducts(filterType = "") {
  try {
    const byproducts = await apiRequest("/buyer/available-byproducts");

    // Store for reference
    localStorage.setItem("availableByproducts", JSON.stringify(byproducts));

    const productGrid = document.getElementById("productsGrid");
    if (!productGrid) return;

    let filtered = byproducts;
    if (filterType) {
      filtered = byproducts.filter((p) => p.product_type === filterType);
    }

    if (!filtered || filtered.length === 0) {
      productGrid.innerHTML =
        '<p style="text-align: center; grid-column: 1/-1;">No products available</p>';
      return;
    }

    productGrid.innerHTML = filtered
      .map(
        (item) => `
      <div class="product-card">
        <div class="product-image">📦</div>
        <div class="product-content">
          <h4 class="product-title">${item.product_type}</h4>
          <div class="product-meta">
            <span class="product-meta-item">${item.source_oilseed}</span>
            <span class="product-meta-item">${item.quantity} kg</span>
          </div>
          <div class="product-price">₹${item.price}/kg</div>
          <p style="font-size: 0.875rem; color: var(--gray); margin-bottom: 0.5rem;">
            ${item.nutrition_content || "Standard grade"}
          </p>
          <p style="font-size: 0.875rem; color: var(--gray); margin-bottom: 1rem;">
            <i class="fas fa-industry"></i> ${item.processor?.company_name || item.processor?.full_name || "Unknown"}
          </p>
          <div class="product-actions">
            <button class="btn btn-primary" style="flex: 1;" onclick="openBuyModal('${item.id}')">
              <i class="fas fa-shopping-cart"></i> Buy
            </button>
            <button class="btn btn-outline" onclick="addToCompare('${item.id}')">
              <i class="fas fa-balance-scale"></i>
            </button>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading by-products:", error);
  }
}

// Buy by-product
async function buyByproduct(byproductId, quantity) {
  try {
    const result = await apiRequest("/buyer/buy-byproduct", {
      method: "POST",
      body: JSON.stringify({
        byproductId,
        quantity: parseFloat(quantity),
      }),
    });

    alert(result?.message || "Purchase successful!");
    return result;
  } catch (error) {
    alert("Purchase failed: " + error.message);
    throw error;
  }
}
// Load buyer's purchase history
async function loadPurchaseHistory() {
  try {
    const purchases = await apiRequest("/buyer/purchase-history");
    const tbody = document.querySelector("#ordersTable tbody");

    if (!tbody) return;

    if (!purchases || purchases.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No orders yet</td></tr>';
      return;
    }

    tbody.innerHTML = purchases
      .map(
        (item, index) => `
      <tr>
        <td>ORD-${String(index + 1).padStart(4, "0")}</td>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
        <td>${item.byproducts?.product_type || "N/A"}</td>
        <td>${item.quantity} kg</td>
        <td>₹${item.total_amount?.toLocaleString()}</td>
        <td>${item.seller?.company_name || item.seller?.full_name || "N/A"}</td>
        <td><span class="badge badge-success">Completed</span></td>
      </tr>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading purchase history:", error);
  }
}

// Load export opportunities
async function loadExportOpportunities() {
  try {
    const opportunities = await apiRequest("/market/export-opportunities");
    const container = document.getElementById("exportOpportunities");

    if (!container) return;

    container.innerHTML = opportunities
      .map(
        (opp) => `
      <div class="product-card">
        <div class="product-image">🌍</div>
        <div class="product-content">
          <h4 class="product-title">${opp.product} Export</h4>
          <div class="product-meta">
            <span class="product-meta-item">${opp.targetMarket}</span>
            <span class="product-meta-item">${opp.demandVolume}</span>
          </div>
          <div class="product-price">${opp.priceRange}</div>
          <p style="font-size: 0.875rem; color: var(--gray); margin-bottom: 0.5rem;">
            ${opp.requirements}
          </p>
          <p style="font-size: 0.875rem; color: var(--danger); margin-bottom: 1rem;">
            <i class="fas fa-clock"></i> Deadline: ${new Date(opp.deadline).toLocaleDateString()}
          </p>
          <button class="btn btn-primary" style="width: 100%;" onclick="expressInterest('${opp.id}')">
            Express Interest
          </button>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading export opportunities:", error);
  }
}

// Express interest in export
function expressInterest(oppId) {
  alert(
    "Thank you for your interest! Our export team will contact you shortly.",
  );
}

// ============== PROFILE FUNCTIONS ==============

// Get profile
async function getProfile() {
  return await apiRequest("/profile");
}

// Update profile
async function updateProfile(formData) {
  return await apiRequest("/profile/update", {
    method: "PUT",
    body: JSON.stringify(formData),
  });
}

// Get transaction history
async function getTransactionHistory() {
  return await apiRequest("/profile/transactions");
}

// Get upload history
async function getUploadHistory() {
  return await apiRequest("/profile/uploads");
}

// Edit listing (placeholder)
function editListing(id) {
  alert("Edit functionality coming soon!");
}

// Edit byproduct (placeholder)
function editByproduct(id) {
  alert("Edit functionality coming soon!");
}
