const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');

router.get('/', claimController.getStats);

module.exports = router;
