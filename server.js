// ═══════════════════════════════════════════════════════════════
//  SAJAN BANGLES — Node.js Backend Server
//  Features: Razorpay payments · Google Sheets DB · WhatsApp alerts
//  Run: node server.js
// ═══════════════════════════════════════════════════════════════

const express        = require('express');
const cors           = require('cors');
const crypto         = require('crypto');
const Razorpay       = require('razorpay');
const { google }     = require('googleapis');
const axios          = require('axios');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static('public')); // serve frontend HTML from /public

// ── Razorpay Instance ──────────────────────────────────────────
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Google Sheets Auth ─────────────────────────────────────────
const sheetsAuth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth: sheetsAuth });
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

// ══════════════════════════════════════════════════════════════
//  HELPER: Generate Order ID
// ══════════════════════════════════════════════════════════════
function generateOrderId() {
  const d   = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `SB-${ymd}-${rnd}`;
}

// ══════════════════════════════════════════════════════════════
//  HELPER: Save Order to Google Sheets
// ══════════════════════════════════════════════════════════════
async function saveToGoogleSheets(orderData, paymentStatus, paymentId = '') {
  try {
    const now   = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const items = orderData.items
      .map(i => `${i.name} (${i.cn}, Sz:${i.sz}) x${i.qty} = ₹${i.price * i.qty}`)
      .join(' | ');

    const row = [
      orderData.orderId,                   // A: Order ID
      now,                                 // B: Date & Time
      orderData.customer.name,             // C: Customer Name
      orderData.customer.phone,            // D: Phone
      orderData.customer.email || '-',     // E: Email
      orderData.customer.address,          // F: Address
      items,                               // G: Items
      `₹${orderData.total}`,               // H: Total Amount
      paymentStatus,                       // I: Payment Status (PAID/COD/PENDING)
      paymentId || '-',                    // J: Payment ID (Razorpay)
      orderData.coupon || '-',             // K: Coupon Used
      'Confirmed',                         // L: Order Status
      '',                                  // M: Tracking ID (fill later)
      '',                                  // N: Notes
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range:         'Orders!A:N',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [row] },
    });

    console.log(`✅ Order ${orderData.orderId} saved to Google Sheets`);
    return true;
  } catch (err) {
    console.error('❌ Google Sheets error:', err.message);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
//  HELPER: Send WhatsApp Alert via Twilio
// ══════════════════════════════════════════════════════════════
async function sendWhatsAppAlert(orderData, paymentStatus) {
  try {
    const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM_WA      = process.env.TWILIO_WHATSAPP_FROM; // whatsapp:+14155238886
    const TO_WA        = `whatsapp:${process.env.OWNER_WHATSAPP}`;  // your number

    const items = orderData.items
      .map(i => `• ${i.name} (${i.cn}, ${i.sz}) x${i.qty}`)
      .join('\n');

    const msg = `🛍️ *NEW ORDER — Sajan Bangles*

📦 Order ID: ${orderData.orderId}
💳 Payment: *${paymentStatus}*
💰 Amount: *₹${orderData.total}*

👤 *Customer:*
Name: ${orderData.customer.name}
Phone: ${orderData.customer.phone}
Address: ${orderData.customer.address}

🛒 *Items:*
${items}

${orderData.coupon ? `🏷️ Coupon: ${orderData.coupon}` : ''}

✅ Log in to Admin Panel to manage this order.`;

    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      new URLSearchParams({ From: FROM_WA, To: TO_WA, Body: msg }),
      {
        auth: { username: TWILIO_SID, password: TWILIO_TOKEN },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    console.log(`📱 WhatsApp alert sent: ${response.data.sid}`);
  } catch (err) {
    console.error('❌ WhatsApp alert error:', err.message);
    // Non-fatal — order still saved even if WA fails
  }
}

// ══════════════════════════════════════════════════════════════
//  HELPER: Send customer confirmation WhatsApp
// ══════════════════════════════════════════════════════════════
async function sendCustomerConfirmation(orderData, paymentStatus) {
  try {
    const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const FROM_WA      = process.env.TWILIO_WHATSAPP_FROM;
    const TO_WA        = `whatsapp:+91${orderData.customer.phone.replace(/\D/g,'')}`;

    const msg = `🪬 *Sajan Bangles — Order Confirmed!*

Namaste ${orderData.customer.name}! 🙏

Your order has been confirmed. 

📦 *Order ID:* ${orderData.orderId}
💰 *Amount:* ₹${orderData.total}
💳 *Payment:* ${paymentStatus === 'COD' ? 'Cash on Delivery' : 'Paid Online ✅'}

🚚 *Estimated Delivery:*
Bihar: 1–2 business days
Other states: 3–5 business days

📞 For any queries:
Call/WhatsApp: 7739929584

Thank you for shopping with us! 💜
*Sajan Bangles, Beladam Patepur, Vaishali Bihar*`;

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
      new URLSearchParams({ From: FROM_WA, To: TO_WA, Body: msg }),
      {
        auth: { username: TWILIO_SID, password: TWILIO_TOKEN },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );
    console.log(`📱 Customer confirmation sent to ${orderData.customer.phone}`);
  } catch (err) {
    console.error('❌ Customer WA error:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════
//  API: Health check
// ══════════════════════════════════════════════════════════════
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '🪬 Sajan Bangles Backend Running!' });
});

// ══════════════════════════════════════════════════════════════
//  API: Create Razorpay Order
//  POST /api/create-order
//  Body: { amount: 1499, receipt: "SB-20250001" }
// ══════════════════════════════════════════════════════════════
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, receipt } = req.body;
    if(!amount || amount < 1) return res.status(400).json({ success: false, error: 'Invalid amount' });

    const order = await razorpay.orders.create({
      amount:   Math.round(amount * 100), // paise
      currency: 'INR',
      receipt:  receipt || generateOrderId(),
      notes:    { source: 'Sajan Bangles Website' },
    });

    console.log(`✅ Razorpay order created: ${order.id} for ₹${amount}`);

    res.json({
      success:     true,
      orderId:     order.id,
      amount:      order.amount,
      currency:    order.currency,
      razorpayKey: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error('❌ Create order error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  API: Verify Razorpay Payment & Save Order
//  POST /api/verify-payment
// ══════════════════════════════════════════════════════════════
app.post('/api/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderData,
    } = req.body;

    // 1. Verify signature
    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      console.error('❌ Invalid payment signature');
      return res.status(400).json({ success: false, error: 'Signature mismatch' });
    }

    // 2. Generate final order ID
    const finalOrderId = generateOrderId();
    orderData.orderId  = finalOrderId;
    orderData.razorpayPaymentId = razorpay_payment_id;

    // 3. Save to Google Sheets
    await saveToGoogleSheets(orderData, 'PAID', razorpay_payment_id);

    // 4. Send WhatsApp alerts (parallel)
    await Promise.all([
      sendWhatsAppAlert(orderData, 'PAID ONLINE ✅'),
      sendCustomerConfirmation(orderData, 'PAID'),
    ]);

    console.log(`✅ Payment verified & order saved: ${finalOrderId}`);

    res.json({
      success: true,
      orderId: finalOrderId,
      paymentId: razorpay_payment_id,
    });
  } catch (err) {
    console.error('❌ Verify payment error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  API: Cash on Delivery Order
//  POST /api/cod-order
// ══════════════════════════════════════════════════════════════
app.post('/api/cod-order', async (req, res) => {
  try {
    const { orderData } = req.body;
    const finalOrderId  = generateOrderId();
    orderData.orderId   = finalOrderId;

    // Save to Google Sheets
    await saveToGoogleSheets(orderData, 'COD');

    // Send WhatsApp alerts
    await Promise.all([
      sendWhatsAppAlert(orderData, 'CASH ON DELIVERY 💵'),
      sendCustomerConfirmation(orderData, 'COD'),
    ]);

    console.log(`✅ COD order saved: ${finalOrderId}`);

    res.json({ success: true, orderId: finalOrderId });
  } catch (err) {
    console.error('❌ COD order error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  API: Get All Orders (for Admin Dashboard)
//  GET /api/orders?secret=YOUR_ADMIN_SECRET
// ══════════════════════════════════════════════════════════════
app.get('/api/orders', async (req, res) => {
  try {
    // Simple secret-based auth for admin
    if(req.query.secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Orders!A2:N1000',
    });

    const rows   = response.data.values || [];
    const orders = rows.map(r => ({
      orderId:       r[0]  || '',
      date:          r[1]  || '',
      name:          r[2]  || '',
      phone:         r[3]  || '',
      email:         r[4]  || '',
      address:       r[5]  || '',
      items:         r[6]  || '',
      total:         r[7]  || '',
      paymentStatus: r[8]  || '',
      paymentId:     r[9]  || '',
      coupon:        r[10] || '',
      orderStatus:   r[11] || '',
      trackingId:    r[12] || '',
      notes:         r[13] || '',
    })).reverse(); // newest first

    res.json({ success: true, orders, total: orders.length });
  } catch (err) {
    console.error('❌ Get orders error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  API: Update Order Status (Admin action)
//  POST /api/update-order
// ══════════════════════════════════════════════════════════════
app.post('/api/update-order', async (req, res) => {
  try {
    if(req.body.secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { orderId, status, trackingId, notes } = req.body;

    // Find row in sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Orders!A:A',
    });
    const rows   = response.data.values || [];
    const rowIdx = rows.findIndex(r => r[0] === orderId);
    if(rowIdx === -1) return res.status(404).json({ error: 'Order not found' });

    const rowNum = rowIdx + 1; // 1-indexed, header is row 1

    // Update columns L (status), M (tracking), N (notes)
    if(status)     await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `Orders!L${rowNum}`, valueInputOption: 'USER_ENTERED', resource: { values: [[status]] } });
    if(trackingId) await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `Orders!M${rowNum}`, valueInputOption: 'USER_ENTERED', resource: { values: [[trackingId]] } });
    if(notes)      await sheets.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `Orders!N${rowNum}`, valueInputOption: 'USER_ENTERED', resource: { values: [[notes]] } });

    // Send WhatsApp update to customer if status changed
    if(status === 'Shipped' && trackingId) {
      try {
        // Get customer phone from sheet row
        const rowData = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `Orders!A${rowNum}:N${rowNum}`,
        });
        const row = rowData.data.values?.[0];
        if(row) {
          const TWILIO_SID   = process.env.TWILIO_ACCOUNT_SID;
          const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
          const FROM_WA      = process.env.TWILIO_WHATSAPP_FROM;
          const custPhone    = row[3];
          const msg = `📦 *Sajan Bangles — Order Shipped!*

Namaste! Your order *${orderId}* has been shipped!

🚚 Tracking ID: *${trackingId}*
📍 Delivery expected in 2–5 days.

For help: WhatsApp 7739929584
🪬 Sajan Bangles, Vaishali Bihar`;

          await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
            new URLSearchParams({ From: FROM_WA, To: `whatsapp:+91${custPhone}`, Body: msg }),
            { auth: { username: TWILIO_SID, password: TWILIO_TOKEN }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
          );
        }
      } catch(e) { console.log('WA update failed:', e.message); }
    }

    res.json({ success: true, message: `Order ${orderId} updated` });
  } catch (err) {
    console.error('❌ Update order error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  API: Dashboard Stats
//  GET /api/stats?secret=YOUR_ADMIN_SECRET
// ══════════════════════════════════════════════════════════════
app.get('/api/stats', async (req, res) => {
  try {
    if(req.query.secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Orders!A2:N1000',
    });

    const rows   = response.data.values || [];
    const orders = rows.map(r => ({
      orderId: r[0], date: r[1], total: parseFloat((r[7]||'0').replace('₹','')),
      paymentStatus: r[8], orderStatus: r[11],
    }));

    const today = new Date().toLocaleDateString('en-IN');
    const todayOrders = orders.filter(o => o.date && o.date.startsWith(today.split('/').reverse().join('/')));

    res.json({
      success: true,
      stats: {
        totalOrders:    orders.length,
        todayOrders:    todayOrders.length,
        totalRevenue:   '₹' + orders.reduce((s,o)=>s+o.total,0).toLocaleString('en-IN'),
        todayRevenue:   '₹' + todayOrders.reduce((s,o)=>s+o.total,0).toLocaleString('en-IN'),
        paidOrders:     orders.filter(o=>o.paymentStatus==='PAID').length,
        codOrders:      orders.filter(o=>o.paymentStatus==='COD').length,
        pendingOrders:  orders.filter(o=>o.orderStatus==='Confirmed').length,
        shippedOrders:  orders.filter(o=>o.orderStatus==='Shipped').length,
        deliveredOrders:orders.filter(o=>o.orderStatus==='Delivered').length,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
//  Start Server
// ══════════════════════════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   🪬  SAJAN BANGLES BACKEND RUNNING      ║
║   Port: ${PORT}                              ║
║   Health: http://localhost:${PORT}/api/health ║
╚══════════════════════════════════════════╝
  `);
});
