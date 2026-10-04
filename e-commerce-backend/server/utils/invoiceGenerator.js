const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');

// ── Brand constants ──
const SITE    = 'Buraq Flower Exports';
const TAGLINE = 'Premium roses & blooms from Hosur to the world';
const ADDRESS = 'Flat-138, Thotagari road, Goldan City, Hosur, Tamil Nadu – 635109';
const PHONE   = '+91 9092849130';
const WEBSITE = 'buraqflowerexports.shop';
const EMAIL   = 'anees2785@gmail.com';

// ── Palette ──
const GOLD     = '#B8960C';
const DARK     = '#1A1A1A';
const CREAM    = '#F5F0E8';
const MUTED    = '#6B7280';
const LIGHT_BG = '#FDFAF6';
const BORDER   = '#E8E0D4';
const WHITE    = '#FFFFFF';

function generateInvoice(res, order, outputPath) {
  const invoicesDir = path.dirname(outputPath);
  if (!fs.existsSync(invoicesDir)) fs.mkdirSync(invoicesDir, { recursive: true });

  const PDFDoc = new PDFDocument({ margin: 0, size: 'A4', autoFirstPage: true, bufferPages: true });
  const writeStream = fs.createWriteStream(outputPath);
  PDFDoc.pipe(writeStream);

  const PW       = PDFDoc.page.width;   // 595
  const PH       = PDFDoc.page.height;  // 841
  const ML       = 48;                  // left margin
  const MR       = 48;                  // right margin
  const INNER    = PW - ML - MR;       // 499
  const invoiceNo   = `INV-${order._id.toString().slice(-8).toUpperCase()}`;
  const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const logoPath = path.join(__dirname, '..', '..', '..', 'e-commerce-frontend', 'src', 'assets', 'logo.png');
  const hasLogo  = fs.existsSync(logoPath);

  // ── Gold left accent bar ──
  PDFDoc.rect(0, 0, 5, PH).fill(GOLD);

  // ── HEADER band ──
  const HDR_H = 96;
  PDFDoc.rect(5, 0, PW - 5, HDR_H).fill(DARK);

  // Logo
  let textX = ML;
  if (hasLogo) {
    try { PDFDoc.image(logoPath, ML, 20, { width: 52, height: 52 }); textX = ML + 62; } catch (_) {}
  }

  // Left: company info
  PDFDoc.font('Helvetica-Bold').fontSize(20).fillColor(CREAM)
        .text(SITE, textX, 18, { lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(7.5).fillColor(GOLD)
        .text(TAGLINE, textX, 44, { lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(7).fillColor('#AAAAAA')
        .text('Flat-138, Thotagari road, Goldan City', textX, 58, { lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(7).fillColor('#AAAAAA')
        .text('Hosur, Tamil Nadu – 635109  |  ' + PHONE, textX, 70, { lineBreak: false });

  // Right: INVOICE label + number + date
  const RW = 150;
  const RX = PW - MR - RW;
  PDFDoc.font('Helvetica-Bold').fontSize(26).fillColor(GOLD)
        .text('INVOICE', RX, 16, { width: RW, align: 'right', lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(7.5).fillColor('#CCCCCC')
        .text(invoiceNo, RX, 52, { width: RW, align: 'right', lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(7).fillColor('#AAAAAA')
        .text(invoiceDate, RX, 66, { width: RW, align: 'right', lineBreak: false });

  let y = HDR_H + 24;

  // ── INFO CARDS ──
  const CARD_GAP = 14;
  const CARD_W   = (INNER - CARD_GAP) / 2;
  const CARD_H   = 88;
  const CX1      = ML;
  const CX2      = ML + CARD_W + CARD_GAP;

  // Card fills + borders
  PDFDoc.rect(CX1, y, CARD_W, CARD_H).fillAndStroke(LIGHT_BG, BORDER);
  PDFDoc.rect(CX2, y, CARD_W, CARD_H).fillAndStroke(LIGHT_BG, BORDER);
  // Gold top strip
  PDFDoc.rect(CX1, y, CARD_W, 3).fill(GOLD);
  PDFDoc.rect(CX2, y, CARD_W, 3).fill(GOLD);

  // BILL TO card
  const PAD = 10;
  const sa = order.shippingAddress;
  // Build address lines from shippingAddress object, fallback to flat order.address string
  const addrParts = sa
    ? [sa.address, sa.city, sa.postalCode].filter(Boolean)
    : (order.address ? [order.address] : []);
  const customerPhone = sa?.phone || '';

  PDFDoc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
        .text('BILL TO', CX1 + PAD, y + PAD + 2, { lineBreak: false });
  PDFDoc.font('Helvetica-Bold').fontSize(10).fillColor(DARK)
        .text(order.user?.name || 'Customer', CX1 + PAD, y + 22, { width: CARD_W - PAD * 2, lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(8).fillColor(MUTED)
        .text(order.user?.email || '', CX1 + PAD, y + 36, { width: CARD_W - PAD * 2, lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
        .text(addrParts.join(', '), CX1 + PAD, y + 50, { width: CARD_W - PAD * 2, lineBreak: false });
  if (customerPhone) {
    PDFDoc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
          .text(customerPhone, CX1 + PAD, y + 64, { lineBreak: false });
  }

  // ORDER DETAILS card
  PDFDoc.font('Helvetica-Bold').fontSize(7).fillColor(GOLD)
        .text('ORDER DETAILS', CX2 + PAD, y + PAD + 2, { lineBreak: false });

  const detailRows = [
    ['Payment',  order.paymentMethod || 'Cash on Delivery'],
    ['Status',   order.isPaid ? 'PAID' : 'UNPAID'],
    ['Order #',  invoiceNo],
  ];
  if (order.deliveryDate) {
    detailRows.push(['Delivery', new Date(order.deliveryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })]);
  }

  const LBL_W = 52;
  const VAL_X = CX2 + PAD + LBL_W + 4;
  const VAL_W = CARD_W - PAD * 2 - LBL_W - 4;

  detailRows.forEach((row, i) => {
    const ry = y + 22 + i * 15;
    PDFDoc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
          .text(row[0] + ':', CX2 + PAD, ry, { width: LBL_W, lineBreak: false });
    const isPayStatus = row[0] === 'Status';
    const valColor = isPayStatus ? (order.isPaid ? '#10B981' : '#F59E0B') : DARK;
    PDFDoc.font('Helvetica-Bold').fontSize(7.5).fillColor(valColor)
          .text(row[1], VAL_X, ry, { width: VAL_W, lineBreak: false });
  });

  y += CARD_H + 22;

  // ── ITEMS TABLE ──
  // Columns: ITEM(230) | QTY(50) | UNIT PRICE(90) | AMOUNT(80) — total=450, padded within INNER=499
  // All positions are absolute x on the page
  const COL_ITEM_X  = ML + 8;          // 56  — item text start (8px inner padding)
  const COL_ITEM_W  = 220;             // item name width
  const COL_QTY_X   = ML + 248;        // 296 — qty column start
  const COL_QTY_W   = 50;             // qty width
  const COL_UNIT_X  = ML + 308;        // 356 — unit price start
  const COL_UNIT_W  = 90;             // unit price width
  const COL_AMT_X   = ML + 408;        // 456 — amount start
  const COL_AMT_W   = PW - MR - (ML + 408) - 4; // 595-48-456-4 = 87

  const TH_H = 26;
  const ROW_H = 24;

  // Table header background
  PDFDoc.rect(ML, y, INNER, TH_H).fill(DARK);
  PDFDoc.font('Helvetica-Bold').fontSize(8).fillColor(CREAM);
  PDFDoc.text('ITEM DESCRIPTION', COL_ITEM_X,  y + 9, { width: COL_ITEM_W, lineBreak: false });
  PDFDoc.text('QTY',              COL_QTY_X,   y + 9, { width: COL_QTY_W,  align: 'center', lineBreak: false });
  PDFDoc.text('UNIT PRICE',       COL_UNIT_X,  y + 9, { width: COL_UNIT_W, align: 'right',  lineBreak: false });
  PDFDoc.text('AMOUNT',           COL_AMT_X,   y + 9, { width: COL_AMT_W,  align: 'right',  lineBreak: false });
  y += TH_H;

  let subtotal = 0;
  order.orderItems.forEach((item, i) => {
    const qty       = item.quantity || item.qty || 1;
    const price     = Number(item.price) || 0;
    const lineTotal = price * qty;
    subtotal += lineTotal;

    PDFDoc.rect(ML, y, INNER, ROW_H).fill(i % 2 === 0 ? LIGHT_BG : WHITE);
    if (i % 2 === 0) PDFDoc.rect(ML, y, 3, ROW_H).fill('#D4B84A');

    PDFDoc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
          .text(item.name || '', COL_ITEM_X, y + 7, { width: COL_ITEM_W, lineBreak: false });
    if (item.selectedOption?.label) {
      PDFDoc.font('Helvetica').fontSize(7).fillColor(MUTED)
            .text(item.selectedOption.label, COL_ITEM_X, y + 17, { width: COL_ITEM_W, lineBreak: false });
    }
    PDFDoc.font('Helvetica').fontSize(8.5).fillColor(DARK)
          .text(String(qty),                                      COL_QTY_X,  y + 7, { width: COL_QTY_W,  align: 'center', lineBreak: false });
    PDFDoc.font('Helvetica').fontSize(8.5).fillColor(DARK)
          .text('Rs.' + price.toLocaleString('en-IN'),            COL_UNIT_X, y + 7, { width: COL_UNIT_W, align: 'right',  lineBreak: false });
    PDFDoc.font('Helvetica').fontSize(8.5).fillColor(DARK)
          .text('Rs.' + lineTotal.toLocaleString('en-IN'),        COL_AMT_X,  y + 7, { width: COL_AMT_W,  align: 'right',  lineBreak: false });
    y += ROW_H;
  });

  // Table bottom border
  PDFDoc.rect(ML, y, INNER, 1).fill(BORDER);
  y += 14;

  // ── TOTALS (right-aligned block) ──
  const grandTotal = order.totalAmount || order.totalPrice || subtotal;
  const shipping   = grandTotal - subtotal > 0 ? grandTotal - subtotal : 0;

  const totRow = (label, value) => {
    PDFDoc.font('Helvetica').fontSize(8.5).fillColor(MUTED)
          .text(label, COL_UNIT_X, y, { width: COL_UNIT_W, align: 'right', lineBreak: false });
    PDFDoc.font('Helvetica-Bold').fontSize(8.5).fillColor(DARK)
          .text(value, COL_AMT_X, y, { width: COL_AMT_W, align: 'right', lineBreak: false });
    y += 18;
  };

  totRow('Subtotal', 'Rs.' + subtotal.toLocaleString('en-IN'));
  if (shipping > 0) totRow('Shipping', 'Rs.' + shipping.toLocaleString('en-IN'));
  if (order.couponCode) {
    PDFDoc.font('Helvetica').fontSize(8).fillColor('#10B981')
          .text('Coupon: ' + order.couponCode, COL_UNIT_X, y, { width: COL_UNIT_W + COL_AMT_W, align: 'right', lineBreak: false });
    y += 14;
  }

  // Grand total gold box — spans from unit col start to right margin
  const GT_X = COL_UNIT_X - 8;
  const GT_W = PW - MR - GT_X;
  PDFDoc.rect(GT_X, y, GT_W, 30).fill(GOLD);
  PDFDoc.font('Helvetica-Bold').fontSize(9.5).fillColor(WHITE)
        .text('GRAND TOTAL', COL_UNIT_X, y + 10, { width: COL_UNIT_W, align: 'right', lineBreak: false });
  PDFDoc.font('Helvetica-Bold').fontSize(9.5).fillColor(WHITE)
        .text('Rs.' + grandTotal.toLocaleString('en-IN'), COL_AMT_X, y + 10, { width: COL_AMT_W, align: 'right', lineBreak: false });
  y += 44;

  // ── NOTES strip ──
  if (order.loyaltyPointsEarned > 0 || order.couponCode) {
    let note = '';
    if (order.loyaltyPointsEarned > 0) note += `You earned ${order.loyaltyPointsEarned} loyalty points on this order.  `;
    if (order.couponCode) note += `Coupon "${order.couponCode}" was applied.`;
    PDFDoc.rect(ML, y, INNER, 26).fill(LIGHT_BG);
    PDFDoc.rect(ML, y, 3, 26).fill(GOLD);
    PDFDoc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
          .text(note.trim(), ML + 12, y + 9, { width: INNER - 20, lineBreak: false });
    y += 38;
  }

  // ── FOOTER ──
  const FY = PH - 50;
  PDFDoc.rect(5, FY, PW - 5, 1).fill(GOLD);
  PDFDoc.rect(5, FY + 1, PW - 5, 49).fill(DARK);
  PDFDoc.font('Helvetica-Bold').fontSize(9.5).fillColor(GOLD)
        .text(`Thank you for choosing ${SITE}!`, ML, FY + 11, { width: INNER, align: 'center', lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(7).fillColor('#AAAAAA')
        .text(`${PHONE}  |  ${WEBSITE}  |  ${EMAIL}`, ML, FY + 27, { width: INNER, align: 'center', lineBreak: false });
  PDFDoc.font('Helvetica').fontSize(6.5).fillColor('#777777')
        .text('This is a computer-generated invoice and does not require a signature.', ML, FY + 39, { width: INNER, align: 'center', lineBreak: false });

  PDFDoc.end();
  return writeStream;
}

module.exports = generateInvoice;
