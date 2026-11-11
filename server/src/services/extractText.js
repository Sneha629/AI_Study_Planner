const { PDFParse } = require('pdf-parse')

// Thrown for files we cannot read; the route turns it into a 400
class ExtractError extends Error {
  constructor(message) {
    super(message)
    this.status = 400
  }
}

// Collapse the extra blank lines and page-break noise PDFs produce
function clean(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function fromPdf(buffer) {
  // Every real PDF starts with "%PDF-"; a renamed .exe or .docx does not
  if (buffer.subarray(0, 5).toString('latin1') !== '%PDF-') {
    throw new ExtractError('This file is not a valid PDF')
  }
  const parser = new PDFParse({ data: new Uint8Array(buffer) })
  try {
    const result = await parser.getText()
    // pdf-parse adds "-- 1 of 3 --" page markers; they are not part of the notes
    return result.text.replace(/^-- \d+ of \d+ --$/gm, '')
  } catch (err) {
    if (err.name === 'PasswordException') {
      throw new ExtractError('This PDF is password protected')
    }
    throw new ExtractError('Could not read this PDF')
  } finally {
    await parser.destroy()
  }
}

function fromTxt(buffer) {
  // A NUL byte means binary data, not a text file
  if (buffer.includes(0)) {
    throw new ExtractError('This file is not a plain text file')
  }
  return buffer.toString('utf8').replace(/^﻿/, '')
}

// Returns the cleaned text of a .pdf or .txt upload
async function extractText(buffer, fileType) {
  const raw = fileType === 'pdf' ? await fromPdf(buffer) : fromTxt(buffer)
  const text = clean(raw)
  if (!text) {
    throw new ExtractError(
      fileType === 'pdf'
        ? 'No text found in this PDF. Scanned PDFs (photos of pages) are not supported yet'
        : 'This file is empty',
    )
  }
  return text
}

module.exports = { extractText, ExtractError }
