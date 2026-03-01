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

// Submit feedback for a transaction
router.post('/submit', authMiddleware, async (req, res) => {
  const { transactionId, transactionType, toUserId, rating, comment } = req.body;
  const supabase = req.app.locals.supabase;

  // Validate rating
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  try {
    // Check if user already gave feedback for this transaction
    const { data: existingFeedback } = await supabase
      .from('feedback')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('transaction_type', transactionType)
      .eq('from_user_id', req.user.userId)
      .single();

    if (existingFeedback) {
      return res.status(400).json({ message: 'You have already submitted feedback for this transaction' });
    }

    // Insert feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert([{
        transaction_id: transactionId,
        transaction_type: transactionType,
        from_user_id: req.user.userId,
        to_user_id: toUserId,
        rating,
        comment: comment || '',
        created_at: new Date()
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Feedback submitted successfully', feedback: data });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feedback for a user
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        from_user:users!feedback_from_user_id_fkey (full_name, company_name)
      `)
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate average rating
    const avgRating = data?.length 
      ? (data.reduce((sum, f) => sum + f.rating, 0) / data.length).toFixed(1)
      : 0;

    res.json({ 
      feedback: data || [], 
      averageRating: avgRating,
      totalReviews: data?.length || 0
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get feedback for a specific transaction
router.get('/transaction/:transactionId', authMiddleware, async (req, res) => {
  const { transactionId } = req.params;
  const { type } = req.query; // 'raw_oilseed' or 'byproduct'
  const supabase = req.app.locals.supabase;

  try {
    const { data, error } = await supabase
      .from('feedback')
      .select(`
        *,
        from_user:users!feedback_from_user_id_fkey (full_name, company_name)
      `)
      .eq('transaction_id', transactionId)
      .eq('transaction_type', type)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({ feedback: data || null });
  } catch (error) {
    console.error('Get transaction feedback error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Check if user can give feedback
router.get('/can-submit/:transactionId', authMiddleware, async (req, res) => {
  const { transactionId } = req.params;
  const { type } = req.query;
  const supabase = req.app.locals.supabase;

  try {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('transaction_id', transactionId)
      .eq('transaction_type', type)
      .eq('from_user_id', req.user.userId)
      .single();

    res.json({ canSubmit: !data });
  } catch (error) {
    res.json({ canSubmit: true });
  }
});

module.exports = router;
