/**
 * Image import — a straight photo or screenshot of a resume (JPG, PNG, WebP…).
 *
 * People very often have a photo of their resume rather than a PDF, so this
 * path exists: decode → fix the page (crop the desk, stretch contrast) → OCR →
 * hand the text to the same resume parser the PDF path uses.
 */

import { ocrAssetMode, ocrImageFile } from './ocr';
import type { OcrProgress } from './ocr';

export interface ImageExtractResult {
  text: string;
  method: 'ocr';
  imageChars: number;
  confidence: number;
  warning?: string;
}

export async function extractFromImage(
  file: File,
  onProgress?: (p: OcrProgress) => void,
): Promise<ImageExtractResult> {
  const mode = await ocrAssetMode().catch(() => 'cdn' as const);
  const out = await ocrImageFile(file, {
    onProgress,
    isFirstPage: true,
  });

  const text = out.text.trim();
  if (text.replace(/\s/g, '').length < 20) {
    throw new Error(
      'No text could be read from this image — it may be blurry, dark, or a photo of something else. ' +
      'Take a straight, well-lit photo of the page (or a screenshot) and try again.',
    );
  }

  const warnings: string[] = [
    `Read from an image with OCR (${mode === 'cdn' ? 'engine downloaded once' : 'runs offline'}). Check names, numbers and dates.`,
  ];
  if (out.cropped) warnings.push('The dark background around the page was cropped automatically.');
  if (out.confidence && out.confidence < 65) {
    warnings.push(`OCR confidence was low (${Math.round(out.confidence)}%) — please proofread the fields.`);
  }

  return {
    text,
    method: 'ocr',
    imageChars: text.replace(/\s/g, '').length,
    confidence: Math.round(out.confidence || 0),
    warning: warnings.join(' '),
  };
}
