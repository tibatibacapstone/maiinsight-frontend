import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms of Service - MaiinSight",
  description: "Terms of Service for MaiinSight Marketing Decision Support System",
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to Login
        </Link>

        <h1 className="mt-8 text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: July 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">

          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p className="mt-2">
              By accessing and using MaiinSight (&quot;the System&quot;), you agree to be bound by these Terms of Service.
              MaiinSight is a Marketing Decision Support System developed for <strong>MAIIN Gandaria</strong>,
              a sports complex located at Jl. Ciputat Raya, Kebayoran Lama Utara, Kebayoran Lama,
              Jakarta Selatan 12240. If you do not agree to these terms, you must not access or use the System.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Description of Service</h2>
            <p className="mt-2">
              MaiinSight provides marketing analytics, customer segmentation, occupancy analysis,
              and AI-powered marketing strategy generation for MAIIN Gandaria&apos;s operations.
              The System processes facility transaction data, Instagram business analytics from
              MAIIN Gandaria&apos;s official account, and generates actionable marketing insights
              for the venue&apos;s basketball courts and mini soccer fields.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Eligibility</h2>
            <p className="mt-2">
              Access to MaiinSight is restricted to authorized personnel of MAIIN Gandaria.
              Accounts are created exclusively by IT Support staff through the System&apos;s user
              management panel. Unauthorized access is strictly prohibited. You must be at least
              18 years of age to use this System.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Account Responsibilities</h2>
            <p className="mt-2">
              You are responsible for maintaining the confidentiality of your account credentials.
              You must not share your password or allow others to access the System using your account.
              You must immediately notify MAIIN Gandaria IT Support at{" "}
              <strong>tibatibacapstone@gmail.com</strong> if you suspect unauthorized access to your account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Acceptable Use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Use the System for any purpose other than MAIIN Gandaria&apos;s marketing operations</li>
              <li>Attempt to access data belonging to other users or organizations</li>
              <li>Upload malicious files, viruses, or harmful content through the System</li>
              <li>Reverse engineer, decompile, or attempt to extract the System&apos;s source code</li>
              <li>Use automated tools to scrape, crawl, or extract data from the System</li>
              <li>Interfere with or disrupt the System&apos;s infrastructure or connected services</li>
              <li>Export or distribute customer data or marketing strategies to unauthorized third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Data Ownership</h2>
            <p className="mt-2">
              All transaction data, customer segmentation results, marketing strategies, and analytics
              generated through MaiinSight are the property of MAIIN Gandaria. The System is designed
              to process MAIIN Gandaria&apos;s operational data, including facility booking records,
              customer interaction data, and Instagram business account analytics from the official
              @maiin.id account.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. AI-Generated Content</h2>
            <p className="mt-2">
              MaiinSight uses artificial intelligence (Google Gemini) to generate marketing strategies,
              content suggestions, and campaign recommendations. AI-generated content is provided for
              reference and must be reviewed and approved by authorized marketing personnel before
              implementation. MAIIN Gandaria does not guarantee the accuracy, completeness, or
              suitability of AI-generated recommendations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Service Availability</h2>
            <p className="mt-2">
              The System is provided on an &quot;as is&quot; and &quot;as available&quot; basis.
              MAIIN Gandaria makes no warranties regarding uninterrupted or error-free operation.
              We reserve the right to modify, suspend, or discontinue the System at any time
              without prior notice for maintenance, updates, or operational reasons.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Limitation of Liability</h2>
            <p className="mt-2">
              To the maximum extent permitted by applicable law, MAIIN Gandaria shall not be liable
              for any indirect, incidental, special, consequential, or punitive damages arising from
              your use of or inability to use the System, including but not limited to loss of data,
              revenue, or business opportunities.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">10. Termination</h2>
            <p className="mt-2">
              MAIIN Gandaria reserves the right to suspend or terminate your access to the System
              at any time, with or without cause, including but not limited to violations of these
              Terms of Service. Upon termination, your right to access the System ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">11. Changes to Terms</h2>
            <p className="mt-2">
              MAIIN Gandaria may update these Terms of Service at any time. Continued use of the
              System after changes are posted constitutes acceptance of the revised terms.
              Users will be notified of material changes through the System&apos;s notification feature.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">12. Governing Law</h2>
            <p className="mt-2">
              These Terms of Service are governed by and construed in accordance with the laws of
              the Republic of Indonesia. Any disputes shall be resolved in the courts of Jakarta Selatan.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">13. Contact</h2>
            <p className="mt-2">
              For questions regarding these Terms of Service, contact MAIIN Gandaria at:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
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
