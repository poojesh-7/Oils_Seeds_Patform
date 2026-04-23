const express = require('express');
const { getSeedsData } = require('../controllers/seedsController');
const { syncSeedsForDate } = require('../services/seedsSyncService');
const { getTodayIsoDate } = require('../config/agmarknetConfig');

const router = express.Router();

router.get('/seeds', getSeedsData);

router.post('/seeds/sync', async (req, res, next) => {
	try {
		const targetDate = req.body?.date || getTodayIsoDate();
		const synced = await syncSeedsForDate(targetDate);

		res.status(200).json({
			success: true,
			source: 'agmarknet-live',
			stale: false,
			date: synced.date,
			count: synced.rows.length,
			data: synced.rows
		});
	} catch (error) {
		next(error);
	}
});

module.exports = router;
