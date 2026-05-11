const claimProcessingService = require('../services/claimProcessingService');
const logger = require('../utils/logger');

exports.uploadDocument = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Include a file with key "document".' });
  }

  logger.info(`Document received: ${req.file.originalname} (${req.file.size} bytes)`);

  const result = await claimProcessingService.processDocument(req.file);

  res.status(201).json({
    message: 'Document processed successfully',
    claim: result,
  });
};

exports.uploadMultiple = async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const results = await Promise.allSettled(
    req.files.map(file => claimProcessingService.processDocument(file))
  );

  const processed = results.map((r, i) => ({
    file: req.files[i].originalname,
    status: r.status,
    claim: r.value || null,
    error: r.reason?.message || null,
  }));

  const successCount = processed.filter(p => p.status === 'fulfilled').length;

  res.status(207).json({
    message: `Processed ${successCount}/${req.files.length} documents`,
    results: processed,
  });
};
