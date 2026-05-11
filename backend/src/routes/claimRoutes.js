const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');

// GET /api/claims — list with filters & pagination
router.get('/', claimController.listClaims);

// GET /api/claims/stats — dashboard statistics
router.get('/stats', claimController.getStats);

// GET /api/claims/:id — single claim
router.get('/:id', claimController.getClaim);

// PATCH /api/claims/:id — update/review a claim
router.patch('/:id', claimController.updateClaim);

// DELETE /api/claims/:id — remove a claim
router.delete('/:id', claimController.deleteClaim);

module.exports = router;
