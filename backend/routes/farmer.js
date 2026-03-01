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

// Upload raw oilseeds
router.post('/upload', authMiddleware, async (req, res) => {
  const { oilseedType, quantity, expectedPrice, moistureLevel, grade, qualityNotes, harvestDate } = req.body;
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from('raw_oilseeds')
      .insert([{
        farmer_id: req.user.userId,
        oilseed_type: oilseedType,
        quantity: parseFloat(quantity),
        expected_price: parseFloat(expectedPrice),
        moisture_level: parseFloat(moistureLevel),
        grade,
        quality_notes: qualityNotes,
        harvest_date: harvestDate,
        status: 'available',
        created_at: new Date()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Oilseed listed successfully', data });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get farmer's listings
router.get('/my-listings', authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from('raw_oilseeds')
      .select('*')
      .eq('farmer_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Fetch listings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get farmer's sales history
router.get('/sales-history', authMiddleware, async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        raw_oilseeds (oilseed_type, grade),
        buyer:users!transactions_buyer_id_fkey (full_name, company_name)
      `)
      .eq('seller_id', req.user.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Fetch sales error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
