const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../frontend'));

// Make supabase available to routes
app.locals.supabase = supabase;

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmer', require('./routes/farmer'));
app.use('/api/processor', require('./routes/processor'));
app.use('/api/buyer', require('./routes/buyer'));
app.use('/api/market', require('./routes/market'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/password', require('./routes/password'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Oilseed Platform API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
