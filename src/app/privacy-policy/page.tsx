
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export default function PrivacyPolicyPage() {
  const lastUpdated = "July 29, 2024";

  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={lastUpdated}>
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
        <h2>1. Overview</h2>
        <p>
          This Privacy Policy explains how Community-Websites.com (Company, we,
          us, our) collects, uses, shares, and protects information when you use
          our websites, dashboards, and services (the Service).
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          <strong>Information you provide</strong>
        </p>
        <ul>
          <li>
            Name, business name, email, phone number, billing details, and
            contact preferences.
          </li>
          <li>Account details and subscription selections.</li>
          <li>
            Advertiser Content you submit (ad copy, logos, images, links, and
            related materials).
          </li>
          <li>Messages you send to support.</li>
        </ul>
        <p>
          <strong>Payment information</strong>
        </p>
        <p>
          Payments are processed by third-party payment processors. We do not
          store full credit card numbers. We may receive limited billing
          details, payment status, and transaction identifiers.
        </p>
        <p>
          <strong>Automatically collected information</strong>
        </p>
        <p>
          We may collect technical and usage data such as IP address, device
          type, browser, pages viewed, referring pages, timestamps, and basic
          analytics. We may use cookies or similar technologies for sessions,
          preferences, security, and analytics.
        </p>

        <h2>3. How We Use Information</h2>
        <p>We use information to:</p>
        <ul>
          <li>Create and manage accounts.</li>
          <li>Process payments and manage subscriptions.</li>
          <li>Provide advertising placements and operate the Service.</li>
          <li>
            Provide support and communicate about billing or service issues.
          </li>
          <li>Send service messages and limited marketing communications.</li>
          <li>Prevent fraud, secure accounts, and enforce our Terms.</li>
          <li>Improve the Service and user experience.</li>
          <li>Comply with legal obligations.</li>
        </ul>

        <h2>4. How We Share Information</h2>
        <p>We may share information with:</p>
        <ul>
          <li>
            Payment processors to complete transactions and manage recurring
            billing.
          </li>
          <li>
            Service providers for hosting, analytics, communications, security,
            and support.
          </li>
          <li>
            Our publishing systems and sites where your Advertiser Content is
            displayed.
          </li>
          <li>
            Legal or compliance parties when required by law or to protect
            rights and safety.
          </li>
          <li>
            Successors in the event of a merger, acquisition, financing, or
            asset sale.
          </li>
        </ul>

        <h2>5. Public Display of Advertiser Content</h2>
        <p>
          If you buy advertising, your Advertiser Content may be displayed
          publicly and may be viewed, saved, shared, or accessed by others. Do
          not submit confidential or sensitive information for public ad

          display.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain information as long as needed for legitimate business
          purposes, including providing the Service, maintaining records,
          resolving disputes, enforcing agreements, and complying with law.
        </p>

        <h2>7. Cookies and Tracking</h2>
        <p>
          We use cookies and similar technologies to support login sessions,
          security, site functionality, and analytics. You can adjust cookie
          settings in your browser, but some features may not function
          properly if disabled.
        </p>

        <h2>8. Security</h2>
        <p>
          We use reasonable safeguards designed to protect information. No
          method of transmission or storage is completely secure. You use the
          Service at your own risk.
        </p>

        <h2>9. Your Choices</h2>
        <p>
          You may request access, correction, or deletion of certain personal
          information, subject to verification and legal limits. You can opt
          out of non-essential marketing emails by using the unsubscribe link.
          Service and billing emails may still be sent.
        </p>

        <h2>10. Children’s Privacy</h2>
        <p>
          The Service is not intended for children under 13 and we do not
          knowingly collect personal information from children under 13.
        </p>

        <h2>11. International Users</h2>
        <p>
          If you access the Service from outside the United States, you
          understand your information may be processed and stored in the United
          States.
        </p>

        <h2>12. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy at any time. Changes take effect
          when posted.
        </p>

        <h2>13. Contact</h2>
        <p>
          Community-Websites.com
          <br />
          Email: email@community-websites.com
          <br />
          Phone (24/7): 813-544-8383
        </p>
      </div>
    </LegalPageLayout>
  );
}
