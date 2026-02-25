# International Teacher Jobs — Quick Start Checklist

## ⚡ 5-Minute Setup

### Step 1: Install & Configure (2 min)
```bash
# Navigate to project directory
cd /Users/elliottz/Desktop/international-teacher-jobs

# Install dependencies
npm install

# Copy environment template
cp .env.local.example .env.local

# Edit .env.local with your actual values:
# - MONGODB_URI=your_mongodb_connection_string
# - NEXT_PUBLIC_APP_URL=http://localhost:3000 (for local dev)
```

**Required MongoDB Setup:**
- If you don't have MongoDB, use MongoDB Atlas (free tier): https://atlas.mongodb.com
- Create a cluster, get connection string, paste into MONGODB_URI

### Step 2: Seed Sample Data (1 min)
```bash
npm run seed
```

This creates:
- 5 sample schools with admin accounts
- 5 live job postings
- Test credentials for login testing

### Step 3: Run Development Server (1 min)
```bash
npm run dev
```

Server starts at **http://localhost:3000**

### Step 4: Verify Everything Works (1 min)
- [ ] Visit http://localhost:3000 → see 5 job listings
- [ ] Click a job → see detail page
- [ ] Try filters (country, category)
- [ ] Visit /pricing → see 3 subscription tiers
- [ ] Visit /admin (password: `admin123`) → see review panel

✅ **Setup Complete!**

---

## 🔧 Stripe Integration (Optional — Required for Production)

### For Testing Locally:
1. Skip Stripe for now — test flow goes to /checkout/success without real payment
2. **Later**: Set up Stripe test mode for actual payment testing

### For Production:
1. **Create Stripe Account**: https://stripe.com
2. **Get API Keys**: Dashboard → Developers → API Keys
3. **Create 3 Products & Price IDs**:
   - Basic Plan ($49/mo) → get price_1X...
   - Standard Plan ($99/mo) → get price_1Y...
   - Premium Plan ($199/mo) → get price_1Z...
4. **Update .env.local**:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_BASIC_PRICE_ID=price_1X...
   STRIPE_STANDARD_PRICE_ID=price_1Y...
   STRIPE_PREMIUM_PRICE_ID=price_1Z...
   ```
5. **Test with Stripe test cards**:
   - Visa: `4242 4242 4242 4242`
   - Any future expiration, any 3-digit CVC

---

## 📋 Test Flows

### Test 1: View Jobs & Filter
- [ ] Homepage shows 5 jobs
- [ ] Filter by "Taiwan" → shows 1 job (Taipei school)
- [ ] Filter by "Elementary" → shows Bangkok school
- [ ] Click job title → detail page loads

### Test 2: School Admin Login
- [ ] Visit /school/login
- [ ] Email: `admin@taipei-school.edu`
- [ ] Password: `password123`
- [ ] → Redirects to /school/dashboard
- [ ] Dashboard shows "Taipei European School"

### Test 3: Admin Review Panel
- [ ] Visit /admin
- [ ] Password: `admin123`
- [ ] "Pending Review" section shows 0 jobs (all are live)
- [ ] Try approving/requesting correction UI

### Test 4: Job Posting Flow (Full)
1. Visit /pricing
2. Click "Get Started" on Basic tier
3. Stripe test checkout (use `4242...` card)
4. On success → /checkout/success page
5. Click "Post Your First Job" → /post-job form
6. Fill form → Submit
7. Job created with status: 'pending'
8. Go to /admin → see job in "Pending Review"
9. Approve → job becomes 'live'
10. Homepage now shows new job

---

## 🚀 Deploy to Vercel (Optional)

```bash
# 1. Push code to GitHub
git init
git add .
git commit -m "International Teacher Jobs platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/repo.git
git push -u origin main

# 2. Import to Vercel
# Visit https://vercel.com/new
# Select GitHub repo
# Add environment variables (same as .env.local)
# Deploy!

