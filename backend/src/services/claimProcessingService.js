const { v4: uuidv4 } = require('uuid');
const path = require('path');
const Claim = require('../models/Claim');
const ocrService = require('./ocrService');
const aiExtractionService = require('./aiExtractionService');
const validationService = require('./validationService');
const logger = require('../utils/logger');

class ClaimProcessingService {

  /**
   * Full pipeline: file → OCR → extraction → validation → save
   */
  async processDocument(fileInfo) {
    const startTime = Date.now();
    const claimRef = `CLM-${Date.now()}-${uuidv4().substring(0, 6).toUpperCase()}`;

    logger.info(`Processing document: ${fileInfo.originalname} → ${claimRef}`);

    // Create initial record
    const claim = new Claim({
      claim_ref: claimRef,
      status: 'processing',
      documents: [{
        original_name: fileInfo.originalname,
        stored_name: fileInfo.filename,
        path: fileInfo.path,
        mime_type: fileInfo.mimetype,
        size: fileInfo.size,
      }],
    });

    try {
      await claim.save();

      // Step 1: OCR
      const ocrResult = await ocrService.extractText(fileInfo.path, fileInfo.mimetype);
      claim.raw_text = ocrResult.text;
      if (ocrResult.pages) {
        claim.documents[0].page_count = ocrResult.pages;
      }

      // Step 2: AI Data Extraction
      const extracted = await aiExtractionService.extractClaimData(ocrResult.text);

      // Step 3: Normalize
      const normalized = validationService.normalizeData(extracted);

      // Step 4: Validation
      const validationReport = await validationService.validate(normalized, extracted.confidence_scores);

      // Step 5: Populate claim record
      Object.assign(claim, {
        claim_id: normalized.claim_id,
        policy_number: normalized.policy_number,
        claimant_name: normalized.claimant_name,
        incident_date: normalized.incident_date,
        claim_amount: normalized.claim_amount,
        provider: normalized.provider,
        contact_details: normalized.contact_details,
        document_references: normalized.document_references || [],
        document_type: normalized.document_type || 'unknown',
        confidence_scores: extracted.confidence_scores,
        validation_report: validationReport,
        ocr_engine: ocrResult.is_mock ? 'mock' : 'google-vision',
        processing_duration_ms: Date.now() - startTime,
        status: validationReport.flagged_fields.length > 0 || !validationReport.is_valid
          ? 'pending_review'
          : 'approved',
      });

      await claim.save();
      logger.info(`Claim ${claimRef} processed in ${claim.processing_duration_ms}ms. Status: ${claim.status}`);

      return this._formatResponse(claim);

    } catch (error) {
      logger.error(`Processing failed for ${claimRef}:`, error);
      claim.status = 'pending_review';
      claim.validation_report = {
        is_valid: false,
        errors: [`Processing error: ${error.message}`],
        warnings: [],
        flagged_fields: ['all'],
        duplicate_check: { is_duplicate: false, duplicate_claim_id: null },
      };
      await claim.save();
      throw error;
    }
  }

  async getClaimById(id) {
    const claim = await Claim.findById(id).lean();
    if (!claim) throw new Error('Claim not found');
    return this._formatResponse(claim);
  }

  async getAllClaims(filters = {}, page = 1, limit = 20) {
    const query = {};

    if (filters.status) query.status = filters.status;
    if (filters.document_type) query.document_type = filters.document_type;
    if (filters.search) {
      query.$or = [
        { claim_ref: { $regex: filters.search, $options: 'i' } },
        { claimant_name: { $regex: filters.search, $options: 'i' } },
        { policy_number: { $regex: filters.search, $options: 'i' } },
        { claim_id: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [claims, total] = await Promise.all([
      Claim.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Claim.countDocuments(query),
    ]);

    return {
      claims: claims.map(c => this._formatResponse(c)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async updateClaim(id, updates) {
    const allowedFields = [
      'claim_id', 'policy_number', 'claimant_name', 'incident_date',
      'claim_amount', 'provider', 'contact_details', 'status', 'review_notes',
    ];

    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    // Track corrections
    if (updates.corrections) {
      filteredUpdates.$push = { corrections: { $each: updates.corrections } };
    }

    if (updates.reviewed_by) {
      filteredUpdates.reviewed_by = updates.reviewed_by;
      filteredUpdates.reviewed_at = new Date();
    }

    const claim = await Claim.findByIdAndUpdate(id, filteredUpdates, { new: true }).lean();
    if (!claim) throw new Error('Claim not found');

    return this._formatResponse(claim);
  }

  async deleteClaim(id) {
    const claim = await Claim.findByIdAndDelete(id);
    if (!claim) throw new Error('Claim not found');
    return { success: true };
  }

  async getStats() {
    const [statusCounts, docTypeCounts, recentClaims, avgConfidence] = await Promise.all([
      Claim.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Claim.aggregate([
        { $group: { _id: '$document_type', count: { $sum: 1 } } }
      ]),
      Claim.find().sort({ createdAt: -1 }).limit(5).lean(),
      Claim.aggregate([
        {
          $group: {
            _id: null,
            avgClaimAmount: { $avg: { $toDouble: '$claim_amount' } },
            avgProcessingMs: { $avg: '$processing_duration_ms' },
          }
        }
      ]),
    ]);

    const totalClaims = await Claim.countDocuments();

    return {
      total_claims: totalClaims,
      by_status: Object.fromEntries(statusCounts.map(s => [s._id || 'unknown', s.count])),
      by_document_type: Object.fromEntries(docTypeCounts.map(d => [d._id || 'unknown', d.count])),
      recent_claims: recentClaims.map(c => this._formatResponse(c)),
      averages: avgConfidence[0] || {},
    };
  }

  _formatResponse(claim) {
    return {
      id: claim._id,
      claim_ref: claim.claim_ref,
      claim_id: claim.claim_id,
      policy_number: claim.policy_number,
      claimant_name: claim.claimant_name,
      incident_date: claim.incident_date,
      claim_amount: claim.claim_amount,
      provider: claim.provider,
      contact_details: claim.contact_details,
      document_references: claim.document_references,
      document_type: claim.document_type,
      status: claim.status,
      review_notes: claim.review_notes,
      corrections: claim.corrections,
      reviewed_by: claim.reviewed_by,
      reviewed_at: claim.reviewed_at,
      confidence_scores: claim.confidence_scores,
      validation_report: claim.validation_report,
      documents: claim.documents,
      processing_duration_ms: claim.processing_duration_ms,
      ocr_engine: claim.ocr_engine,
      created_at: claim.createdAt,
      updated_at: claim.updatedAt,
    };
  }
}

module.exports = new ClaimProcessingService();
