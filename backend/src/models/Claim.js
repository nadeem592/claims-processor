const mongoose = require('mongoose');

const confidenceScoreSchema = new mongoose.Schema({
  claim_id: { type: Number, default: null },
  policy_number: { type: Number, default: null },
  claimant_name: { type: Number, default: null },
  incident_date: { type: Number, default: null },
  claim_amount: { type: Number, default: null },
  provider: { type: Number, default: null },
  contact_details: { type: Number, default: null },
  document_type: { type: Number, default: null },
}, { _id: false });

const validationReportSchema = new mongoose.Schema({
  is_valid: { type: Boolean, default: false },
  errors: [String],
  warnings: [String],
  flagged_fields: [String],
  duplicate_check: {
    is_duplicate: { type: Boolean, default: false },
    duplicate_claim_id: { type: String, default: null },
  },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  original_name: String,
  stored_name: String,
  path: String,
  mime_type: String,
  size: Number,
  page_count: Number,
}, { _id: false });

const correctionSchema = new mongoose.Schema({
  field: String,
  original_value: String,
  corrected_value: String,
  corrected_by: { type: String, default: 'human' },
  corrected_at: { type: Date, default: Date.now },
}, { _id: false });

const claimSchema = new mongoose.Schema({
  claim_ref: {
    type: String,
    unique: true,
    required: true,
  },

  // Extracted fields
  claim_id: { type: String, trim: true },
  policy_number: { type: String, trim: true },
  claimant_name: { type: String, trim: true },
  incident_date: { type: String, trim: true },
  claim_amount: { type: String, trim: true },
  provider: { type: String, trim: true },
  contact_details: { type: String, trim: true },
  document_references: [String],
  document_type: {
    type: String,
    enum: ['claim_form', 'medical_bill', 'receipt', 'identity_proof', 'unknown'],
    default: 'unknown',
  },

  // Raw OCR text
  raw_text: { type: String },

  // AI processing metadata
  confidence_scores: confidenceScoreSchema,
  validation_report: validationReportSchema,
  documents: [documentSchema],

  // Human review
  status: {
    type: String,
    enum: ['processing', 'pending_review', 'approved', 'rejected', 'completed'],
    default: 'processing',
  },
  review_notes: { type: String },
  corrections: [correctionSchema],
  reviewed_by: { type: String },
  reviewed_at: { type: Date },

  // Processing metadata
  processing_duration_ms: { type: Number },
  ocr_engine: { type: String, default: 'google-vision' },
  ai_model: { type: String, default: 'gemini' },

}, { timestamps: true });

// Index for duplicate detection
claimSchema.index({ policy_number: 1, incident_date: 1 });
claimSchema.index({ claim_id: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Claim', claimSchema);
