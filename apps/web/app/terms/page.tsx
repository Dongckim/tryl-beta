import { Metadata } from "next";
import { TermsContent } from "@/components/auth/PolicyContent";

export const metadata: Metadata = {
  title: "Terms of Service — TRYL",
  description: "Tryl Terms of Service",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="mb-8 font-playfair text-3xl font-bold text-white">
        Terms of Service
      </h1>
      <div className="prose prose-sm prose-invert max-w-none text-gray-300 [&_a]:text-white [&_h3]:text-white">
        <TermsContent />
      </div>
    </div>
  );
}
