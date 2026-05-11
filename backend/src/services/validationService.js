const Claim = require('../models/Claim');
const logger = require('../utils/logger');

const CONFIDENCE_THRESHOLD = parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.75;

const MANDATORY_FIELDS = ['policy_number', 'claimant_name', 'incident_date', 'claim_amount'];

class ValidationService {

  /**
   * Full validation pipeline
   */
  async validate(extractedData, confidenceScores) {
    const errors = [];
    const warnings = [];
    const flaggedFields = [];

    // 1. Mandatory field checks
    this._checkMandatoryFields(extractedData, errors);

    // 2. Format validations
    this._validateFormats(extractedData, errors, warnings);

    // 3. Flag low-confidence fields
    this._flagLowConfidenceFields(confidenceScores, flaggedFields, warnings);

    // 4. Duplicate check
    const duplicateCheck = await this._checkDuplicates(extractedData);
    if (duplicateCheck.is_duplicate) {
      errors.push(`Duplicate claim detected. Similar claim: ${duplicateCheck.duplicate_claim_id}`);
    }

    // 5. Amount sanity check
    this._validateAmount(extractedData.claim_amount, warnings);

    const isValid = errors.length === 0;

    return {
      is_valid: isValid,
      errors,
      warnings,
      flagged_fields: flaggedFields,
      duplicate_check: duplicateCheck,
    };
  }

  _checkMandatoryFields(data, errors) {
    for (const field of MANDATORY_FIELDS) {
      if (!data[field] || String(data[field]).trim() === '') {
        errors.push(`Missing mandatory field: ${field.replace(/_/g, ' ')}`);
      }
    }
  }

  _validateFormats(data, errors, warnings) {
    // Date validation
    if (data.incident_date) {
      const datePatterns = [
        /^\d{4}-\d{2}-\d{2}$/,
        /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
        /^[a-z]+ \d{1,2},? \d{4}$/i,
      ];
      const isValidDate = datePatterns.some(p => p.test(data.incident_date.trim()));
      if (!isValidDate) {
        warnings.push(`Date format may be non-standard: "${data.incident_date}"`);
      }

      // Check if date is in the future
      const parsed = new Date(data.incident_date);
      if (!isNaN(parsed) && parsed > new Date()) {
        errors.push('Incident date cannot be in the future');
      }
    }

    // Amount validation
    if (data.claim_amount) {
      const cleanedAmount = data.claim_amount.replace(/[$,\s]/g, '');
      if (isNaN(parseFloat(cleanedAmount))) {
        errors.push(`Invalid claim amount format: "${data.claim_amount}"`);
      }
    }

    // Policy number format
    if (data.policy_number) {
      if (data.policy_number.length < 4) {
        warnings.push('Policy number seems unusually short');
      }
    }

    // Email format
    if (data.contact_details && data.contact_details.includes('@')) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.contact_details)) {
        warnings.push('Contact email format may be invalid');
      }
    }
  }

  _flagLowConfidenceFields(confidenceScores, flaggedFields, warnings) {
    for (const [field, score] of Object.entries(confidenceScores || {})) {
      if (score !== null && score < CONFIDENCE_THRESHOLD) {
        flaggedFields.push(field);
        warnings.push(`Low confidence (${(score * 100).toFixed(0)}%) for field: ${field.replace(/_/g, ' ')}`);
      }
    }
  }

  async _checkDuplicates(data) {
    try {
      if (!data.policy_number || !data.incident_date) {
        return { is_duplicate: false, duplicate_claim_id: null };
      }

      const existing = await Claim.findOne({
        policy_number: data.policy_number,
        incident_date: data.incident_date,
        status: { $nin: ['rejected'] },
      }).select('claim_ref').lean();

      if (existing) {
        logger.warn(`Duplicate claim detected: ${existing.claim_ref}`);
        return { is_duplicate: true, duplicate_claim_id: existing.claim_ref };
      }
    } catch (err) {
      logger.error('Duplicate check failed:', err.message);
    }

    return { is_duplicate: false, duplicate_claim_id: null };
  }

  _validateAmount(amount, warnings) {
    if (!amount) return;
    const clean = parseFloat(String(amount).replace(/[$,\s]/g, ''));
    if (!isNaN(clean)) {
      if (clean > 1_000_000) {
        warnings.push('Claim amount exceeds $1,000,000 — requires senior review');
      }
      if (clean <= 0) {
        warnings.push('Claim amount is zero or negative');
      }
    }
  }

  /**
   * Normalize extracted values for consistent storage
   */
  normalizeData(data) {
    const normalized = { ...data };

    // Normalize date to ISO format if possible
    if (normalized.incident_date) {
      const parsed = new Date(normalized.incident_date);
      if (!isNaN(parsed)) {
        normalized.incident_date = parsed.toISOString().split('T')[0];
      }
    }

    // Normalize amount — strip currency symbols, keep numeric string
    if (normalized.claim_amount) {
      normalized.claim_amount = String(normalized.claim_amount)
        .replace(/[^0-9.,]/g, '')
        .trim();
    }

    // Trim all string fields
    for (const key of Object.keys(normalized)) {
      if (typeof normalized[key] === 'string') {
        normalized[key] = normalized[key].trim();
      }
    }

    return normalized;
  }
}

module.exports = new ValidationService();
