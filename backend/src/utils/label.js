const PDFDocument = require('pdfkit');
const { getStreamAsBuffer } = require('get-stream');

/**
 * Generate a simple shipping label PDF for an order.
 * @param {Object} order
 * @returns {Promise<Buffer>}
 */
async function generateLabelPdf(order) {
  const doc = new PDFDocument({ size: [288, 432], margins: { top: 10, left: 10, right: 10, bottom: 10 } });

  doc.fontSize(12).text('COURIER SERVICE', { align: 'center' });
  doc.moveDown(0.5);

  doc.fontSize(10).text(`Tracking: ${order.trackingNumber}`);
  doc.moveDown(0.5);

  doc.fontSize(10).text('Sender:');
  doc.fontSize(9).text(order.user?.name || 'Dispatch', { indent: 8 });
  doc.moveDown(0.5);

  doc.fontSize(10).text('Receiver:');
  doc.fontSize(9).text(order.customerName, { indent: 8 });
  doc.fontSize(9).text(order.phoneNumber, { indent: 8 });
  doc.fontSize(9).text(order.address + ', ' + order.city, { indent: 8 });
  doc.moveDown(0.5);

  if (order.paymentType) {
    doc.fontSize(9).text(`Payment: ${order.paymentType}${order.codAmount ? ' - COD: ' + order.codAmount : ''}`);
  }

  if (order.isFragile) {
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('red').text('FRAGILE - HANDLE WITH CARE', { align: 'center' });
    doc.fillColor('black');
  }

  doc.moveDown(1);
  doc.fontSize(9).text('Items:');
  doc.fontSize(9).text(order.items || '-', { indent: 8 });

  doc.moveDown(1);
  doc.fontSize(9).text(`Generated: ${new Date().toLocaleString()}`);

  // finalize
  doc.end();

  // get buffer
  const buffer = await getStreamAsBuffer(doc);
  return buffer;
}

module.exports = { generateLabelPdf };