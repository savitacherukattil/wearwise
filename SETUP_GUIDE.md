# WearWise — Complete Setup Guide
### For: Savi | Savvy Infotech | June 2025

---

## PART 1 — DEPLOY TO NETLIFY (FREE, 30 minutes)

### Step 1: Create a free Netlify account
1. Go to https://netlify.com
2. Click "Sign up" — use your email or Google account
3. It's completely free — no credit card needed

### Step 2: Add your Anthropic API key (IMPORTANT)
Your website calls the Claude API. You need to store your API key securely.
- In Netlify dashboard → Site settings → Environment variables
- Click "Add a variable"
- Key: `ANTHROPIC_API_KEY`
- Value: your API key from https://console.anthropic.com
- This keeps your key hidden from the public

⚠️ NOTE: Because this is a static site, the API key is currently called
directly from the browser (for demo purposes). For production, you should
set up a Netlify Function to proxy the API call. See PART 4 below.

### Step 3: Deploy your site
Option A — Drag & Drop (easiest):
1. Zip the entire `wearwise` folder
2. Go to https://app.netlify.com
3. Drag the ZIP file onto the deploy area
4. Done! Netlify gives you a URL like: https://wearwise.netlify.app (or your custom domain)

Option B — GitHub (recommended for updates):
1. Create a free GitHub account at https://github.com
2. Create a new repository called "wearwise"
3. Upload all your files there
4. In Netlify: "Import from Git" → connect your GitHub → select the repo
5. Future updates: just push to GitHub and Netlify auto-deploys

### Step 4: Add your custom domain (optional, AED 40/year)
1. Buy a domain at Namecheap or GoDaddy (e.g. wearwise.app or dresssmart.app)
2. In Netlify → Domain settings → Add custom domain
3. Update your domain's DNS to point to Netlify (they give you instructions)
4. Netlify adds free SSL (https) automatically

---

## PART 2 — SET UP AFFILIATE LINKS (FREE, 1-2 hours per program)

### How affiliates work
When a user clicks your shopping link → visits the store → buys something → you earn 4–12% commission. You get paid monthly to your bank account.

### Platform 1: Amazon Associates (UAE)
1. Go to: https://affiliate-program.amazon.com
2. Sign up with your Amazon account
3. Add your website URL: your Netlify URL
4. Once approved (usually instant), go to "Link Builder"
5. In advisor.html, find this line:
   `'amazon.ae': '&tag=wearwise-21',`
6. Replace `wearwise-21` with your actual Amazon tracking ID

### Platform 2: Namshi Affiliate
1. Go to: https://www.namshi.com/affiliate/
2. Fill in the application form
3. Once approved, get your affiliate link format
4. In advisor.html, update:
   `'namshi.com': '?utm_source=wearwise&utm_medium=affiliate',`
5. Replace with: `?aid=YOUR_NAMSHI_AFFILIATE_ID`

### Platform 3: ASOS Affiliate (via Awin)
1. Go to: https://www.awin.com
2. Create a publisher account
3. Search for "ASOS" in the advertiser directory and apply
4. Once approved, get your affiliate tag
5. Update `'asos.com': '?affid=YOUR_ASOS_ID',` in advisor.html

### Platform 4: Shein Affiliate
1. Go to: https://affiliate.shein.com
2. Apply as a content creator / website publisher
3. Get your unique affiliate link prefix
4. Update the Shein URL in advisor.html

### Platform 5: Myntra Affiliate (via admitad or VCommission)
1. Go to: https://www.vcommission.com or https://www.admitad.com
2. Register as a publisher
3. Find Myntra in the advertiser list
4. Apply and get your tracking links

### Expected earnings estimate
- 500 users/month × 30% click through = 150 clicks
- 150 clicks × 10% buy = 15 purchases
- Average order AED 200 × 8% commission = AED 240/month passive income
- Grows with traffic. At 5,000 users/month = AED 2,400/month

---

