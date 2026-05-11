const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

class AIExtractionService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this._initialize();
  }

  _initialize() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      logger.info('✅ Gemini AI initialized');
    } else {
      logger.warn('⚠️  No Gemini API key found. Using regex-only extraction.');
    }
  }

  /**
   * Main extraction pipeline: Regex first, LLM for enrichment
   */
  async extractClaimData(rawText) {
    logger.info('Starting claim data extraction...');

    // Step 1: Rule-based / regex extraction (fast, deterministic)
    const regexExtracted = this._regexExtraction(rawText);

    // Step 2: Detect document type
    const documentType = await this._detectDocumentType(rawText);

    // Step 3: LLM enrichment for fields not caught by regex
    let llmExtracted = {};
    if (this.model) {
      llmExtracted = await this._llmExtraction(rawText, regexExtracted);
    }

    // Step 4: Merge results — prefer regex for high-confidence fields, LLM for gaps
    const merged = this._mergeExtractions(regexExtracted, llmExtracted);

    // Step 5: Compute per-field confidence scores
    const confidenceScores = this._computeConfidenceScores(merged, regexExtracted, llmExtracted);

    return {
      ...merged,
      document_type: documentType,
      confidence_scores: confidenceScores,
    };
  }

  /**
   * Deterministic regex-based extraction
   */
  _regexExtraction(text) {
    const extracted = {};

    const patterns = {
      claim_id: [
        /claim\s*(?:id|no|number|#)\s*[:\-]?\s*([A-Z0-9\-]+)/i,
        /CLM[-\s]?\d{4}[-\s]?\d+/i,
        /#?\s*([A-Z]{2,4}-\d{4}-\d{3,8})/i,
      ],
      policy_number: [
        /policy\s*(?:number|no|#)\s*[:\-]?\s*([A-Z0-9\-]+)/i,
        /POL[-\s]?\d+/i,
        /policy\s*[:\-]\s*([A-Z0-9\-]{6,20})/i,
      ],
      claimant_name: [
        /(?:claimant|patient|insured|member)\s*(?:name|full name)?\s*[:\-]?\s*([A-Za-z][A-Za-z\s\-'\.]{2,40}?)(?:\n|$|,)/i,
        /name\s*of\s*(?:insured|claimant)\s*[:\-]\s*([A-Za-z\s]+)/i,
      ],
      incident_date: [
        /(?:date of|incident|loss|accident|service)\s*(?:date)?\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/,
        /(\d{4}-\d{2}-\d{2})/,
        /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i,
      ],
      claim_amount: [
        /(?:claim|total|amount|bill|charge|cost)\s*(?:amount|total)?\s*[:\-]?\s*\$?\s*([\d,]+\.?\d{0,2})/i,
        /\$\s*([\d,]+(?:\.\d{2})?)/,
        /(?:USD|EUR|GBP)\s*([\d,]+(?:\.\d{2})?)/i,
        /total\s*[:\-]\s*\$?([\d,]+(?:\.\d{2})?)/i,
      ],
      provider: [
        /(?:hospital|clinic|provider|facility|doctor|physician|service\s*provider)\s*(?:name)?\s*[:\-]?\s*([A-Za-z][A-Za-z\s&\-\.,']{2,60}?)(?:\n|$|,|\|)/i,
        /(?:treating|attending)\s*(?:hospital|physician)\s*[:\-]\s*([A-Za-z\s&]+)/i,
      ],
      contact_details: [
        /(?:email|e-mail)\s*[:\-]?\s*([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
        /(?:phone|tel|mobile|contact)\s*[:\-]?\s*([\+\d\s\-\(\)]{7,20})/i,
      ],
    };

    for (const [field, patternList] of Object.entries(patterns)) {
      for (const pattern of patternList) {
        const match = text.match(pattern);
        if (match) {
          extracted[field] = match[1]?.trim() || match[0]?.trim();
          break;
        }
      }
    }

    // Extract document references
    const docRefPattern = /(?:invoice|bill|report|ref|reference|doc(?:ument)?)\s*#?\s*([A-Z0-9\-]+)/gi;
    const docRefs = [];
    let docMatch;
    while ((docMatch = docRefPattern.exec(text)) !== null) {
      if (!docRefs.includes(docMatch[0])) {
        docRefs.push(docMatch[0].trim());
      }
    }
    if (docRefs.length) extracted.document_references = docRefs;

    return extracted;
  }

  /**
   * LLM-based extraction for nuanced understanding
   */
  async _llmExtraction(rawText, regexResult) {
    const missingFields = ['claim_id', 'policy_number', 'claimant_name', 'incident_date',
      'claim_amount', 'provider', 'contact_details']
      .filter(f => !regexResult[f]);

    if (missingFields.length === 0) {
      logger.info('All fields found by regex, skipping LLM extraction');
      return {};
    }

    const prompt = `You are an expert insurance claims processor. Extract the following fields from the document text below.

Fields to extract: ${missingFields.join(', ')}

Return ONLY a valid JSON object with the extracted fields. If a field is not found, use null.
Do not include any explanation, markdown, or code blocks — only raw JSON.

Example format:
{"claimant_name": "John Smith", "claim_amount": "1250.00", "policy_number": null}

Document Text:
---
${rawText.substring(0, 3000)}
---`;

    try {
      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text().trim();

      // Strip potential markdown code fences
      const clean = responseText.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      logger.info('LLM extraction succeeded:', Object.keys(parsed).filter(k => parsed[k]));
      return parsed;
    } catch (error) {
      logger.error('LLM extraction failed:', error.message);
      return {};
    }
  }

  /**
   * Detect document type using LLM or keyword matching
   */
  async _detectDocumentType(text) {
    const keywords = {
      claim_form: ['claim form', 'insurance claim', 'claim id', 'policy number', 'date of loss'],
      medical_bill: ['medical bill', 'invoice', 'diagnosis', 'procedure code', 'cpt', 'icd', 'hospital bill'],
      receipt: ['receipt', 'payment received', 'transaction', 'paid', 'total paid'],
      identity_proof: ['passport', 'driver license', "driver's license", 'national id', 'date of birth', 'id number'],
    };

    const textLower = text.toLowerCase();
    const scores = {};

    for (const [type, words] of Object.entries(keywords)) {
      scores[type] = words.filter(w => textLower.includes(w)).length;
    }

    const maxType = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return maxType[1] > 0 ? maxType[0] : 'unknown';
  }

  /**
   * Merge regex and LLM results — regex wins for matched fields, LLM fills gaps
   */
  _mergeExtractions(regexResult, llmResult) {
    const merged = { ...llmResult };

    // Regex results take precedence (more deterministic)
    for (const [key, value] of Object.entries(regexResult)) {
      if (value !== null && value !== undefined) {
        merged[key] = value;
      }
    }

    return merged;
  }

  /**
   * Compute per-field confidence scores (0–1)
   */
  _computeConfidenceScores(merged, regexResult, llmResult) {
    const scores = {};
    const fields = ['claim_id', 'policy_number', 'claimant_name', 'incident_date', 'claim_amount', 'provider', 'contact_details'];

    for (const field of fields) {
      const value = merged[field];

      if (!value) {
        scores[field] = 0;
        continue;
      }

      let score = 0;
      const fromRegex = !!regexResult[field];
      const fromLLM = !!llmResult[field];

      if (fromRegex && fromLLM) {
        // Both sources agree
        score = regexResult[field] === llmResult[field] ? 0.97 : 0.78;
      } else if (fromRegex) {
        score = 0.88; // Regex match
      } else if (fromLLM) {
        score = 0.72; // LLM only
      }

      // Adjust by format validation
      score *= this._getFormatScore(field, value);

      scores[field] = Math.min(0.99, Math.round(score * 100) / 100);
    }

    return scores;
  }

  _getFormatScore(field, value) {
    if (!value) return 0;

    const validators = {
      claim_id: v => /[A-Z0-9\-]{4,20}/i.test(v) ? 1.0 : 0.85,
      policy_number: v => /[A-Z0-9\-]{6,20}/i.test(v) ? 1.0 : 0.85,
      incident_date: v => /\d{1,4}[\-\/\.]\d{1,2}[\-\/\.]\d{2,4}|[a-z]+ \d{1,2},? \d{4}/i.test(v) ? 1.0 : 0.7,
      claim_amount: v => /[\d,]+\.?\d{0,2}/.test(v) ? 1.0 : 0.75,
      contact_details: v => /@/.test(v) || /\d{7,}/.test(v) ? 1.0 : 0.8,
    };

    return validators[field] ? validators[field](value) : 1.0;
  }
}

module.exports = new AIExtractionService();
