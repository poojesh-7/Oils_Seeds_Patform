// OilSeed Pro - Authentication Module

const API_BASE_URL = "https://oils-seeds-patform-q4ga.onrender.com/api";

// Store token and user data
function setAuth(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

// Get token
function getToken() {
  return localStorage.getItem("token");
}

// Get user
function getUser() {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getToken();
}

// Check authentication and redirect if needed
function checkAuth(requiredRole = null) {
  const token = getToken();
  const user = getUser();

  if (!token || !user) {
    window.location.href = "login.html";
    return false;
  }

  if (requiredRole && user.role !== requiredRole) {
    // Redirect to appropriate dashboard
    switch (user.role) {
      case "farmer":
        window.location.href = "farmer-dashboard.html";
        break;
      case "processor":
        window.location.href = "processor-dashboard.html";
        break;
      case "buyer":
        window.location.href = "buyer-dashboard.html";
        break;
      default:
        window.location.href = "../index.html";
    }
    return false;
  }

  return true;
}

// Login
async function login(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }

    setAuth(data.token, data.user);
    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// Register
async function register(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Registration failed");
    }

    return data;
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

// Logout
function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "../index.html";
}

// API request with authentication
async function apiRequest(endpoint, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;

  // Safely parse JSON only if body exists
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}
