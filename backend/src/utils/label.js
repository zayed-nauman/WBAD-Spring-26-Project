const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { getStreamAsBuffer } = require('get-stream');

const logoPath = path.resolve(__dirname, '../../../frontend/src/assets/logo.png');

const formatDate = (value) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(value))
    .replace(/ /g, '-');

const drawText = (doc, text, x, y, options = {}) => {
  doc
    .font(options.bold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(options.size || 8)
    .fillColor(options.color || '#111')
    .text(String(text ?? ''), x, y, {
      width: options.width,
      height: options.height,
      lineGap: options.lineGap ?? -1,
      ellipsis: options.ellipsis ?? true,
      align: options.align || 'left',
    });
};

const drawRule = (doc, x1, y, x2) => {
  doc.moveTo(x1, y).lineTo(x2, y).strokeColor('#555').lineWidth(0.6).stroke();
};

const drawHeading = (doc, label, x, y, width) => {
  drawText(doc, label, x, y, { bold: true, size: 8, width });
  drawRule(doc, x, y + 11, x + width, y + 11);
};

const drawBarcode = (doc, x, y, value) => {
  const pattern = [2, 1, 1, 3, 1, 2, 3, 1, 1, 2, 1, 3, 2, 1, 1, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1];
  let cursor = x;

  pattern.forEach((width, index) => {
    doc.rect(cursor, y, width, 29).fill(index % 2 === 0 ? '#111' : '#fff');
    cursor += width + 1;
  });

  drawText(doc, value, x + 8, y + 33, { bold: true, size: 8, width: 110, align: 'center' });
};

/**
 * Generate the same compact ZigZag shipping label used by the web preview.
 * @param {Object} order
 * @returns {Promise<Buffer>}
 */
async function generateLabelPdf(order) {
  const doc = new PDFDocument({
    size: [304, 364],
    margins: { top: 0, left: 0, right: 0, bottom: 0 },
    autoFirstPage: true,
  });

  const x = 12;
  const y = 12;
  const width = 280;
  const height = 340;
  const leftX = 28;
  const rightX = 182;
  const leftW = 142;
  const rightW = 88;
  const splitX = 174;
  const detailTop = 108;

  doc.roundedRect(x, y, width, height, 8).strokeColor('#222').lineWidth(0.8).stroke();

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 82, 14, { width: 140 });
  } else {
    drawText(doc, 'ZigZag', 78, 16, { bold: true, size: 24, width: 150, align: 'center' });
    drawText(doc, 'DELIVERY', 116, 42, { bold: true, size: 8, width: 80, align: 'center' });
  }

  drawRule(doc, leftX, detailTop, 276);
  drawText(doc, `Order Number: ${order.trackingNumber}`, leftX, detailTop + 5, { size: 8, width: 220 });
  drawRule(doc, leftX, detailTop + 19, 276);
  doc.moveTo(splitX, detailTop + 20).lineTo(splitX, 338).dash(1, { space: 3 }).strokeColor('#555').lineWidth(0.5).stroke().undash();

  drawHeading(doc, 'RECIPIENT', leftX, detailTop + 23, leftW);
  drawHeading(doc, 'SENDER', rightX, detailTop + 23, rightW);

  drawText(doc, order.receiverName || order.customerName || '-', leftX, detailTop + 38, { bold: true, size: 8, width: leftW });
  drawText(doc, order.city || '-', leftX, detailTop + 51, { size: 8, width: leftW });
  drawText(doc, order.senderName || '-', rightX, detailTop + 38, { bold: true, size: 8, width: rightW });

  drawHeading(doc, 'City', leftX, 162, leftW);
  drawText(doc, order.address || '-', leftX, 176, { size: 7, width: leftW, height: 32, lineGap: -1 });

  drawHeading(doc, 'Weight (kg)', rightX, 162, rightW);
  drawText(doc, order.weightKg || '-', rightX, 176, { size: 8, width: rightW });

  drawHeading(doc, 'No. of Pieces', rightX, 196, rightW);
  drawText(doc, order.numberOfPieces || 1, rightX, 210, { size: 8, width: rightW });

  drawHeading(doc, 'Amount', leftX, 215, leftW);
  drawText(doc, `PKR ${Number(order.codAmount || 0).toLocaleString()}`, leftX, 229, {
    bold: true,
    size: 8,
    width: leftW,
  });

  drawHeading(doc, formatDate(order.createdAt), rightX, 231, rightW);

  drawHeading(doc, 'Phone Number', leftX, 247, leftW);
  drawText(doc, order.phoneNumber || order.receiverPhone || '-', leftX, 261, { size: 8, width: leftW });

  drawHeading(doc, 'Fragile', rightX, 264, rightW);
  drawText(doc, order.isFragile ? 'FRAGILE' : '-', rightX, 283, {
    bold: true,
    size: order.isFragile ? 13 : 10,
    width: rightW,
  });

  drawBarcode(doc, leftX, 286, order.phoneNumber || order.receiverPhone || '-');

  doc.end();
  return getStreamAsBuffer(doc);
}

module.exports = { generateLabelPdf };
