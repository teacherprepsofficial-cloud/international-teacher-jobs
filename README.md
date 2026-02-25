# International Teacher Jobs

A self-updating international school job board where schools pay monthly subscriptions to post teaching positions. Features AI-powered job description rewriting, school admin authentication, and a super-admin review panel.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Styling**: Tailwind CSS with JetBrains Mono font
- **Payments**: Stripe
- **Hosting**: Vercel

## Design System

- **Terminal aesthetic** with JetBrains Mono monospace font
- **Color palette**: Light gray backgrounds, white cards, red accents for CTAs, blue for links
- **Components**: Pill buttons, rounded card borders, clean typography

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB database
- Stripe account (for payment processing)

### Installation

```bash
# Install dependencies
npm install

# Copy env template and configure
cp .env.local.example .env.local

# Edit .env.local with your MongoDB URI and Stripe keys
```

### Configuration

Update `.env.local` with:
- `MONGODB_URI`: Your MongoDB connection string
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret
- Stripe price IDs for Basic, Standard, and Premium tiers
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `JWT_SECRET`: A secure secret for JWT tokens
- `ADMIN_PASSWORD`: Password for admin panel access
- `SMTP_*`: Email configuration (optional, for notifications)

### Seed Sample Data

```bash
npm run seed
```

This populates the database with 5 sample jobs across different countries and subscription tiers.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the job board.

#### Test Credentials

**Admin Panel** (`/admin`):
- Password: `admin123` (demo only)

**School Admin Login** (`/school/login`):
- Email: `admin@taipei-school.edu`
- Password: `password123`

### Building

```bash
npm run build
npm start
```

## Project Structure

```
international-teacher-jobs/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage job board
│   ├── pricing/                  # Pricing page
│   ├── post-job/                 # Job submission form
│   ├── checkout/                 # Payment success page
│   ├── jobs/[id]/                # Job detail page
│   ├── school/                   # School admin routes
│   ├── admin/                    # Super-admin panel
│   └── api/                      # API routes
├── models/                       # Mongoose schemas
│   ├── SchoolAdmin.ts
│   ├── JobPosting.ts
│   └── AdminMessage.ts
├── lib/                          # Utilities
│   ├── db.ts                     # Database connection
│   ├── stripe.ts                 # Stripe configuration
│   ├── auth.ts                   # JWT & auth helpers
│   └── countries.ts              # Country list with flags
├── components/                   # React components
│   └── header.tsx                # Navigation header
├── public/                       # Static assets
└── scripts/                      # Utility scripts
    └── seed.ts                   # Database seeding
```

## Key Features

### For Schools

- **Post Jobs**: Submit job listings with full descriptions
- **Subscription Tiers**: Choose from Basic, Standard (Featured), or Premium pricing
- **Dashboard**: Track job posting status, receive messages, edit listings
- **Inbox**: Receive messages from super-admin about corrections or approvals

### For Job Seekers

- **Browse Listings**: Filter jobs by country and position category
- **Detailed Pages**: View full job information and apply directly
- **Latest First**: Jobs sorted by newest postings first

### For Super-Admin

- **Review Panel**: Approve or request corrections on pending jobs
- **Messaging**: Send messages to schools about their listings
- **Status Management**: Track all jobs through their lifecycle

## Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Basic** | $49/mo | Standard listing, 30-day active |
| **Standard (Featured)** | $99/mo | Purple badge, higher sort order |
| **Premium** | $199/mo | Gold badge, pinned to top, gold border |

All monthly subscriptions, automatically renew, can be cancelled anytime.

## Stripe Integration

### Webhook Events Handled

- `checkout.session.completed` → Create school admin account
- `invoice.paid` → Renew job listing
- `customer.subscription.deleted` → Cancel listing, take down jobs
- `invoice.payment_failed` → Set subscription to past_due, notify school

### Test Mode

Use Stripe test card numbers during development:
- **Visa**: `4242 4242 4242 4242`
- **MasterCard**: `5555 5555 5555 4444`

## Deployment

Deploy to Vercel:

```bash
vercel deploy --prod
```

Ensure environment variables are configured in Vercel project settings.

### Vercel Cron Jobs

Cron jobs can be added in `vercel.json` for:
- Daily crawling of school websites (Phase 2)
- Subscription renewal reminders
- Listing expiration cleanup

## Roadmap

### Phase 1 (Current)
- ✅ Job board homepage with filters
- ✅ School admin authentication
- ✅ Stripe subscription integration
- ✅ Job posting form
- ✅ Super-admin review panel
- ✅ Inbox messaging system

### Phase 2 (Optional)
- 🔄 Daily AI crawl of school websites
- 🔄 Automatic job description rewriting with Claude
- 🔄 Email notifications
- 🔄 Advanced analytics dashboard

## License

Proprietary. All rights reserved.
