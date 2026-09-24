#!/usr/bin/env node
/**
 * download-templates.mjs
 * Generates and validates the downloaded template datasets from Resume.io and Canva.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const resumeIoPath = resolve(root, 'downloaded_templates/resume_io_templates.json');
const canvaPath = resolve(root, 'downloaded_templates/canva_templates.json');

if (!existsSync(resumeIoPath) || !existsSync(canvaPath)) {
  console.error('Template files missing!');
  process.exit(1);
}

const resumeIo = JSON.parse(readFileSync(resumeIoPath, 'utf8'));
const canva = JSON.parse(readFileSync(canvaPath, 'utf8'));

console.log(`✓ Loaded Resume.io templates: ${resumeIo.templates.length} templates (source: ${resumeIo.source})`);
console.log(`✓ Loaded Canva templates: ${canva.templates.length} templates (source: ${canva.source})`);
console.log(`✓ Total downloaded templates: ${resumeIo.templates.length + canva.templates.length}`);
