const claimProcessingService = require('../services/claimProcessingService');

exports.listClaims = async (req, res) => {
  const { status, document_type, search, page = 1, limit = 20 } = req.query;

  const result = await claimProcessingService.getAllClaims(
    { status, document_type, search },
    parseInt(page),
    parseInt(limit)
  );

  res.json(result);
};

exports.getClaim = async (req, res) => {
  const claim = await claimProcessingService.getClaimById(req.params.id);
  res.json(claim);
};

exports.updateClaim = async (req, res) => {
  const claim = await claimProcessingService.updateClaim(req.params.id, req.body);
  res.json({ message: 'Claim updated successfully', claim });
};

exports.deleteClaim = async (req, res) => {
  await claimProcessingService.deleteClaim(req.params.id);
  res.json({ message: 'Claim deleted' });
};

exports.getStats = async (req, res) => {
  const stats = await claimProcessingService.getStats();
  res.json(stats);
};
