import type { Metadata, Viewport } from 'next'
import './globals.css'
import Header from '@/components/header'
import EmailOptinBanner from '@/components/email-optin-banner'

export const metadata: Metadata = {
  title: 'International Teacher Jobs',
  description: 'Find and post teaching positions at international schools worldwide',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Teacher Jobs',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-mono text-text-primary">
        <Header />
        <main className="min-h-screen bg-bg">{children}</main>
        <EmailOptinBanner />
        <footer className="border-t border-card-border bg-card-bg py-4 text-center text-xs text-text-muted">
          © International Teacher Jobs, 2026. All rights reserved.
        </footer>
      </body>
    </html>
  )
}
