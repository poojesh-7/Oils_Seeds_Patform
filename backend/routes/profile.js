const express = require('express');
const router = express.Router();

// Middleware to verify token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get user profile
router.get('/', authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, phone, location, company_name, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;

    // Get transaction counts based on role
    let stats = {};
    
    if (user.role === 'farmer') {
      const { count: listings } = await supabase
        .from('raw_oilseeds')
        .select('*', { count: 'exact' })
        .eq('farmer_id', user.id);

      const { data: sales } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('seller_id', user.id);

      stats = {
        totalListings: listings || 0,
        totalSales: sales?.length || 0,
        totalRevenue: sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0
      };
    } else if (user.role === 'processor') {
      const { count: byproducts } = await supabase
        .from('byproducts')
        .select('*', { count: 'exact' })
        .eq('processor_id', user.id);

      const { data: purchases } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('buyer_id', user.id);

      const { data: sales } = await supabase
        .from('byproduct_transactions')
        .select('total_amount')
        .eq('seller_id', user.id);

      stats = {
        totalByproducts: byproducts || 0,
        totalPurchases: purchases?.length || 0,
        totalSales: sales?.length || 0,
        purchaseValue: purchases?.reduce((sum, p) => sum + p.total_amount, 0) || 0,
        salesValue: sales?.reduce((sum, s) => sum + s.total_amount, 0) || 0
      };
    } else if (user.role === 'buyer') {
      const { data: purchases } = await supabase
        .from('byproduct_transactions')
        .select('total_amount')
        .eq('buyer_id', user.id);

      stats = {
        totalPurchases: purchases?.length || 0,
        totalSpent: purchases?.reduce((sum, p) => sum + p.total_amount, 0) || 0
      };
    }

    res.json({ user, stats });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update profile
router.put('/update', authMiddleware, async (req, res) => {
  const { fullName, phone, location, companyName } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        full_name: fullName,
        phone,
        location,
        company_name: companyName,
        updated_at: new Date()
      })
      .eq('id', req.user.userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Profile updated successfully', user: data });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get complete transaction history
router.get('/transactions', authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;
  const userRole = req.user.role;

  try {
    let transactions = [];

    if (userRole === 'farmer') {
      // Farmer sees: sales of their raw oilseeds with buyer info
      const { data } = await supabase
        .from('transactions')
        .select(`
          *,
          raw_oilseeds (oilseed_type, grade),
          buyer:users!transactions_buyer_id_fkey (full_name, company_name)
        `)
        .eq('seller_id', req.user.userId)
        .order('created_at', { ascending: false });

      transactions = data || [];
    } else if (userRole === 'processor') {
      // Processor sees: 
      // 1. Purchases from farmers (raw oilseeds)
      // 2. Sales to buyers (by-products)
      const [purchaseData, salesData] = await Promise.all([
        supabase
          .from('transactions')
          .select(`
            *,
            raw_oilseeds (oilseed_type, grade),
            seller:users!transactions_seller_id_fkey (full_name, company_name)
          `)
          .eq('buyer_id', req.user.userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('byproduct_transactions')
          .select(`
            *,
            byproducts (product_type, batch_number),
            buyer:users!byproduct_transactions_buyer_id_fkey (full_name, company_name)
          `)
          .eq('seller_id', req.user.userId)
          .order('created_at', { ascending: false })
      ]);

      transactions = {
        purchases: purchaseData.data || [],
        sales: salesData.data || []
      };
    } else if (userRole === 'buyer') {
      // Buyer sees: purchases from processors with batch info
      const { data } = await supabase
        .from('byproduct_transactions')
        .select(`
          *,
          byproducts (product_type, source_oilseed, nutrition_content, batch_number),
          seller:users!byproduct_transactions_seller_id_fkey (full_name, company_name)
        `)
        .eq('buyer_id', req.user.userId)
        .order('created_at', { ascending: false });

      transactions = data || [];
    }

    res.json(transactions);
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upload history (for farmers and processors)
router.get('/uploads', authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;
  const userRole = req.user.role;

  try {
    let uploads = [];

    if (userRole === 'farmer') {
      // Farmer's uploaded raw oilseeds
      const { data } = await supabase
        .from('raw_oilseeds')
        .select(`
          *,
          buyer:sold_to (full_name, company_name)
        `)
        .eq('farmer_id', req.user.userId)
        .order('created_at', { ascending: false });

      uploads = (data || []).map(item => ({
        id: item.id,
        type: 'raw_oilseed',
        product: item.oilseed_type,
        quantity: item.quantity,
        unit: 'q',
        price: item.expected_price,
        grade: item.grade,
        status: item.status,
        batch_id: item.id.slice(0, 8).toUpperCase(),
        sold_to: item.buyer?.full_name || item.buyer?.company_name || null,
        created_at: item.created_at
      }));
    } else if (userRole === 'processor') {
      // Processor's uploaded by-products
      const { data } = await supabase
        .from('byproducts')
        .select('*')
        .eq('processor_id', req.user.userId)
        .order('created_at', { ascending: false });

      uploads = (data || []).map(item => ({
        id: item.id,
        type: 'byproduct',
        product: item.product_type,
        source: item.source_oilseed,
        quantity: item.quantity,
        unit: 'kg',
        price: item.price,
        batch_id: item.batch_number,
        status: item.status,
        created_at: item.created_at
      }));
    }

    res.json(uploads);
  } catch (error) {
    console.error('Upload history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
