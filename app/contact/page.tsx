import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Contact Us</h1>
      <p className="text-text-muted mb-8">
        Have a question about posting jobs, your subscription, or anything else? We'd love to hear from you.
      </p>

      <div className="border border-card-border rounded-[15px] bg-card-bg p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold mb-2">Email</h2>
            <a href="mailto:hello@internationalteacherjobs.com" className="text-accent-blue hover:underline text-lg">
              hello@internationalteacherjobs.com
            </a>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">Response Time</h2>
            <p className="text-text-muted">We typically respond within 24 hours on business days.</p>
          </div>

          <div>
            <h2 className="text-lg font-bold mb-2">For Schools</h2>
            <p className="text-text-muted">
              Interested in posting jobs? Check out our{' '}
              <Link href="/pricing" className="text-accent-blue hover:underline">
                pricing plans
              </Link>{' '}
              or email us to learn more.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
