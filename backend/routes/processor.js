const express = require("express");
const router = express.Router();

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

// Get available raw oilseeds
router.get("/available-oilseeds", authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from("raw_oilseeds")
      .select(
        `
        *,
        farmer:users!raw_oilseeds_farmer_id_fkey (full_name, location, phone)
      `,
      )
      .eq("status", "available")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Fetch oilseeds error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Buy raw oilseeds
router.post("/buy-oilseed", authMiddleware, async (req, res) => {
  const {
    oilseedId,
    quantity,
    price,
    paymentMethod = "pay_on_delivery",
  } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    const qty = parseFloat(quantity);

    // Atomically decrement stock
    const { data: updatedRows, error } = await supabase.rpc(
      "decrement_quantity",
      {
        row_id: oilseedId,
        amount: qty,
      },
    );

    if (error || !updatedRows || updatedRows.length === 0) {
      return res.status(400).json({
        message: "Stock not available or already sold",
      });
    }

    const oilseed = updatedRows[0];

    // Mark sold if empty
    if (oilseed.quantity === 0) {
      await supabase
        .from("raw_oilseeds")
        .update({ status: "sold" })
        .eq("id", oilseedId);
    }

    // Record transaction
    await supabase.from("transactions").insert([
      {
        oilseed_id: oilseedId,
        seller_id: oilseed.farmer_id,
        buyer_id: req.user.userId,
        quantity: qty,
        price: parseFloat(price),
        total_amount: qty * parseFloat(price),
        payment_method: paymentMethod,
        delivery_status: "pending",
        status: "completed",
        created_at: new Date().toISOString(),
      },
    ]);

    res.json({ message: "Purchase successful" });
  } catch (err) {
    console.error("Buy oilseed error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Upload processed by-product
router.post("/upload-byproduct", authMiddleware, async (req, res) => {
  const {
    productType,
    sourceOilseed,
    quantity,
    nutritionContent,
    storageCondition,
    price,
    batchNumber,
    expiryDate,
    description,
  } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from("byproducts")
      .insert([
        {
          processor_id: req.user.userId,
          product_type: productType,
          source_oilseed: sourceOilseed,
          quantity: parseFloat(quantity),
          nutrition_content: nutritionContent,
          storage_condition: storageCondition,
          price: parseFloat(price),
          batch_number: batchNumber,
          expiry_date: expiryDate,
          description,
          status: "available",
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: "By-product listed successfully", data });
  } catch (error) {
    console.error("Upload byproduct error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get processor's by-products
router.get("/my-byproducts", authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from("byproducts")
      .select("*")
      .eq("processor_id", req.user.userId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error("Fetch byproducts error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Get purchase history
router.get("/purchase-history", authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        *,
        raw_oilseeds (oilseed_type, grade, moisture_level),
        seller:users!transactions_seller_id_fkey (full_name, location)
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

module.exports = router;
