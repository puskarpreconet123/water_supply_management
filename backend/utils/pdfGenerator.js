const PDFDocument = require('pdfkit');

/**
 * Generates a Water Statement PDF and streams it.
 */
const generateReportPDF = (res, { vendor, customer, orders, payments, stats }) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

  // Stream directly to response
  doc.pipe(res);

  // --- HEADER SECTION ---
  doc.fillColor('#0f172a') // Dark Navy
     .fontSize(22)
     .text('H2O DELIVERY MANAGEMENT', { align: 'center', wordSpacing: 2 });
  
  doc.fontSize(10)
     .fillColor('#64748b')
     .text('Vendor Statement & Logs Report', { align: 'center' });
  
  doc.moveDown(0.5);
  
  // Ocean blue decorative bar
  doc.rect(50, doc.y, 495, 4).fill('#0ea5e9');
  doc.moveDown(1.5);

  // --- VENDOR & ACCOUNT INFO ---
  const startY = doc.y;
  
  doc.fillColor('#1e293b').fontSize(12).text('FROM (VENDOR):', 50, startY, { bold: true });
  doc.fontSize(10).fillColor('#475569');
  doc.text(`Name: ${vendor.name}`);
  doc.text(`Phone: ${vendor.phone}`);
  if (vendor.email) doc.text(`Email: ${vendor.email}`);

  if (customer) {
    doc.fillColor('#1e293b').fontSize(12).text('TO (CUSTOMER):', 300, startY, { bold: true });
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Name: ${customer.name}`);
    doc.text(`Phone: ${customer.phone}`);
    doc.text(`Address: ${customer.address}`);
  } else {
    doc.fillColor('#1e293b').fontSize(12).text('GENERAL SCOPE:', 300, startY, { bold: true });
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Total Connected Customers: ${stats.customerCount}`);
    doc.text(`Report Period: All-Time`);
  }

  doc.moveDown(2);

  // --- METRICS / STATS BOX ---
  if (customer) {
    const boxY = doc.y;
    doc.rect(50, boxY, 495, 55).fill('#f0f9ff'); // Light Blue background
    doc.strokeColor('#bae6fd').lineWidth(1).stroke();

    doc.fillColor('#0369a1').fontSize(11).text('SUMMARY BALANCE', 65, boxY + 12);
    
    doc.fillColor('#e11d48').fontSize(10).text(`Payments Due: Rs. ${stats.balance}`, 65, boxY + 28, { bold: true });
    doc.fillColor('#0284c7').text(`Outstanding Bottles (Not Returned): ${stats.bottlesOutstanding}`, 300, boxY + 28, { bold: true });
    
    doc.y = boxY + 65;
    doc.moveDown(1.5);
  } else {
    const boxY = doc.y;
    doc.rect(50, boxY, 495, 55).fill('#f8fafc'); // Light slate background
    doc.strokeColor('#e2e8f0').lineWidth(1).stroke();

    doc.fillColor('#334155').fontSize(11).text('VENDOR CUMULATIVE STATS', 65, boxY + 12);
    doc.fontSize(10).fillColor('#475569');
    doc.text(`Total Orders: ${orders.length}`, 65, boxY + 28);
    doc.text(`Total Payments Logged: ${payments.length}`, 300, boxY + 28);

    doc.y = boxY + 65;
    doc.moveDown(1.5);
  }

  // --- ORDERS TABLE ---
  doc.fillColor('#0ea5e9').fontSize(13).text('DELIVERIES & ORDERS', 50, doc.y, { underline: true });
  doc.moveDown(0.5);

  if (orders.length === 0) {
    doc.fillColor('#94a3b8').fontSize(10).text('No order records found.');
    doc.moveDown(1);
  } else {
    // Table Header
    const orderHeaderY = doc.y;
    doc.rect(50, orderHeaderY, 495, 20).fill('#0ea5e9');
    doc.fillColor('#ffffff').fontSize(9);
    doc.text('Date', 55, orderHeaderY + 6);
    doc.text('Customer', 120, orderHeaderY + 6);
    doc.text('Items', 220, orderHeaderY + 6);
    doc.text('Deliv/Ret', 360, orderHeaderY + 6);
    doc.text('Total (Rs)', 440, orderHeaderY + 6);
    doc.text('Status', 495, orderHeaderY + 6);
    doc.y = orderHeaderY + 25;

    orders.forEach((o) => {
      // Check if page needs to break
      if (doc.y > 750) {
        doc.addPage();
        doc.rect(50, 40, 495, 20).fill('#0ea5e9');
        doc.fillColor('#ffffff').fontSize(9);
        doc.text('Date', 55, 46);
        doc.text('Customer', 120, 46);
        doc.text('Items', 220, 46);
        doc.text('Deliv/Ret', 360, 46);
        doc.text('Total (Rs)', 440, 46);
        doc.text('Status', 495, 46);
        doc.y = 70;
      }

      const dateStr = new Date(o.createdAt).toLocaleDateString();
      const custName = o.customerId?.name || 'Unknown';
      const itemsStr = o.products.map(p => `${p.name} (x${p.quantity})`).join(', ');
      const bottlesStr = `D: ${o.bottlesDelivered} / R: ${o.bottlesReturned}`;
      
      doc.fillColor('#334155').fontSize(8);
      
      const currentY = doc.y;
      doc.text(dateStr, 55, currentY);
      doc.text(custName.substring(0, 16), 120, currentY);
      doc.text(itemsStr.substring(0, 28), 220, currentY);
      doc.text(bottlesStr, 360, currentY);
      doc.text(o.totalAmount.toString(), 440, currentY);
      
      // Status styling colors
      if (o.status === 'delivered') {
        doc.fillColor('#10b981').text('DELIVERED', 495, currentY);
      } else if (o.status === 'cancelled') {
        doc.fillColor('#ef4444').text('CANCELLED', 495, currentY);
      } else {
        doc.fillColor('#f59e0b').text('PENDING', 495, currentY);
      }
      
      doc.y = currentY + 15;
    });
    doc.moveDown(1.5);
  }

  // --- PAYMENTS TABLE ---
  doc.fillColor('#0ea5e9').fontSize(13).text('PAYMENTS RECEIVED', 50, doc.y, { underline: true });
  doc.moveDown(0.5);

  if (payments.length === 0) {
    doc.fillColor('#94a3b8').fontSize(10).text('No payment records found.');
  } else {
    const payHeaderY = doc.y;
    doc.rect(50, payHeaderY, 495, 20).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(9);
    doc.text('Date', 55, payHeaderY + 6);
    doc.text('Customer', 120, payHeaderY + 6);
    doc.text('Payment Method', 240, payHeaderY + 6);
    doc.text('Notes', 350, payHeaderY + 6);
    doc.text('Amount Received (Rs)', 445, payHeaderY + 6);
    doc.y = payHeaderY + 25;

    payments.forEach((p) => {
      if (doc.y > 750) {
        doc.addPage();
        doc.rect(50, 40, 495, 20).fill('#0f172a');
        doc.fillColor('#ffffff').fontSize(9);
        doc.text('Date', 55, 46);
        doc.text('Customer', 120, 46);
        doc.text('Payment Method', 240, 46);
        doc.text('Notes', 350, 46);
        doc.text('Amount Received (Rs)', 445, 46);
        doc.y = 70;
      }

      const dateStr = new Date(p.paymentDate).toLocaleDateString();
      const custName = p.customerId?.name || 'Unknown';
      const payMethod = p.paymentMethod.toUpperCase();
      const notesText = p.notes || '—';
      const amountStr = `+ Rs. ${p.amount}`;
      
      doc.fillColor('#334155').fontSize(8);
      const currentY = doc.y;

      // Calculate dynamic row height based on text wrapping
      const notesHeight = doc.heightOfString(notesText, { width: 90 });
      const custHeight = doc.heightOfString(custName, { width: 110 });
      const rowHeight = Math.max(15, notesHeight, custHeight) + 4;

      doc.text(dateStr, 55, currentY);
      doc.text(custName, 120, currentY, { width: 110 });
      doc.text(payMethod, 240, currentY, { width: 100 });
      doc.text(notesText, 350, currentY, { width: 90 });
      doc.fillColor('#10b981').text(amountStr, 445, currentY, { width: 95, bold: true });

      doc.y = currentY + rowHeight;
    });
  }

  // Footer page numbering
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    
    // Temporarily set bottom margin to 0 to prevent triggering automatic page breaks
    const oldBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    
    doc.fillColor('#94a3b8').fontSize(8);
    doc.text(
      `Page ${i + 1} of ${range.count} — Generated automatically by H2O Delivery Platform`,
      50,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - 100, lineBreak: false }
    );
    
    // Restore bottom margin
    doc.page.margins.bottom = oldBottomMargin;
  }

  // Finalize PDF
  doc.end();
};

module.exports = { generateReportPDF };
