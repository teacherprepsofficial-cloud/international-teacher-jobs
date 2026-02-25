interface DigestJob {
  _id: string
  position: string
  schoolName: string
  city: string
  country: string
  contractType: string
  startDate: string
  salary?: string
  subscriptionTier: string
}

export function buildDigestHtml(
  jobs: DigestJob[],
  subscriberId: string,
  unsubscribeToken: string,
  digestDate: string,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com'
  const unsubUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`

  const jobRows = jobs.map((job) => {
    const jobUrl = `${baseUrl}/jobs/${job._id}`
    const trackUrl = `${baseUrl}/api/email/click?sid=${subscriberId}&jid=${job._id}&d=${digestDate}&url=${encodeURIComponent(jobUrl)}`

    const isPremium = job.subscriptionTier === 'premium'
    const isFeatured = job.subscriptionTier === 'standard'
    const badge = isPremium
      ? '<span style="display:inline-block;background:#fbbf24;color:#1a1a1a;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;margin-right:6px;">PREMIUM</span>'
      : isFeatured
        ? '<span style="display:inline-block;background:#a78bfa;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;margin-right:6px;">FEATURED</span>'
        : ''

    const borderColor = isPremium ? '#fbbf24' : isFeatured ? '#a78bfa' : '#e0e0e0'

    return `
      <tr>
        <td style="padding: 0 0 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e0e0e0;border-left:4px solid ${borderColor};border-radius:8px;">
            <tr>
              <td style="padding:16px;">
                <div style="margin-bottom:6px;">${badge}<span style="font-size:13px;font-weight:600;color:#1a1a1a;">${job.position}</span></div>
                <div style="font-size:12px;color:#666;margin-bottom:8px;">${job.schoolName} · ${job.city}, ${job.country}</div>
                <div style="font-size:11px;color:#999;margin-bottom:12px;">${job.contractType} · ${job.startDate}${job.salary ? ` · ${job.salary}` : ''}</div>
                <a href="${trackUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:8px 20px;border-radius:9999px;font-size:12px;font-weight:600;">View Job</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td style="padding:0 0 20px 0;">
              <h1 style="font-size:18px;font-weight:700;color:#1a1a1a;margin:0 0 4px 0;">International Teacher Jobs</h1>
              <p style="font-size:13px;color:#666;margin:0;">Weekly digest — ${new Date(digestDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <p style="font-size:13px;color:#1a1a1a;line-height:1.5;margin:0;">
                ${jobs.length} new ${jobs.length === 1 ? 'listing' : 'listings'} this week:
              </p>
            </td>
          </tr>

          <!-- Jobs -->
          ${jobRows}

          <!-- Browse all -->
          <tr>
            <td align="center" style="padding:16px 0 24px 0;">
              <a href="${baseUrl}" style="font-size:13px;color:#2563eb;text-decoration:underline;">Browse all listings on internationalteacherjobs.com</a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e0e0e0;padding:16px 0 0 0;">
              <p style="font-size:11px;color:#999;line-height:1.5;margin:0;">
                You're receiving this because you subscribed at internationalteacherjobs.com.
                <br>
                <a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a> — you'll be removed immediately, no questions asked.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildNoJobsHtml(unsubscribeToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://internationalteacherjobs.com'
  const unsubUrl = `${baseUrl}/api/unsubscribe?token=${unsubscribeToken}`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding:0 0 20px 0;">
              <h1 style="font-size:18px;font-weight:700;color:#1a1a1a;margin:0 0 4px 0;">International Teacher Jobs</h1>
              <p style="font-size:13px;color:#666;margin:0;">Weekly digest</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 0 24px 0;">
              <p style="font-size:14px;color:#1a1a1a;line-height:1.6;margin:0;">
                No new listings this week — check back soon!
              </p>
              <p style="font-size:13px;color:#666;line-height:1.6;margin:12px 0 0 0;">
                We'll send you the next batch of jobs as soon as schools post new positions.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 0 24px 0;">
              <a href="${baseUrl}" style="display:inline-block;background:#1a1a1a;color:#ffffff;text-decoration:none;padding:10px 28px;border-radius:9999px;font-size:13px;font-weight:600;">Browse All Jobs</a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #e0e0e0;padding:16px 0 0 0;">
              <p style="font-size:11px;color:#999;line-height:1.5;margin:0;">
                You're receiving this because you subscribed at internationalteacherjobs.com.
                <br>
                <a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
