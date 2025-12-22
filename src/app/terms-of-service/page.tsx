
import { LegalPageLayout } from "@/components/layout/legal-page-layout";

export default function TermsOfServicePage() {
  const lastUpdated = "July 29, 2024";

  return (
    <LegalPageLayout title="Terms of Service" lastUpdated={lastUpdated}>
      <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
        <h2>1. Introduction</h2>
        <p>
          Welcome to Community-Websites.com. These Terms of Service ("Terms")
          govern your use of our website and the advertising services offered
          therein (collectively, the "Services"). By accessing or using our
          Services, you agree to be bound by these Terms and our Privacy
          Policy. If you do not agree, you may not use our Services.
        </p>

        <h2>2. Services Description</h2>
        <p>
          Community-Websites.com provides a subscription-based digital
          advertising platform allowing businesses ("Advertisers") to place
          advertisements on our network of community websites, including but
          not limited to WesleyChapelCommunity.com and PascoCommunity.com.
        </p>

        <h2>3. Eligibility and Account Registration</h2>
        <p>
          You must be at least 18 years old to use our Services. By creating an
          account, you agree to provide accurate, current, and complete
          information. You are responsible for safeguarding your password and
          for all activities that occur under your account.
        </p>

        <h2>4. Subscriptions and Payments</h2>
        <p>
          <strong>Billing:</strong> Advertising services are billed on a
          subscription basis (e.g., monthly, yearly). You will be billed in
          advance on a recurring, periodic basis (a "billing cycle"). Billing
          cycles are set either on a monthly or annual basis, depending on the
          subscription plan you select.
        </p>
        <p>
          <strong>Automatic Renewal:</strong> At the end of each billing
          cycle, your subscription will automatically renew under the exact
          same conditions unless you cancel it or Community-Websites.com
          cancels it.
        </p>
        <p>
          <strong>Cancellation:</strong> You may cancel your subscription
          renewal at any time through your online account management page or
          by contacting our customer support team. The cancellation will take
          effect at the end of the current billing cycle, and your ad will
          remain live until then. No refunds will be provided for the current
          billing period.
        </p>
        <p>
          <strong>Payment Methods:</strong> A valid payment method, including
          credit card, is required to process the payment for your
          subscription. We use a third-party payment processor (Stripe) to
          handle all payments.
        </p>

        <h2>5. Ad Content and Approval</h2>
        <p>
          <strong>Content Guidelines:</strong> All advertisements submitted
          are subject to our review and approval. We reserve the right to
          reject or remove any ad for any reason, at our sole discretion,
          including but not limited to content that is illegal, misleading,
          discriminatory, offensive, or violates intellectual property
          rights.
        </p>
        <p>
          <strong>Responsibility:</strong> You are solely responsible for the
          content of your advertisements and any website or landing page
          linked from your ads. You represent and warrant that you have all
          necessary rights and permissions for the content of your ads.
        </p>
        <p>
          <strong>Ad Creation:</strong> If you request that we design your ad,
          you must provide a final proof approval before the ad goes live.
          Billing will commence upon your approval of the ad proof.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          The Services and their original content, features, and functionality
          are and will remain the exclusive property of Community-Websites.com
          and its licensors. By submitting ad content, you grant us a
          worldwide, non-exclusive, royalty-free license to use, reproduce,
          and display such content in connection with the Services.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by Florida law, in no event shall
          Community-Websites.com, nor its directors, employees, partners,
          agents, suppliers, or affiliates, be liable for any indirect,
          incidental, special, consequential or punitive damages, including
          without limitation, loss of profits, data, use, goodwill, or other
          intangible losses, resulting from (i) your access to or use of or
          inability to access or use the Service; (ii) any conduct or content
          of any third party on the Service; (iii) any content obtained from
          the Service; and (iv) unauthorized access, use or alteration of your
          transmissions or content, whether based on warranty, contract, tort
          (including negligence) or any other legal theory.
        </p>

        <h2>8. Disclaimers and No Guarantees</h2>
        <p>
          Your use of the Service is at your sole risk. The Service is provided
          on an "AS IS" and "AS AVAILABLE" basis. We do not warrant that the
          results of using the Service will meet your requirements. We make no
          guarantees regarding the number of clicks, impressions, or business
          generated from your advertisement.
        </p>
        <p>
          <strong>LEGAL DISCLAIMER:</strong> THIS IS A TEMPLATE AND DOES NOT
          CONSTITUTE LEGAL ADVICE. YOU SHOULD CONSULT WITH A QUALIFIED
          ATTORNEY TO ENSURE THESE TERMS OF SERVICE ARE APPROPRIATE AND
          LEGALLY SOUND FOR YOUR SPECIFIC BUSINESS NEEDS AND JURISDICTION.
        </p>

        <h2>9. Governing Law</h2>
        <p>
          These Terms shall be governed and construed in accordance with the
          laws of the State of Florida, United States, without regard to its
          conflict of law provisions.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We reserve the right, at our sole discretion, to modify or replace
          these Terms at any time. We will provide at least 30 days' notice
          prior to any new terms taking effect. By continuing to access or use
          our Service after those revisions become effective, you agree to be
          bound by the revised terms.
        </p>

        <h2>11. Contact Us</h2>
        <p>
          If you have any questions about these Terms, please contact us at
          [Your Contact Email] or by calling/texting 813-544-8383.
        </p>
      </div>
    </LegalPageLayout>
  );
}

    