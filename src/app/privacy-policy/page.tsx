
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export default function PrivacyPolicyPage() {
  const lastUpdated = "July 29, 2024";

  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={lastUpdated}>
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
        <h2>1. Introduction</h2>
        <p>
          Community-Websites.com ("we," "our," or "us") is committed to
          protecting your privacy. This Privacy Policy explains how we
          collect, use, disclose, and safeguard your information when you visit
          our website and use our advertising services (collectively, the
          "Services").
        </p>

        <h2>2. Information We Collect</h2>
        <p>
          We may collect personal information about you in a variety of ways.
          The information we may collect includes:
        </p>
        <ul>
          <li>
            <strong>Personal Data:</strong> Personally identifiable
            information, such as your name, business name, shipping address,
            email address, and telephone number, and demographic information,
            such as your age, gender, hometown, and interests, that you
            voluntarily give to us when you register for the Services or when
            you choose to participate in various activities related to the
            Services.
          </li>
          <li>
            <strong>Financial Data:</strong> Financial information, such as
            data related to your payment method (e.g., valid credit card
            number, card brand, expiration date) that we may collect when you
            purchase, order, return, exchange, or request information about
            our services. We store only very limited, if any, financial
            information that we collect. Otherwise, all financial information
            is stored by our payment processor, Stripe.
          </li>
          <li>
            <strong>Derivative Data:</strong> Information our servers
            automatically collect when you access the Site, such as your IP
            address, your browser type, your operating system, your access
            times, and the pages you have viewed directly before and after
            accessing the Site.
          </li>
        </ul>

        <h2>3. Use of Your Information</h2>
        <p>
          Having accurate information about you permits us to provide you with
          a smooth, efficient, and customized experience. Specifically, we may
          use information collected about you to:
        </p>
        <ul>
          <li>Create and manage your account.</li>
          <li>
            Process your payments and subscriptions and deliver the services
            you have requested.
          </li>
          <li>Email you regarding your account or order.</li>
          <li>
            Notify you of updates to the Services and our associated
            websites.
          </li>
          <li>
            Prevent fraudulent transactions, monitor against theft, and
            protect against criminal activity.
          </li>
          <li>Comply with legal and regulatory requirements.</li>
        </ul>

        <h2>4. Disclosure of Your Information</h2>
        <p>
          We may share information we have collected about you in certain
          situations. Your information may be disclosed as follows:
        </p>
        <ul>
          <li>
            <strong>By Law or to Protect Rights:</strong> If we believe the
            release of information about you is necessary to respond to legal
            process, to investigate or remedy potential violations of our
            policies, or to protect the rights, property, and safety of
            others, we may share your information as permitted or required by
            any applicable law, rule, or regulation.
          </li>
          <li>
            <strong>Third-Party Service Providers:</strong> We may share your
            information with third parties that perform services for us or on
            our behalf, including payment processing (Stripe), data analysis,
            email delivery, hosting services, and customer service.
          </li>
        </ul>

        <h2>5. Security of Your Information</h2>
        <p>
          We use administrative, technical, and physical security measures to
          help protect your personal information. While we have taken
          reasonable steps to secure the personal information you provide to
          us, please be aware that despite our efforts, no security measures
          are perfect or impenetrable, and no method of data transmission can
          be guaranteed against any interception or other type of misuse.
        </p>

        <h2>6. Policy for Children</h2>
        <p>
          We do not knowingly solicit information from or market to children
          under the age of 13. If you become aware of any data we have
          collected from children under age 13, please contact us using the
          contact information provided below.
        </p>

        <h2>7. Your Privacy Rights (Florida Residents)</h2>
        <p>
          Under the Florida Digital Bill of Rights, residents of Florida have
          specific rights regarding their personal information. These rights
          include:
        </p>
        <ul>
          <li>The right to know what personal information is being collected.</li>
          <li>The right to access your personal information.</li>
          <li>The right to correct inaccuracies in your personal information.</li>
          <li>The right to delete your personal information.</li>
          <li>The right to opt-out of the sale of personal information.</li>
        </ul>
        <p>
          To exercise these rights, please contact us using the contact
          information below.
        </p>
         <p>
          <strong>LEGAL DISCLAIMER:</strong> THIS IS A TEMPLATE AND DOES NOT
          CONSTITUTE LEGAL ADVICE. YOU SHOULD CONSULT WITH A QUALIFIED
          ATTORNEY TO ENSURE THIS PRIVACY POLICY IS APPROPRIATE AND
          LEGALLY SOUND FOR YOUR SPECIFIC BUSINESS NEEDS AND JURISDICTION,
          PARTICULARLY CONCERNING GDPR, CCPA, the Florida Digital Bill of
          Rights, and other privacy regulations.
        </p>

        <h2>8. Contact Us</h2>
        <p>
          If you have questions or comments about this Privacy Policy, please
          contact us at: [Your Contact Email] or by calling/texting 813-544-8383.
        </p>
      </div>
    </LegalPageLayout>
  );
}

    