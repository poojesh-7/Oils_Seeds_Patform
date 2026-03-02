const express = require("express");
const router = express.Router();
const sendMail = require("../utils/mailer");
// Middleware to verify token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Access denied" });

  try {
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key",
    );
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Get available by-products
router.get("/available-byproducts", authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from("byproducts")
      .select(
        `
        *,
        processor:users!byproducts_processor_id_fkey (
          full_name,
          company_name,
          location,
          phone
        )
      `,
      )
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Fetch byproducts error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Buy by-product
router.post("/buy-byproduct", authMiddleware, async (req, res) => {
  const { byproductId, quantity, paymentMethod = "pay_on_delivery" } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    const qty = parseFloat(quantity);

    // Get byproduct details
    const { data: byproduct, error: byproductError } = await supabase
      .from("byproducts")
      .select("*")
      .eq("id", byproductId)
      .single();

    if (byproductError || !byproduct) {
      return res.status(404).json({ message: "By-product not found" });
    }

    if (qty <= 0 || qty > byproduct.quantity) {
      return res.status(400).json({ message: "Invalid quantity requested" });
    }

    const totalAmount = qty * byproduct.price;

    // Create transaction
    const { data: transaction, error: transError } = await supabase
      .from("byproduct_transactions")
      .insert([
        {
          byproduct_id: byproductId,
          seller_id: byproduct.processor_id,
          buyer_id: req.user.userId,
          quantity: qty,
          price: byproduct.price,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          delivery_status: "pending",
          status: "completed",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (transError) throw transError;

    // Update byproduct quantity
    const newQuantity = byproduct.quantity - qty;

    await supabase
      .from("byproducts")
      .update({
        quantity: newQuantity,
        status: newQuantity === 0 ? "sold_out" : "available",
      })
      .eq("id", byproductId);

    // Get buyer details
    const { data: buyer } = await supabase
      .from("users")
      .select("*")
      .eq("id", req.user.userId)
      .single();

    // Get seller (processor) details
    const { data: seller } = await supabase
      .from("users")
      .select("*")
      .eq("id", byproduct.processor_id)
      .single();

    try {
      // 📩 Email to Buyer
      await sendMail(
        buyer.email,
        "By-Product Purchase Confirmation",
        `
      <h2>Purchase Successful 🎉</h2>
      <p><strong>Product:</strong> ${byproduct.product_type}</p>
      <p><strong>Source Oilseed:</strong> ${byproduct.source_oilseed}</p>
      <p><strong>Quantity:</strong> ${qty}</p>
      <p><strong>Total Amount:</strong> ₹${totalAmount}</p>

      <h3>Processor Details</h3>
      <p>Name: ${seller.full_name}</p>
      <p>Phone: ${seller.phone}</p>
      <p>Email: ${seller.email}</p>
      <p>Company: ${seller.company_name}</p>
      <p>Location: ${seller.location}</p>
    `,
      );

      // 📩 Email to Processor (Seller)
      await sendMail(
        seller.email,
        "Your By-Product Has Been Purchased",
        `
      <h2>Your Product Was Purchased 🚀</h2>
      <p><strong>Product:</strong> ${byproduct.product_type}</p>
      <p><strong>Quantity Sold:</strong> ${qty}</p>
      <p><strong>Total Amount:</strong> ₹${totalAmount}</p>

      <h3>Buyer Details</h3>
      <p>Name: ${buyer.full_name}</p>
      <p>Phone: ${buyer.phone}</p>
      <p>Email: ${buyer.email}</p>
      <p>Company: ${buyer.company_name || "N/A"}</p>
      <p>Location: ${buyer.location}</p>
    `,
      );
    } catch (mailError) {
      console.error("Email sending failed:", mailError);
      // Don't break transaction if email fails
    }

    res.json({ message: "Purchase successful", transaction });
  } catch (error) {
    console.error("Buy byproduct error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get buyer purchase history
router.get("/purchase-history", authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from("byproduct_transactions")
      .select(
        `
        *,
        byproducts (
          product_type,
          source_oilseed,
          nutrition_content,
          batch_number
        ),
        seller:users!byproduct_transactions_seller_id_fkey (
          full_name,
          company_name
        )
      `,
      )
      .eq("buyer_id", req.user.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Fetch purchase history error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Compare by-products
router.post("/compare", authMiddleware, async (req, res) => {
  const { byproductIds } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    if (!Array.isArray(byproductIds) || byproductIds.length === 0) {
      return res.status(400).json({ message: "Provide byproductIds array" });
    }

    const { data, error } = await supabase
      .from("byproducts")
      .select(
        `
        *,
        processor:users!byproducts_processor_id_fkey (
          full_name,
          company_name,
          location
        )
      `,
      )
      .in("id", byproductIds);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Compare error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