## PART 3 — SET UP STRIPE PAYMENTS (FREE + 2.9% per transaction)

### Step 1: Create Stripe account
1. Go to: https://stripe.com
2. Sign up — free account
3. Complete business verification (takes 1–2 days)
   - Business type: Individual / Sole trader
   - Business name: Savvy Infotech
   - Country: UAE
   - Add your UAE bank account for payouts

### Step 2: Get your API keys
1. In Stripe Dashboard → Developers → API keys
2. Copy your "Publishable key" (starts with pk_live_...)
3. In checkout.html, find this line:
   `const STRIPE_PK = 'pk_test_YOUR_STRIPE_PUBLISHABLE_KEY_HERE';`
4. Replace with your real publishable key

### Step 3: Create your product & price in Stripe
1. Stripe Dashboard → Products → Add product
2. Name: WearWise Pro
3. Pricing: AED 15, recurring, monthly
4. Copy the Price ID (starts with price_...)
5. You'll use this in your backend function

### Step 4: Create a Netlify Function for payment
(This keeps your secret key safe on the server)

Create file: `netlify/functions/create-payment.js`

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { name, email, priceId } = JSON.parse(event.body);

    // Create customer
    const customer = await stripe.customers.create({ name, email });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        subscriptionId: subscription.id
      })
    };
  } catch (error) {
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }
};
```

### Step 5: Add Stripe secret key to Netlify
- Netlify → Site settings → Environment variables
- Add: `STRIPE_SECRET_KEY` = sk_live_YOUR_SECRET_KEY (never put this in code)

### Step 6: Uncomment the real payment code in checkout.html
In checkout.html, find the comment "REPLACE WITH REAL API CALL"
Uncomment those lines and remove the demo simulation block.

### Stripe fees
- AED 15/month subscription
- Stripe takes ~2.9% + 0.30 AED = about AED 0.73 per transaction
- You keep: AED 14.27 per subscriber per month

---

## PART 4 — PROTECT YOUR API KEY (Important before going live)

Right now the Anthropic API call is made from the browser.
This is OK for testing but means your API key is visible.

To protect it:
1. Create `netlify/functions/get-advice.js`
2. Move the fetch() call to Anthropic there
3. In advisor.html, change the fetch URL from Anthropic's endpoint to:
   `'/.netlify/functions/get-advice'`
4. Add `ANTHROPIC_API_KEY` to Netlify environment variables
5. The function reads it server-side — key never exposed

This is the same pattern you used with your n8n workflows, Savi —
just a different way of keeping secrets on the server side.

---

## COST SUMMARY

| Item | Cost |
|------|------|
| Netlify hosting | FREE |
| Custom domain (optional) | AED 40–60/year |
| Anthropic API (per 1000 users) | ~AED 30 |
| Stripe account | FREE (2.9% per transaction) |
| Affiliate sign-ups | FREE |
| **Total year 1** | **Under AED 100** |

## REVENUE POTENTIAL

| Source | Monthly (500 users) | Monthly (5,000 users) |
|--------|--------------------|-----------------------|
| Affiliate commissions | AED 240 | AED 2,400 |
| Pro subscriptions (5%) | AED 375 | AED 3,750 |
| Brand partnerships | AED 0 | AED 2,000 |
| **Total** | **AED 615** | **AED 8,150** |

---

## NEXT STEPS CHECKLIST

- [ ] Create Netlify account
- [ ] Upload/deploy the wearwise folder
- [ ] Set ANTHROPIC_API_KEY in Netlify environment variables
- [ ] Apply for Amazon Associates
- [ ] Apply for Namshi affiliate
- [ ] Create Stripe account
- [ ] Create WearWise Pro product in Stripe (AED 15/month)
- [ ] Replace placeholder keys with real keys
- [ ] Test the full user journey
- [ ] Share on LinkedIn to start getting users!

Questions? Review each step carefully and test on the free/test
versions of each platform before going live with real payments.
