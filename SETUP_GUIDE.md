# 🪬 Sajan Bangles — Complete Backend Setup Guide
## From Zero to Fully Live in 1 Hour

---

## 📁 Files You Have

```
sajan-bangles-v4.html     ← Your website (frontend)
backend/
  server.js               ← Node.js backend (Razorpay + Sheets + WhatsApp)
  admin.html              ← Admin dashboard
  package.json            ← Node.js dependencies
  .env.example            ← Environment variables template
  SETUP_GUIDE.md          ← This file
```

---

## ✅ STEP 1 — Install Node.js (5 minutes)

1. Go to **https://nodejs.org**
2. Download **Node.js LTS** (green button)
3. Install it normally (Next → Next → Finish)
4. Open **Command Prompt** (Windows) or **Terminal** (Mac/Linux)
5. Type: `node --version` → should show v18 or higher ✅

---

## ✅ STEP 2 — Install Backend Dependencies (2 minutes)

```bash
# Open command prompt in the backend folder
cd backend

# Install all packages
npm install

# You should see: added 150+ packages
```

---

## ✅ STEP 3 — Set Up Razorpay (10 minutes)

1. Go to **https://razorpay.com** → Sign Up (free)
2. Verify your phone number
3. Go to **Settings → API Keys**
4. Click **Generate Test Key**
5. You get:
   - `Key ID` → looks like `rzp_test_AbCdEfGh12345`
   - `Key Secret` → looks like `AbCdEfGhIjKlMnOpQrStUvWx`
6. Copy both — you need them in Step 6

> 💡 Use TEST keys first. Switch to LIVE keys after testing.
> LIVE keys need business verification (PAN, bank account)

---

## ✅ STEP 4 — Set Up Google Sheets (15 minutes)

### 4a. Create the Spreadsheet

1. Go to **https://sheets.google.com**
2. Create a new spreadsheet
3. Name it: `Sajan Bangles Orders`
4. In Row 1, add these exact headers in columns A to N:
   ```
   Order ID | Date & Time | Name | Phone | Email | Address |
   Items | Total Amount | Payment Status | Payment ID |
   Coupon | Order Status | Tracking ID | Notes
   ```
5. Copy the **Sheet ID** from the URL:
   - URL: `https://docs.google.com/spreadsheets/d/`**`1BxiMVs0XRA5nFMd...`**`/edit`
   - The bold part is your SHEET_ID

### 4b. Create Google Service Account

1. Go to **https://console.cloud.google.com**
2. Create a new project → name it `Sajan Bangles`
3. Go to **APIs & Services → Library**
4. Search **Google Sheets API** → Enable it
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → Service Account**
7. Name: `sajan-bangles-sheets` → Create
8. Click the service account → **Keys tab**
9. **Add Key → Create new key → JSON** → Download
10. Open the downloaded JSON file → copy ALL the content

### 4c. Share Sheet with Service Account

1. In your Google Sheet → click **Share**
2. Add the service account email (from the JSON: `"client_email": "sajan...@...iam.gserviceaccount.com"`)
3. Give it **Editor** permission
4. Click Send

---

## ✅ STEP 5 — Set Up WhatsApp Alerts via Twilio (10 minutes)

1. Go to **https://www.twilio.com** → Sign Up (free trial)
2. Go to **Console Dashboard** → copy:
   - `Account SID` (starts with `AC...`)
   - `Auth Token`
3. Go to **Messaging → Try WhatsApp**
4. Click **WhatsApp Sandbox** → send the join message from YOUR phone
5. Your FROM number is: `whatsapp:+14155238886` (Twilio sandbox)

> 💡 Free trial = 15 WhatsApp messages. For production,
> upgrade Twilio or use WATI / AiSensy (₹500-1000/month).

---

## ✅ STEP 6 — Configure Your .env File (5 minutes)

```bash
# In the backend folder, create .env file:
cp .env.example .env
```

Open `.env` in Notepad and fill in:

```env
PORT=3000

# From Razorpay Step 3:
RAZORPAY_KEY_ID=rzp_test_AbCdEfGh12345
RAZORPAY_KEY_SECRET=AbCdEfGhIjKlMnOpQrStUvWx

# From Google Sheets Step 4b (paste entire JSON on ONE line):
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"sajan-bangles",...}

# From Google Sheets Step 4a:
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms

# From Twilio Step 5:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Your WhatsApp number (to receive order alerts):
OWNER_WHATSAPP=+917739929584

# Choose any strong password for admin dashboard:
ADMIN_SECRET=MySecretAdmin2025Bihar!
```

---

## ✅ STEP 7 — Run the Backend (1 minute)

```bash
# In the backend folder:
node server.js

# You should see:
# ╔══════════════════════════════════════════╗
# ║   🪬  SAJAN BANGLES BACKEND RUNNING      ║
# ║   Port: 3000                              ║
# ╚══════════════════════════════════════════╝
```

