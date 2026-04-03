import { Metadata } from "next";
import { PrivacyContent } from "@/components/auth/PolicyContent";

export const metadata: Metadata = {
  title: "Privacy Policy — TRYL",
  description: "Tryl Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 font-playfair text-3xl font-bold text-white">
        Privacy Policy
      </h1>
      <div className="prose prose-sm prose-invert max-w-none text-gray-300 [&_a]:text-white [&_h3]:text-white">
        <PrivacyContent />
      </div>
    </div>
  );
}
