require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const seedsRoutes = require('./routes/seedsRoutes');
const { registerLiveMarketAddon } = require('./addons/liveMarketAddon');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST'],
    optionsSuccessStatus: 200
  })
);

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api', seedsRoutes);
registerLiveMarketAddon(app);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
