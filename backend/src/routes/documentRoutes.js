const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const documentController = require('../controllers/documentController');

// POST /api/documents/upload — upload & process a document
router.post('/upload', upload.single('document'), documentController.uploadDocument);

// POST /api/documents/upload-multiple — upload multiple docs
router.post('/upload-multiple', upload.array('documents', 5), documentController.uploadMultiple);

module.exports = router;