# 3. Configure Stripe Webhook
# Stripe Dashboard → Developers → Webhooks
# Add: https://your-vercel-url.vercel.app/api/stripe/webhook
```

---

## 🐛 Troubleshooting

### "Cannot find module 'mongoose'"
```bash
npm install
```

### "MONGODB_URI is not defined"
- Edit `.env.local`
- Add: `MONGODB_URI=your_mongodb_connection_string`
- Restart dev server: `Ctrl+C`, then `npm run dev`

### "Seed fails with connection error"
- Check MONGODB_URI is correct
- MongoDB server must be running (or Atlas cluster accessible)
- Verify network access rules (Atlas: IP whitelist)

### "Stripe checkout buttons don't work"
- This is normal without Stripe keys configured
- Flow still works: clicks redirect to /checkout/success
- To enable real payments: configure STRIPE_* env vars

### "Admin panel password doesn't work"
- Default: `admin123`
- To change: edit .env.local `ADMIN_PASSWORD=your_password`
- Restart server

---

## 📚 Project Structure

Quick reference for where to find things:

| What | Where |
|------|-------|
| Job board (homepage) | `/app/page.tsx` |
| Pricing page | `/app/pricing/page.tsx` |
| Job form | `/app/post-job/page.tsx` |
| School dashboard | `/app/school/dashboard/page.tsx` |
| Admin panel | `/app/admin/page.tsx` |
| Job detail page | `/app/jobs/[id]/page.tsx` |
| Database models | `/models/*.ts` |
| API routes | `/app/api/**/*.ts` |
| Styling | `/app/globals.css`, `tailwind.config.ts` |
| Config files | `next.config.js`, `tsconfig.json` |

---

## 🎯 Next Steps

### If exploring the platform:
1. Seed data → View jobs → Test filtering
2. Visit /admin → Review pending jobs (none yet)
3. Visit /pricing → Understand subscription tiers
4. Visit /school/login → Test school admin access

### If integrating Stripe:
1. Create Stripe account (https://stripe.com)
2. Get API keys and create 3 products
3. Update .env.local with Stripe config
4. Test checkout flow with test cards
5. Deploy to Vercel with env vars

### If deploying to production:
1. Push to GitHub
2. Import to Vercel
3. Add all env variables
4. Configure Stripe webhook
5. Test end-to-end with real card (if desired)

---

## 📧 Key Credentials (Demo Data)

### School Admin Accounts (from seed)
```
Email: admin@taipei-school.edu
Password: password123

Email: admin@bangkok-school.edu
Password: password123

Email: admin@dubai-academy.ae
Password: password123
```

### Admin Panel
```
Password: admin123
```

**⚠️ Change these before deploying to production!**

---

## 🎉 Success Checklist

- [ ] npm install completed without errors
- [ ] .env.local created with MONGODB_URI
- [ ] npm run seed completed (5 jobs created)
- [ ] npm run dev running without errors
- [ ] Homepage shows 5 jobs at http://localhost:3000
- [ ] Can click jobs and view details
- [ ] Can filter by country and category
- [ ] Can login at /school/login
- [ ] Can view /admin panel
- [ ] All pages load with correct styling

✅ **Ready to build!**

---

## 📞 Support

### Common Issues & Fixes

**Issue**: "ENOENT: no such file or directory, open '.env.local'"
- **Fix**: Run `cp .env.local.example .env.local`

**Issue**: MongoDB connection timeout
- **Fix**: Check MONGODB_URI, ensure MongoDB is running or Atlas network access is configured

**Issue**: Tailwind styles not loading
- **Fix**: Restart dev server (`Ctrl+C`, `npm run dev`)

**Issue**: TypeScript errors on build
- **Fix**: Run `npm run lint` to see all errors, fix import paths

### Still stuck?
1. Check `README.md` for detailed setup
2. Review `IMPLEMENTATION_SUMMARY.md` for architecture overview
3. Check error messages in terminal output
4. Verify all .env variables are set correctly

---

## 🚀 Ready to Go!

```bash
# One-command setup:
npm install && npm run seed && npm run dev
```

Then open **http://localhost:3000** in your browser.

Happy job hunting! 🎓
