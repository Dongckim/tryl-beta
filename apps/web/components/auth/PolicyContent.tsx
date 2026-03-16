"use client";

export function TermsContent() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Last updated: March 2026</p>
      <p>Welcome to Tryl.</p>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Tryl website, browser extension, and related services (&quot;Service&quot;).
      </p>
      <p>By creating an account or using Tryl, you agree to these Terms.</p>

      <section>
        <h3 className="font-semibold text-gray-900">1. Eligibility</h3>
        <p>You must be at least 13 years old to use Tryl. By using the Service, you confirm that you meet this requirement.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">2. User Accounts</h3>
        <p>To use Tryl, you must create an account and provide accurate information. You are responsible for maintaining the security of your account and password.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">3. User Content</h3>
        <p>You may upload photos to generate AI try-on results. By uploading content, you confirm that:</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>you own the image or have permission to use it</li>
          <li>the person in the image has consented to its use</li>
          <li>the content does not violate any laws or third-party rights</li>
        </ul>
        <p className="mt-2">Tryl may remove content that violates these rules.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">4. AI Generated Content</h3>
        <p>
          Tryl uses artificial intelligence to generate virtual try-on images. Generated results may not always be accurate and are provided for experimental and informational purposes only.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">5. Acceptable Use</h3>
        <p>You agree not to:</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>upload illegal or abusive content</li>
          <li>upload non-consensual images of others</li>
          <li>attempt to disrupt or reverse engineer the service</li>
          <li>use the service for unlawful purposes</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">6. Service Availability</h3>
        <p>The Service is provided &quot;as is&quot; without warranties. We may modify or discontinue the service at any time.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">7. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, Tryl is not liable for damages arising from the use of the Service.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">8. Changes to Terms</h3>
        <p>We may update these Terms periodically. Continued use of the Service indicates acceptance of the updated Terms.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">9. Contact</h3>
        <p><a href="mailto:dck.alx@gmail.com" className="font-medium text-black underline">dck.alx@gmail.com</a></p>
      </section>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Last updated: March 2026</p>
      <p>Tryl respects your privacy. This Privacy Policy explains how we collect and use information.</p>

      <section>
        <h3 className="font-semibold text-gray-900">1. Information We Collect</h3>
        <p>We may collect:</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>email address</li>
          <li>account information (first name, last name, profile)</li>
          <li>uploaded images</li>
          <li>generated try-on results</li>
          <li>usage analytics</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">2. How We Use Information</h3>
        <p>We use information to:</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          <li>operate the Tryl service</li>
          <li>generate AI try-on results</li>
          <li>improve product performance</li>
          <li>detect abuse or misuse</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">3. Image Processing</h3>
        <p>
          Uploaded photos are processed by automated AI systems to generate try-on results. Images may be temporarily stored for processing and service improvement.
        </p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">4. Data Sharing</h3>
        <p>We do not sell personal data. We may share limited information with infrastructure providers (e.g. cloud hosting, AI model providers, analytics) only to operate the service.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">5. Data Retention</h3>
        <p>We retain information only as long as necessary to operate and improve the service. Users may request deletion of their data.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">6. Security</h3>
        <p>We implement reasonable safeguards to protect your data, but no system is completely secure.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">7. Children&apos;s Privacy</h3>
        <p>The service is not intended for users under 13.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">8. Updates</h3>
        <p>We may update this Privacy Policy periodically.</p>
      </section>

      <section>
        <h3 className="font-semibold text-gray-900">9. Contact</h3>
        <p><a href="mailto:dck.alx@gmail.com" className="font-medium text-black underline">dck.alx@gmail.com</a></p>
      </section>
    </div>
  );
}

export function AIContentPolicyContent() {
  return (
    <div className="space-y-4">
      <p>Tryl is designed for safe and responsible AI usage. Users must follow these rules when uploading images.</p>
      <p className="font-medium text-gray-900">Prohibited content includes:</p>
      <ul className="list-inside list-disc space-y-0.5">
        <li>illegal content</li>
        <li>abusive or harmful imagery</li>
        <li>non-consensual images of individuals</li>
        <li>sexual or explicit imagery involving minors</li>
        <li>harassment or harmful manipulation of individuals</li>
      </ul>
      <p>Users must have permission to upload photos containing other people. Tryl may remove content or suspend accounts that violate these policies.</p>
    </div>
  );
}

export function ImageDeletionPolicyContent() {
  return (
    <div className="space-y-4">
      <p>Users may request deletion of uploaded images at any time.</p>
      <p>
        To request deletion, contact: <a href="mailto:dck.alx@gmail.com" className="font-medium text-black underline">dck.alx@gmail.com</a>
      </p>
      <p>Upon request, we will remove associated images from our systems within a reasonable time. Some data may remain temporarily in backup systems but will be automatically deleted over time.</p>
      <p>Tryl does not publicly display user-uploaded images without permission.</p>
    </div>
  );
}

/** Combined content for the "I allow Tryl to process my photos" checkbox: AI Content Policy + Image Deletion */
export function AIProcessingConsentContent() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-semibold text-gray-900">Tryl Content Policy</h3>
        <AIContentPolicyContent />
      </section>
      <section className="border-t border-gray-200 pt-4">
        <h3 className="font-semibold text-gray-900">Tryl Image Deletion Policy</h3>
        <ImageDeletionPolicyContent />
      </section>
    </div>
  );
}
