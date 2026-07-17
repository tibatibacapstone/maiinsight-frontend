import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy Policy - MaiinSight",
  description: "Privacy Policy for MaiinSight Marketing Decision Support System",
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Login
        </Link>

        <h1 className="mt-8 text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">

          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="mt-2">
              This Privacy Policy describes how MaiinSight (&quot;the System&quot;), operated by{" "}
              <strong>MAIIN Gandaria</strong> located at Jl. Ciputat Raya, Kebayoran Lama Utara,
              Kebayoran Lama, Jakarta Selatan 12240, collects, uses, stores, and protects your
              personal information. By using the System, you consent to the practices described
              in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Information We Collect</h2>
            <p className="mt-2">The System collects the following types of information:</p>

            <h3 className="mt-3 font-medium text-foreground">a. Account Information</h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Name and email address provided during account creation</li>
              <li>User role (Marketing Operational, Management, or IT Support)</li>
              <li>Password (stored in encrypted/hashed form using bcrypt)</li>
            </ul>

            <h3 className="mt-3 font-medium text-foreground">b. Operational Transaction Data</h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Facility booking records (court type, play date, duration, revenue)</li>
              <li>Customer identifiers (name, email, phone — imported from booking systems)</li>
              <li>Court usage data (hourly occupancy, session times)</li>
            </ul>

            <h3 className="mt-3 font-medium text-foreground">c. Instagram Business Data</h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Account metrics (followers, follows, media count)</li>
              <li>Content performance data (views, reach, interactions, likes, comments, shares)</li>
              <li>Audience demographic data (gender, age range, city, country breakdowns)</li>
              <li>Content metadata (captions, media type, posting dates)</li>
            </ul>

            <h3 className="mt-3 font-medium text-foreground">d. System Usage Data</h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              <li>Activity logs (actions performed within the System)</li>
              <li>Login timestamps and authentication events</li>
              <li>AI strategy generation history</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. How We Use Your Information</h2>
            <p className="mt-2">The collected information is used for the following purposes:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Customer Segmentation:</strong> Processing transaction data using RFM analysis and K-Means++ clustering to identify customer groups (Prime Players, Routine Players, Growth Players, Re-Engagement Players)</li>
              <li><strong>Marketing Strategy Generation:</strong> Using AI (Google Gemini) to generate targeted marketing recommendations based on customer segments and occupancy patterns</li>
              <li><strong>Occupancy Optimization:</strong> Identifying low-occupancy time slots and recommending customer targeting to fill empty sessions</li>
              <li><strong>Social Media Analytics:</strong> Monitoring Instagram content performance and audience demographics to inform marketing decisions</li>
              <li><strong>Reporting:</strong> Generating management reports on revenue, occupancy rates, booking trends, and campaign effectiveness</li>
              <li><strong>System Administration:</strong> Managing user access, maintaining audit logs, and ensuring system security</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Data Sharing</h2>
            <p className="mt-2">
              We do not sell, trade, or rent your personal information to third parties. Data may
              be shared only in the following circumstances:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Service Providers:</strong> Data is processed by Google (Gemini API for AI generation) and Meta (Graph API for Instagram analytics) as part of the System&apos;s functionality</li>
              <li><strong>Legal Requirements:</strong> When required by law, regulation, or legal process</li>
              <li><strong>Business Operations:</strong> Among authorized MAIIN Gandaria personnel based on their assigned role and permissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Data Security</h2>
            <p className="mt-2">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Passwords are hashed using bcrypt with 10 salt rounds</li>
              <li>API communications are authenticated using JWT (JSON Web Tokens) with 8-hour expiry</li>
              <li>HTTP security headers enforced via Helmet middleware</li>
              <li>CORS (Cross-Origin Resource Sharing) restricted to authorized domains</li>
              <li>Role-based access control limits data visibility per user role</li>
              <li>CCTV monitoring at the physical venue (MAIIN Gandaria facility)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data Retention</h2>
            <p className="mt-2">
              Transaction data is retained for as long as necessary to fulfill the purposes
              described in this policy. User accounts are maintained for the duration of employment
              or engagement with MAIIN Gandaria. Activity logs are retained for audit purposes.
              Instagram analytics data is synced periodically and stored for historical analysis.
              Users may request data deletion by contacting IT Support.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Your Rights</h2>
            <p className="mt-2">As a user of the System, you have the right to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Object to processing of your personal data</li>
              <li>Export your activity data in CSV format (available through the History module)</li>
              <li>Withdraw consent for data processing at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Third-Party Services</h2>
            <p className="mt-2">The System integrates with the following third-party services:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li><strong>Google Gemini API:</strong> Used for AI-powered marketing strategy generation. Subject to Google&apos;s AI privacy policies.</li>
              <li><strong>Meta Graph API (v25.0):</strong> Used for Instagram business analytics and audience insights from the @maiin.id account.</li>
              <li><strong>Google OAuth 2.0:</strong> Used for optional Google-based authentication. Only email addresses are retrieved for account matching.</li>
              <li><strong>SMTP Email Service:</strong> Used for sending account activation emails during the user invitation process.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Children&apos;s Privacy</h2>
            <p className="mt-2">
              The System is not intended for use by individuals under 18 years of age. We do not
              knowingly collect personal information from children. If you are under 18, you must
              not use the System.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this Privacy Policy from time to time. Changes will be posted on
              this page with an updated revision date. Material changes will be communicated
              through the System&apos;s notification feature. Your continued use of the System
              after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Contact Us</h2>
            <p className="mt-2">
              If you have questions about this Privacy Policy or wish to exercise your data
              rights, please contact:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>MAIIN Gandaria</li>
              <li>Address: Jl. Ciputat Raya, Kebayoran Lama Utara, Kebayoran Lama, Jakarta Selatan 12240</li>
              <li>Email: tibatibacapstone@gmail.com</li>
              <li>WhatsApp: +62 811-1922-4305</li>
            </ul>
          </section>

        </div>
      </div>
    </div>
  )
}
