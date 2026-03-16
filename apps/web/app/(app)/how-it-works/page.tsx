"use client";

import Image from "next/image";
import { useRef, useEffect, useState } from "react";

/* Simple monochrome stroke icons */
const IconCamera = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="6" width="20" height="14" rx="2" />
    <circle cx="12" cy="13" r="4" />
    <path d="M8 6V4h8v2" />
  </svg>
);
const IconHanger = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3a2 2 0 0 0-2 2c0 .7.4 1.3 1 1.6v.8L5 12v6h14v-6l-6-4.6v-.8c.6-.3 1-.9 1-1.6a2 2 0 0 0-2-2" />
    <path d="M5 12l7-5 7 5" />
  </svg>
);
const IconResult = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const IconPhoto = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <circle cx="12" cy="11" r="3" />
    <path d="M2 18l4-4 4 4 4-4 6 6" />
  </svg>
);
const IconShirt = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 4h4l2 2 2-2h4" />
    <path d="M6 8v12h12V8" />
    <path d="M6 8h12" />
  </svg>
);
const IconFrame = ({ className = "w-8 h-8" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
  </svg>
);

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"} ${className}`}>
      {children}
    </div>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="bg-[#fafafa] text-[#0a0a0a] min-h-screen font-sans">
      {/* Hero: landscape section sized to match photo, gradient fade to white at bottom */}
      <section className="relative aspect-[2/1] w-full overflow-hidden bg-neutral-200">
        <div className="absolute inset-0">
          <Image
            src="/images/how-it-works-hero.png"
            alt=""
            fill
            className="object-cover"
            style={{ objectPosition: "center 100%" }}
            priority
            sizes="100vw"
          />
        </div>
        {/* Gradient fade to white so intro section emerges softly */}
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 z-[1] h-[40%] min-h-[120px] bg-gradient-to-t from-[#fafafa] via-[#fafafa]/85 to-transparent"
          aria-hidden
        />
        {/* Hero title: centered over the gradient zone */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center justify-end text-center px-6 pb-16 md:px-12 md:pb-20 lg:px-16 lg:pb-24">
          <p className="font-sans text-xs font-bold uppercase tracking-[0.35em] text-neutral-700 mb-3 md:text-sm">
            HOW TO USE TRYL
          </p>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-neutral-900 md:text-4xl lg:text-5xl xl:text-6xl">
            Try on Zara clothing instantly
          </h1>
          <a
            href="#what"
            className="mt-6 flex flex-col items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors font-sans"
            aria-label="Scroll to content"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]">Scroll</span>
            <svg className="h-6 w-6 animate-scroll-dot" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </a>
        </div>
        {/* Scroll indicator: right side, gold for visibility */}
        <a
          href="#what"
          className="absolute right-6 md:right-10 top-1/2 z-10 -translate-y-1/2 flex flex-col items-center gap-2.5 text-gold hover:text-gold-accent transition-colors font-sans"
          aria-label="Scroll to content"
        >
          <span className="text-xs font-bold uppercase tracking-[0.3em] rotate-90 origin-center whitespace-nowrap drop-shadow-sm">
            Scroll
          </span>
          <div className="flex flex-col items-center">
            <span className="h-12 w-px bg-gradient-to-b from-gold/80 to-transparent block" />
            <span className="h-2.5 w-2.5 rounded-full bg-gold mt-1.5 animate-scroll-dot shadow-sm" />
          </div>
        </a>
      </section>

      {/* What is Tryl — intro emerges from gradient fade into white */}
      <section id="what" className="relative mx-auto max-w-7xl px-8 pt-20 pb-28 md:px-16 md:pt-28 lg:px-24 text-center bg-[#fafafa]">
        {/* Soft gradient at top: transparent (hero fade) → solid white */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 h-32 bg-gradient-to-b from-transparent to-[#fafafa]" aria-hidden />
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold leading-tight md:text-4xl lg:text-5xl mb-8">
            See how clothes look <br /><em className="italic font-semibold">on you</em>
          </h2>
          <p className="font-sans mx-auto max-w-lg text-neutral-700 text-[0.95rem] leading-relaxed mb-20">
            <span className="font-bold text-neutral-900">Upload your photo once.</span> Then try on any Zara item while you browse. No size guessing — just try it.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-16">
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-200 text-neutral-500">
                <IconCamera className="w-10 h-10" />
              </div>
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-neutral-600">Upload Photo</span>
            </div>
            <span className="text-xl font-bold text-neutral-300 hidden md:inline">→</span>
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-200 text-neutral-500">
                <IconHanger className="w-10 h-10" />
              </div>
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-neutral-600">Pick an Item</span>
            </div>
            <span className="text-xl font-bold text-neutral-300 hidden md:inline">→</span>
            <div className="flex flex-col items-center gap-5">
              <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-200 text-neutral-500">
                <IconResult className="w-10 h-10" />
              </div>
              <span className="font-sans text-xs font-bold uppercase tracking-widest text-neutral-600">See Result</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Step 1 */}
      <div className="mx-auto h-px max-w-7xl bg-neutral-200" />
      <section className="mx-auto max-w-7xl px-8 py-28 md:px-16 lg:px-24">
        <Reveal className="grid grid-cols-1 gap-20 md:grid-cols-2 md:gap-24 lg:gap-32 items-center">
          <div className="max-w-lg">
            <div className="font-serif text-6xl font-semibold text-neutral-300 leading-none mb-8">01</div>
            <h3 className="font-serif text-2xl font-semibold mb-5 leading-snug text-neutral-900">Upload your photo</h3>
            <p className="font-sans text-neutral-600 text-sm leading-relaxed mb-8">
              Upload a <span className="font-semibold text-neutral-800">front-facing photo</span> to create your fitting profile. This takes just a few seconds.
            </p>
            <ul className="font-sans flex flex-col gap-3 text-sm text-neutral-600">
              <li className="flex items-center gap-2 font-medium"><span className="text-gold font-bold">✓</span> Stand straight</li>
              <li className="flex items-center gap-2 font-medium"><span className="text-gold font-bold">✓</span> Face the camera</li>
              <li className="flex items-center gap-2 font-medium"><span className="text-gold font-bold">✓</span> Full body visible</li>
              <li className="flex items-center gap-2 font-medium"><span className="text-gold font-bold">✓</span> Simple background</li>
            </ul>
          </div>
          <div className="aspect-[3/4] rounded-lg bg-neutral-100 flex items-center justify-center p-14">
            <div className="w-full max-w-[280px] rounded-lg border-2 border-dashed border-neutral-300 py-14 text-center transition hover:border-gold/50 cursor-pointer">
              <div className="text-3xl font-bold text-neutral-500 mb-3">↑</div>
              <div className="font-sans text-xs font-bold uppercase tracking-wider text-neutral-600">Upload Photo</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Step 2 */}
      <div className="mx-auto h-px max-w-7xl bg-neutral-200" />
      <section className="mx-auto max-w-7xl px-8 py-28 md:px-16 lg:px-24">
        <Reveal className="grid grid-cols-1 gap-20 md:grid-cols-2 md:gap-24 lg:gap-32 items-center">
          <div className="max-w-md order-2 md:order-1 aspect-[3/4] rounded-lg bg-neutral-100 flex items-center justify-center p-14 relative">
            <div className="absolute top-6 right-6 h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center font-serif text-sm font-bold shadow-lg">
              T
            </div>
            <div className="w-full max-w-[320px] rounded-lg bg-white shadow-lg overflow-hidden">
              <div className="flex items-center gap-2 bg-neutral-100 px-3 py-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
                <span className="font-sans ml-2 flex-1 rounded bg-white px-2 py-0.5 text-[10px] font-medium text-neutral-500">zara.com/product/linen-blend...</span>
              </div>
              <div className="flex gap-4 p-5">
                <div className="h-36 w-24 shrink-0 rounded bg-gradient-to-br from-neutral-200 to-neutral-300" />
                <div className="flex flex-col gap-2">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-neutral-500">Zara</span>
                  <span className="font-sans text-sm font-semibold text-neutral-800">Linen Blend<br />Overshirt</span>
                  <span className="font-sans text-xs font-medium text-neutral-500">$59.90</span>
                </div>
              </div>
            </div>
          </div>
          <div className="max-w-lg order-1 md:order-2">
            <div className="font-serif text-6xl font-semibold text-neutral-300 leading-none mb-8">02</div>
            <h3 className="font-serif text-2xl font-semibold mb-5 leading-snug text-neutral-900">Browse Zara</h3>
            <p className="font-sans text-neutral-600 text-sm leading-relaxed">
              Open any product page on Zara. The <span className="font-semibold text-neutral-800">Tryl extension</span> icon appears in your browser — ready when you are.
            </p>
            <p className="font-sans text-xs text-neutral-500 mt-4 font-medium">
              New brands dropping soon
            </p>
          </div>
        </Reveal>
      </section>

      {/* Step 3 */}
      <div className="mx-auto h-px max-w-7xl bg-neutral-200" />
      <section className="mx-auto max-w-7xl px-8 py-28 md:px-16 lg:px-24">
        <Reveal className="grid grid-cols-1 gap-20 md:grid-cols-2 md:gap-24 lg:gap-32 items-center">
          <div className="max-w-lg">
            <div className="font-serif text-6xl font-semibold text-neutral-300 leading-none mb-8">03</div>
            <h3 className="font-serif text-2xl font-semibold mb-5 leading-snug text-neutral-900">Click Try On</h3>
            <p className="font-sans text-neutral-600 text-sm leading-relaxed">
              Click the <span className="font-semibold text-neutral-800">Tryl button</span> to generate your virtual try-on. It only takes a moment.
            </p>
          </div>
          <div className="aspect-[3/4] rounded-lg bg-neutral-100 flex items-center justify-center p-14">
            <div className="w-full max-w-[240px] rounded-xl bg-white p-8 shadow-xl text-center">
              <div className="font-serif text-base font-semibold tracking-widest uppercase mb-5">Tryl</div>
              <div className="mx-auto mb-5 h-24 w-20 rounded bg-gradient-to-br from-neutral-200 to-neutral-300" />
              <div className="font-sans text-xs font-semibold text-neutral-600 mb-5">Linen Blend Overshirt</div>
              <button type="button" className="font-sans w-full rounded-md bg-black py-3.5 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-neutral-700">
                Try On
              </button>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Step 4 */}
      <div className="mx-auto h-px max-w-7xl bg-neutral-200" />
      <section className="mx-auto max-w-7xl px-8 py-28 md:px-16 lg:px-24">
        <Reveal className="grid grid-cols-1 gap-20 md:grid-cols-2 md:gap-24 lg:gap-32 items-center">
          <div className="max-w-md order-2 md:order-1 aspect-[3/4] rounded-lg bg-neutral-100 flex items-center justify-center p-14">
            <div className="flex gap-3 w-full max-w-[340px]">
              <div className="flex-1 aspect-[3/4] rounded bg-gradient-to-br from-neutral-200 to-neutral-300 relative">
                <span className="font-sans absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-neutral-800">
                  Original
                </span>
              </div>
              <div className="flex-1 aspect-[3/4] rounded bg-gradient-to-br from-gold to-amber-800 relative">
                <span className="font-sans absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                  Tryl Result
                </span>
              </div>
            </div>
          </div>
          <div className="max-w-lg order-1 md:order-2">
            <div className="font-serif text-6xl font-semibold text-neutral-300 leading-none mb-8">04</div>
            <h3 className="font-serif text-2xl font-semibold mb-5 leading-snug text-neutral-900">See your result</h3>
            <p className="font-sans text-neutral-600 text-sm leading-relaxed">
              Your <span className="font-semibold text-neutral-800">personalized try-on image</span> appears in seconds. See exactly how the item looks on you.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Invite */}
      <div className="mx-auto h-px max-w-7xl bg-neutral-200" />
      <section className="bg-neutral-100 py-28 px-8 md:px-16 lg:px-24 text-center">
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold md:text-4xl mb-6 text-neutral-900">Invite friends</h2>
          <p className="font-sans text-neutral-600 text-sm mb-12"><span className="font-semibold text-neutral-800">Share your invite code</span> and earn more tries.</p>
          <div className="inline-flex flex-col sm:flex-row items-center gap-5 bg-white px-10 py-5 rounded-lg shadow-sm">
            <span className="font-mono text-base font-bold tracking-widest text-neutral-900" id="inviteCode">TRYL-XXXX</span>
            <button
              type="button"
              onClick={() => {
                const code = document.getElementById("inviteCode")?.textContent ?? "";
                navigator.clipboard.writeText(code).then(() => {});
              }}
              className="font-sans rounded bg-black px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-white transition hover:bg-neutral-700"
            >
              Copy Code
            </button>
          </div>
        </Reveal>
      </section>

      {/* Tips */}
      <div className="mx-auto h-px max-w-7xl bg-neutral-200" />
      <section className="mx-auto max-w-7xl px-8 py-28 md:px-16 lg:px-24 text-center">
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold md:text-4xl mb-16 text-neutral-900">Tips for best results</h2>
          <div className="grid grid-cols-1 gap-10 md:grid-cols-3 max-w-5xl mx-auto">
            <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center transition hover:border-gold hover:shadow-lg hover:-translate-y-1">
              <div className="flex justify-center mb-6 text-neutral-500">
                <IconPhoto className="w-8 h-8" />
              </div>
              <h4 className="font-sans text-xs font-bold uppercase tracking-widest mb-4 text-neutral-800">Clear Photo</h4>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                Use a clear, <span className="font-semibold text-neutral-800">front-facing photo</span> with good lighting. <span className="text-gold font-bold">✓ Facing forward</span>
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center transition hover:border-gold hover:shadow-lg hover:-translate-y-1">
              <div className="flex justify-center mb-6 text-neutral-500">
                <IconShirt className="w-8 h-8" />
              </div>
              <h4 className="font-sans text-xs font-bold uppercase tracking-widest mb-4 text-neutral-800">Fitted Clothing</h4>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                Wear <span className="font-semibold text-neutral-800">fitted clothes</span> in your photo for the most accurate result. <span className="text-red-600 font-bold">✗ Loose clothing</span>
              </p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center transition hover:border-gold hover:shadow-lg hover:-translate-y-1">
              <div className="flex justify-center mb-6 text-neutral-500">
                <IconFrame className="w-8 h-8" />
              </div>
              <h4 className="font-sans text-xs font-bold uppercase tracking-widest mb-4 text-neutral-800">Clean Background</h4>
              <p className="font-sans text-sm text-neutral-600 leading-relaxed">
                A <span className="font-semibold text-neutral-800">neutral, uncluttered</span> background works best. <span className="text-gold font-bold">✓ Solid wall</span>
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      {/* User feedback — Google Form */}
      <div className="mx-auto h-px max-w-7xl bg-neutral-200" />
      <section className="mx-auto max-w-7xl px-8 py-28 md:px-16 lg:px-24 text-center">
        <Reveal>
          <h2 className="font-serif text-3xl font-semibold md:text-4xl mb-4 text-neutral-900">Share your feedback</h2>
          <p className="font-sans text-neutral-600 text-sm mb-10 max-w-lg mx-auto">
            Help us improve Tryl. Tell us what you liked, what we could do better, or any ideas you have.
          </p>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSeUhZLhWwQw4oNHrhPKPmUMpt4A-Ae3m2mDa7zZWU8Ouq1onA/viewform?usp=dialog"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-black px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Open feedback form
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-200 py-16 px-8 text-center font-sans">
        <div className="font-serif text-lg font-semibold tracking-widest uppercase mb-3 text-neutral-900">Tryl</div>
        <p className="text-[11px] font-medium text-neutral-600 tracking-wider">Virtual Try-On for Zara — Beta</p>
      </footer>
    </div>
  );
}
