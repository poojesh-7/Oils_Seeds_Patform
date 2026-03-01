const express = require('express');
const router = express.Router();

// Get market prices and trends
router.get('/prices', async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    // Get recent transactions for price analysis
    const { data: rawTransactions, error: rawError } = await supabase
      .from('transactions')
      .select('price, created_at, raw_oilseeds (oilseed_type)')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: byproductTransactions, error: byproductError } = await supabase
      .from('byproduct_transactions')
      .select('price, created_at, byproducts (product_type)')
      .order('created_at', { ascending: false })
      .limit(100);

    // Calculate average prices by type
    const priceData = {
      rawOilseeds: {},
      byproducts: {}
    };

    if (rawTransactions) {
      rawTransactions.forEach(t => {
        const type = t.raw_oilseeds?.oilseed_type || 'Unknown';
        if (!priceData.rawOilseeds[type]) {
          priceData.rawOilseeds[type] = { prices: [], avgPrice: 0 };
        }
        priceData.rawOilseeds[type].prices.push(t.price);
      });

      Object.keys(priceData.rawOilseeds).forEach(type => {
        const prices = priceData.rawOilseeds[type].prices;
        priceData.rawOilseeds[type].avgPrice = 
          prices.reduce((a, b) => a + b, 0) / prices.length;
      });
    }

    if (byproductTransactions) {
      byproductTransactions.forEach(t => {
        const type = t.byproducts?.product_type || 'Unknown';
        if (!priceData.byproducts[type]) {
          priceData.byproducts[type] = { prices: [], avgPrice: 0 };
        }
        priceData.byproducts[type].prices.push(t.price);
      });

      Object.keys(priceData.byproducts).forEach(type => {
        const prices = priceData.byproducts[type].prices;
        priceData.byproducts[type].avgPrice = 
          prices.reduce((a, b) => a + b, 0) / prices.length;
      });
    }

    res.json(priceData);
  } catch (error) {
    console.error('Market prices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get market statistics
router.get('/stats', async (req, res) => {
  const supabase = req.app.locals.supabase;

  try {
    // Get counts
    const { count: farmerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'farmer');

    const { count: processorCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'processor');

    const { count: buyerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('role', 'buyer');

    const { count: rawListings } = await supabase
      .from('raw_oilseeds')
      .select('*', { count: 'exact' })
      .eq('status', 'available');

    const { count: byproductListings } = await supabase
      .from('byproducts')
      .select('*', { count: 'exact' })
      .eq('status', 'available');

    // Get total transaction volume
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total_amount');

    const { data: byproductTransactions } = await supabase
      .from('byproduct_transactions')
      .select('total_amount');

    const totalVolume = [
      ...(transactions || []),
      ...(byproductTransactions || [])
    ].reduce((sum, t) => sum + (t.total_amount || 0), 0);

    res.json({
      farmers: farmerCount || 0,
      processors: processorCount || 0,
      buyers: buyerCount || 0,
      rawListings: rawListings || 0,
      byproductListings: byproductListings || 0,
      totalVolume: totalVolume || 0
    });
  } catch (error) {
    console.error('Market stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get export opportunities
router.get('/export-opportunities', async (req, res) => {
  // Mock data for export opportunities
  const opportunities = [
    {
      id: 1,
      product: 'Soymeal',
      targetMarket: 'Southeast Asia',
      demandVolume: '5000 MT',
      priceRange: '$450-520/MT',
      requirements: 'ISO 22000, Non-GMO',
      deadline: '2024-03-15'
    },
    {
      id: 2,
      product: 'Groundnut Cake',
      targetMarket: 'Middle East',
      demandVolume: '3000 MT',
      priceRange: '$380-450/MT',
      requirements: 'Halal Certified',
      deadline: '2024-02-28'
    },
    {
      id: 3,
      product: 'Mustard Husk',
      targetMarket: 'Europe',
      demandVolume: '2000 MT',
      priceRange: '$200-280/MT',
      requirements: 'Organic Certified',
      deadline: '2024-03-30'
    },
    {
      id: 4,
      product: 'Sunflower Meal',
      targetMarket: 'East Asia',
      demandVolume: '8000 MT',
      priceRange: '$320-380/MT',
      requirements: 'Aflatoxin <20ppb',
      deadline: '2024-04-10'
    }
  ];

  res.json(opportunities);
});

module.exports = router;
