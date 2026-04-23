const express = require('express');
const path = require('path');
const { getSeedsData } = require('../controllers/seedsController');

const registerLiveMarketAddon = (app) => {
  const router = express.Router();

  router.get('/data', getSeedsData);
  app.use('/api/live-market', router);

  app.get('/live-market', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'live-market.html'));
  });

  app.get('/live-market-1', (req, res) => {
    res.sendFile(path.join(__dirname, '..', '..', 'live-market (1).html'));
  });
};

module.exports = {
  registerLiveMarketAddon
};
