// OilSeed Pro - Main JavaScript

// Mobile menu toggle
document.addEventListener("DOMContentLoaded", () => {
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      navLinks.style.display =
        navLinks.style.display === "flex" ? "none" : "flex";
    });
  }

  // Update navigation based on auth status
  updateNavigation();
});

// Update navigation based on authentication
function updateNavigation() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const navLinks = document.querySelector(".nav-links");

  if (!navLinks) return;

  const authLink = navLinks.querySelector(".btn-primary");

  if (user && authLink) {
    // User is logged in
    let dashboardUrl = "";
    switch (user.role) {
      case "farmer":
        dashboardUrl = "/pages/farmer-dashboard.html";
        break;
      case "processor":
        dashboardUrl = "/pages/processor-dashboard.html";
        break;
      case "buyer":
        dashboardUrl = "/pages/buyer-dashboard.html";
        break;
    }

    authLink.innerHTML = '<i class="fas fa-tachometer-alt"></i> Dashboard';
    authLink.href = dashboardUrl;
  }
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Animate numbers on scroll
function animateNumbers() {
  const numbers = document.querySelectorAll(".stat-number");

  numbers.forEach((num) => {
    const target = parseInt(num.textContent.replace(/[^0-9]/g, ""));
    const suffix = num.textContent.replace(/[0-9]/g, "");
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      num.textContent = Math.floor(current).toLocaleString() + suffix;
    }, 16);
  });
}

// Intersection Observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("animate-in");

      // Trigger number animation for stats
      if (entry.target.querySelector(".stat-number")) {
        animateNumbers();
      }
    }
  });
}, observerOptions);

// Observe elements for animation
document
  .querySelectorAll(".step-card, .feature-card, .stat-item")
  .forEach((el) => {
    observer.observe(el);
  });

// Form validation helper
function validateForm(form) {
  const inputs = form.querySelectorAll(
    "input[required], select[required], textarea[required]",
  );
  let isValid = true;

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      isValid = false;
      input.style.borderColor = "var(--danger)";
    } else {
      input.style.borderColor = "";
    }
  });

  return isValid;
}

// Show notification
function showNotification(message, type = "success") {
  const notification = document.createElement("div");
  notification.className = `alert alert-${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    z-index: 9999;
    padding: 1rem 1.5rem;
    border-radius: var(--radius);
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = "slideOut 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .animate-in {
    animation: fadeInUp 0.6s ease forwards;
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .step-card, .feature-card {
    opacity: 0;
  }

  .step-card.animate-in, .feature-card.animate-in {
    opacity: 1;
  }
`;
document.head.appendChild(style);

// Utility functions
const utils = {
  // Format currency
  formatCurrency(amount) {
    return (
      "₹" +
      parseFloat(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  },

  // Format date
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  },

  // Debounce function
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Generate random ID
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  },
};

const nodemailer = require("nodemailer");

const sendQuotationEmail = async ({
  customerEmail,
  customerName,
  orderId,
  products,
  totalAmount,
  deliveryAddress,
  deliveryFee,
}) => {
  try {
    // 1️⃣ Create transporter (Gmail example)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use App Password
      },
    });

    // 2️⃣ Generate products table HTML
    const productRows = products
      .map(
        (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity}</td>
          <td>€${item.price}</td>
          <td>€${item.quantity * item.price}</td>
        </tr>
      `,
      )
      .join("");

    // 3️⃣ Email HTML Template
    const mailOptions = {
      from: `"Your Store" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Quotation for Your Order #${orderId}`,
      html: `
        <h2>Thank you for your purchase, ${customerName}!</h2>
        <p>Your order has been successfully placed. Here is your quotation:</p>

        <h3>Order ID: ${orderId}</h3>

        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
          <thead>
            <tr>
              <th>Product</th>
              <th>Quantity</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${productRows}
          </tbody>
        </table>

        <p><strong>Delivery Fee:</strong> €${deliveryFee}</p>
        <p><strong>Total Amount:</strong> €${totalAmount}</p>

        <h3>Delivery Address</h3>
        <p>${deliveryAddress}</p>

        <br/>
        <p>We will notify you once your order is out for delivery.</p>
        <p>Thank you for shopping with us!</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log("Quotation email sent successfully");
  } catch (error) {
    console.error("Error sending quotation email:", error);
    throw error;
  }
};

// Export utils for use in other scripts
window.utils = utils;