Test it: Open browser → `http://localhost:3000/api/health`
You should see: `{"status":"ok","message":"🪬 Sajan Bangles Backend Running!"}`

---

## ✅ STEP 8 — Connect Frontend to Backend

Open `sajan-bangles-v4.html` in a text editor.

Find this line near the top of the `<script>` section:
```javascript
const BACKEND_URL = window.SAJAN_BACKEND_URL || 'http://localhost:3000';
```

For **local testing**: keep as `http://localhost:3000`
For **live hosting**: change to your server URL (e.g. `https://api.sajanbangles.com`)

---

## ✅ STEP 9 — Test Everything

1. Open `sajan-bangles-v4.html` in your browser
2. Add some bangles to cart
3. Click checkout
4. Fill customer details
5. Select **Pay Online** → click Pay Now
6. In Razorpay TEST popup:
   - Card: `4111 1111 1111 1111`
   - Expiry: any future date
   - CVV: any 3 digits
   - OTP: `1234`
7. Check:
   - ✅ Order success screen appears
   - ✅ Google Sheet gets new row
   - ✅ WhatsApp message comes to your phone
   - ✅ Customer gets WhatsApp confirmation

---

## ✅ STEP 10 — Admin Dashboard

1. Open `admin.html` in your browser
2. Enter:
   - Backend URL: `http://localhost:3000`
   - Admin Secret: (what you set in .env)
3. Click Login
4. You can now:
   - See all orders in real-time
   - Update order status (Confirmed → Packed → Shipped → Delivered)
   - Enter tracking numbers
   - Auto-send WhatsApp updates to customers
   - Export all orders as CSV

---

## 🚀 STEP 11 — Deploy to Production (Go Live!)

### Option A: Railway.app (Easiest, Free tier)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy backend
cd backend
railway init
railway up

# Set environment variables in Railway dashboard
# Copy all your .env values there
```

Your backend goes live at: `https://your-project.railway.app`

### Option B: Render.com (Free tier)

1. Push backend to GitHub
2. Go to render.com → New Web Service
3. Connect GitHub repo
4. Set environment variables
5. Deploy!

### Option C: VPS (Hostinger/DigitalOcean) ₹500/month

```bash
# SSH into server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Upload files, run:
npm install
npm install -g pm2
pm2 start server.js --name sajan-backend
pm2 save
pm2 startup

# Your backend stays running 24/7!
```

---

## 🌐 STEP 12 — Host Website Frontend

### Put your HTML file online:

**Option A: Netlify (Free)**
- Go to netlify.com
- Drag `sajan-bangles-v4.html`, rename to `index.html`
- Get free URL like `sajanbangles.netlify.app`

**Option B: Your own domain**
- Buy `sajanbangles.com` on Hostinger (~₹500/year)
- Upload `sajan-bangles-v4.html` as `index.html` via cPanel

---

## 📊 Your Google Sheet Structure

After setup, orders automatically appear as:

| Order ID | Date | Name | Phone | Email | Address | Items | Total | Payment | Pay ID | Coupon | Status | Tracking | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SB-20250317-1234 | 17/3/2025 | Priya Devi | 9876543210 | p@g.com | Patna Bihar | Plain Lac x2 ₹498 | ₹498 | PAID | rzp_pay_xxx | SAJAN20 | Confirmed | | |

---

## 📱 WhatsApp Alert You Receive (Every new order)

```
🛍️ NEW ORDER — Sajan Bangles

📦 Order ID: SB-20250317-1234
💳 Payment: PAID ONLINE ✅
💰 Amount: ₹1,499

👤 Customer:
Name: Priya Devi
Phone: 9876543210
Address: 123 Gandhi Nagar, Patna Bihar

🛒 Items:
• Bridal Chooda Set (Red, 2/6) x1

✅ Log in to Admin Panel to manage this order.
```

---

## 💰 Total Cost to Go Live

| Service | Cost |
|---|---|
| Node.js hosting (Railway free tier) | ₹0 |
| Frontend hosting (Netlify) | ₹0 |
| Domain `sajanbangles.com` | ~₹500/year |
| Razorpay transaction fee | 2% per order |
| Twilio WhatsApp (after free trial) | ~₹800/month |
| **TOTAL to start** | **~₹500 + 2% per order** |

> 💡 Once you're doing ₹1 lakh/month in sales, Razorpay 2% = ₹2,000.
> That's still much cheaper than any marketplace like Amazon/Flipkart (20-40%).

---

## 🆘 Need Help?

If anything doesn't work:
1. Check terminal for error messages
2. Make sure all `.env` values are correct
3. Test API: `http://localhost:3000/api/health`

**Common Issues:**
- `Cannot find module 'razorpay'` → run `npm install` again
- Google Sheets error → make sure service account has Editor access
- Razorpay error → check KEY_ID and KEY_SECRET in .env
- WhatsApp not sending → join Twilio sandbox first with your phone
