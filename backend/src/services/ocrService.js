const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const logger = require('../utils/logger');

class OCRService {
  constructor() {
    this.client = this._initializeClient();
  }

  _initializeClient() {
    try {
      const keyFile = process.env.GOOGLE_CLOUD_KEY_FILE;
      const apiKey = process.env.GOOGLE_VISION_API_KEY;

      if (keyFile && fs.existsSync(path.resolve(keyFile))) {
        return new vision.ImageAnnotatorClient({ keyFilename: path.resolve(keyFile) });
      } else if (apiKey) {
        return new vision.ImageAnnotatorClient({ apiKey });
      } else {
        logger.warn('⚠️  No Google Vision credentials found. Using mock OCR mode.');
        return null;
      }
    } catch (err) {
      logger.warn('Could not initialize Vision client:', err.message);
      return null;
    }
  }

  /**
   * Main entry point: extract text from any supported file type
   */
  async extractText(filePath, mimeType) {
    const startTime = Date.now();
    logger.info(`OCR processing: ${path.basename(filePath)} [${mimeType}]`);

    try {
      let result;

      if (mimeType === 'application/pdf') {
        result = await this._processPDF(filePath);
      } else if (mimeType.startsWith('image/')) {
        result = await this._processImage(filePath);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      result.duration_ms = Date.now() - startTime;
      logger.info(`OCR completed in ${result.duration_ms}ms`);
      return result;

    } catch (error) {
      logger.error('OCR extraction failed:', error);
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  async _processImage(filePath) {
    // Pre-process image for better OCR quality
    const processedPath = await this._preprocessImage(filePath);

    if (!this.client) {
      return this._mockOCR(filePath);
    }

    const [result] = await this.client.documentTextDetection(processedPath);
    const fullText = result.fullTextAnnotation?.text || '';
    const pages = result.fullTextAnnotation?.pages || [];

    // Clean up preprocessed temp file if different
    if (processedPath !== filePath) {
      fs.unlinkSync(processedPath);
    }

    return {
      text: fullText,
      pages: pages.length || 1,
      confidence: this._extractConfidence(result),
      blocks: this._extractBlocks(result),
    };
  }

  async _processPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    let extractedText = '';
    let pageCount = 1;

    try {
      // Try native PDF text extraction first
      const pdfData = await pdfParse(dataBuffer);
      extractedText = pdfData.text;
      pageCount = pdfData.numpages;

      // If native extraction yields little text, it's likely scanned — use Vision OCR
      if (extractedText.trim().length < 50) {
        logger.info('PDF appears to be scanned. Falling back to Vision OCR.');
        return await this._processPDFWithVision(filePath, pageCount);
      }
    } catch {
      logger.warn('Native PDF parse failed, trying Vision OCR');
      return await this._processPDFWithVision(filePath, pageCount);
    }

    return {
      text: extractedText,
      pages: pageCount,
      confidence: 0.95, // Native PDF text is high confidence
      blocks: [],
    };
  }

  async _processPDFWithVision(filePath, pageCount) {
    if (!this.client) {
      return this._mockOCR(filePath);
    }

    const fileContent = fs.readFileSync(filePath);
    const base64Content = fileContent.toString('base64');

    const [result] = await this.client.documentTextDetection({
      image: { content: base64Content },
      imageContext: { languageHints: ['en'] },
    });

    return {
      text: result.fullTextAnnotation?.text || '',
      pages: pageCount,
      confidence: this._extractConfidence(result),
      blocks: this._extractBlocks(result),
    };
  }

  /**
   * Pre-process image: auto-rotate, enhance contrast for scans
   */
  async _preprocessImage(filePath) {
    const ext = path.extname(filePath);
    const processedPath = filePath.replace(ext, `_processed${ext}`);

    try {
      await sharp(filePath)
        .rotate() // Auto-rotate based on EXIF
        .normalize() // Normalize pixel values (improves contrast)
        .sharpen() // Sharpen for better OCR
        .toFile(processedPath);

      return processedPath;
    } catch (err) {
      logger.warn('Image preprocessing failed, using original:', err.message);
      return filePath;
    }
  }

  _extractConfidence(result) {
    const pages = result.fullTextAnnotation?.pages || [];
    if (!pages.length) return 0;

    let totalConf = 0;
    let count = 0;

    pages.forEach(page => {
      page.blocks?.forEach(block => {
        block.paragraphs?.forEach(para => {
          para.words?.forEach(word => {
            if (word.confidence !== undefined) {
              totalConf += word.confidence;
              count++;
            }
          });
        });
      });
    });

    return count > 0 ? totalConf / count : 0.8;
  }

  _extractBlocks(result) {
    const blocks = [];
    const pages = result.fullTextAnnotation?.pages || [];

    pages.forEach(page => {
      page.blocks?.forEach(block => {
        const text = block.paragraphs
          ?.map(p => p.words?.map(w => w.symbols?.map(s => s.text).join('')).join(' ')).join('\n') || '';
        if (text.trim()) {
          blocks.push({
            text: text.trim(),
            bounding_box: block.boundingBox,
          });
        }
      });
    });

    return blocks;
  }

  /**
   * Mock OCR for development/testing without credentials
   */
  _mockOCR(filePath) {
    logger.warn('Using MOCK OCR - no real extraction performed');
    return {
      text: `INSURANCE CLAIM FORM

Claim ID: CLM-2024-00123
Policy Number: POL-987654321
Claimant Name: John Michael Smith
Date of Incident: 15/03/2024
Claim Amount: $4,250.00
Hospital/Service Provider: City General Hospital
Contact: john.smith@email.com | +1-555-0123
Supporting Documents: Invoice #INV-2024-456, Medical Report #MR-2024-789

Description of Incident:
Patient was admitted for emergency appendectomy surgery on the date of incident.
Total medical expenses incurred as listed in the attached invoice.`,
      pages: 1,
      confidence: 0.91,
      blocks: [],
      is_mock: true,
    };
  }
}

module.exports = new OCRService();
