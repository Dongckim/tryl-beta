"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { BrandMarquee, SignUpModal } from "@/components/landing";
import { useAuth } from "@/contexts/AuthContext";

function AnimatedSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      variants={{
        initial: { opacity: 0, y: 40 },
        animate: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const USE_CASES = [
  {
    title: "Work outfit",
    desc: "Look sharp for the office",
    image: "/images/usecases/work-outfit.png",
  },
  {
    title: "Blind date",
    desc: "Make a great first impression",
    image: "/images/usecases/blind-date.png",
  },
  {
    title: "Wedding",
    desc: "Find the perfect formal look",
    image: "/images/usecases/wedding.png",
  },
  {
    title: "Travel outfit",
    desc: "Pack light, look right",
    image: "/images/usecases/travel-outfit.png",
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [signUpOpen, setSignUpOpen] = useState(false);

  return (
    <div className="relative bg-black">
      {/* Hero */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <video
            src="/images/hero-demo.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/95" />
        </div>
        <div className="relative z-10 flex min-h-screen flex-col justify-center pl-6 pt-28 pb-24 md:pl-16 lg:pl-24 xl:pl-32">
          <div className="flex max-w-2xl flex-col items-start">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-4 text-xs font-medium uppercase tracking-[0.4em] text-white/70"
            >
              AI Fashion Try-On
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl lg:text-7xl"
            >
              See it on you,
              <br />
              <span className="italic">before you buy.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 text-lg leading-relaxed text-white/80"
            >
              Set up once. Try on anything, anywhere.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-12 flex flex-wrap gap-4"
            >
              {user ? (
                <Link
                  href="/profile"
                  className="inline-flex rounded-sm border border-white/30 bg-white/5 px-8 py-3.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Go to Profile
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => setSignUpOpen(true)}
                    className="inline-flex rounded-sm border border-gold bg-gold/20 px-8 py-3.5 text-sm font-medium text-gold transition hover:bg-gold/30"
                  >
                    Get Started
                  </button>
                  <Link
                    href="/auth/sign-in"
                    className="inline-flex rounded-sm border border-white/30 bg-white/5 px-8 py-3.5 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                </>
              )}
              <Link
                href="/closet"
                className="inline-flex rounded-sm border border-white/20 px-8 py-3.5 text-sm font-medium text-white/80 transition hover:text-white"
              >
                View Closet
              </Link>
            </motion.div>
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="absolute bottom-12 left-0 z-10 pl-6 text-sm text-white/50 md:pl-16 lg:pl-24 xl:pl-32"
        >
          Already 127 people have saved 1,243 outfits from mirror shots.
        </motion.p>
      </section>

      {/* Brand Showcase */}
      <BrandMarquee />

      {/* How it works — 3 steps */}
      <section className="border-t border-white/10 py-28 md:py-36">
        <div className="mx-auto max-w-6xl px-4 md:px-4">
          <AnimatedSection className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.4em] text-white/60">
              How it works
            </p>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
              Three simple steps
            </h2>
          </AnimatedSection>
          <div className="mt-20 grid gap-16 text-center md:grid-cols-3 md:gap-12">
            <AnimatedSection className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-lg font-bold text-gold">
                1
              </div>
              <h3 className="mt-6 font-medium uppercase tracking-wider text-white">
                Upload 2 fitting photos (beta)
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Upload your mirror shots to your profile one by one (1st, 2nd). Beta supports up to 2 photos.
              </p>
            </AnimatedSection>
            <AnimatedSection className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-lg font-bold text-gold">
                2
              </div>
              <h3 className="mt-6 font-medium uppercase tracking-wider text-white">
                Click Try On while shopping
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Browse Zara and hit Try On on any product you like.
              </p>
            </AnimatedSection>
            <AnimatedSection className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-lg font-bold text-gold">
                3
              </div>
              <h3 className="mt-6 font-medium uppercase tracking-wider text-white">
                Review and save the result
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                View the try-on result in the panel, then save the product link for later.
              </p>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Use cases — 4 cards */}
      <section className="border-t border-white/10 py-28 md:py-36">
        <div className="mx-auto max-w-6xl px-4 md:px-4">
          <AnimatedSection className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.4em] text-white/60">
              Use cases
            </p>
            <h2 className="mt-4 font-serif text-3xl font-bold tracking-tight text-white md:text-4xl">
              For every occasion
            </h2>
          </AnimatedSection>
          <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {USE_CASES.map((item, i) => (
              <AnimatedSection key={item.title}>
                <div className="group flex flex-col overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition hover:border-white/20 hover:bg-white/[0.06]">
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.03]"
                      sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 100vw"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-4 pt-12">
                      <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
                        0{i + 1} {item.title.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col items-center px-6 py-5 text-center">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                      For every occasion
                    </span>
                    <h3 className="mt-2 font-medium uppercase tracking-wider text-white">
                    {item.title}
                  </h3>
                    <p className="mt-2 text-sm text-white/70">{item.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Dev / Investor — Architecture diagram */}
      <section className="border-t border-white/10 py-28 md:py-36">
        <div className="mx-auto max-w-6xl px-4 md:px-4">
          <AnimatedSection className="text-center">
            <p className="text-xs font-medium uppercase tracking-[0.4em] text-white/50">
              For developers & investors
            </p>
            <h2 className="mt-4 font-serif text-2xl font-bold tracking-tight text-white md:text-3xl">
              System Flow
            </h2>
            <p className="mt-4 text-sm text-white/60">
              One web app, two behavior shifts: online via Chrome extension, offline via Smart Glass.
            </p>
          </AnimatedSection>
          <AnimatedSection className="mt-16">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-6 py-8 md:px-10 md:py-10">
              {/* Center: web app as the source of truth */}
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="inline-flex flex-col gap-1 rounded-lg border border-white/20 bg-white/5 px-6 py-3">
                  <span className="text-sm font-medium text-white/90">Main WEB</span>
                  <span className="text-xs text-white/50">Profile · Fitting photos · Closet</span>
                </div>
                <p className="text-xs text-white/50">
                  One identity and fitting profile powering every surface.
                </p>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:gap-10">
                {/* Online lane */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/50">
                    Online lane
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/80">
                    Chrome extension for instant try-on while you shop online.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <div className="flex flex-col gap-1 rounded-lg border border-white/20 bg-white/5 px-5 py-3">
                      <span className="text-sm font-medium text-white/90">Chrome extension</span>
                      <span className="text-xs text-white/50">Zara · Try On</span>
                    </div>
                    <span className="text-lg text-white/30">←</span>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/20 bg-white/5 px-5 py-3">
                      <span className="text-sm font-medium text-white/90">Web app</span>
                      <span className="text-xs text-white/50">Same profile & photos</span>
                    </div>
                    <span className="text-lg text-white/30">→</span>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/20 bg-white/5 px-5 py-3">
                      <span className="text-sm font-medium text-white/90">AI worker (Nano Banana)</span>
                      <span className="text-xs text-white/50">Generates try-on results</span>
                    </div>
                  </div>
                </div>

                {/* Offline lane */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.35em] text-white/50">
                    Offline lane
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/80">
                    Smart Glass (coming soon) for in-store, hands-free try-on.
                  </p>
                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <div className="flex flex-col gap-1 rounded-lg border-2 border-gold bg-gold/15 px-5 py-3">
                      <span className="text-sm font-medium text-gold">Smart Glass</span>
                      <span className="text-xs text-gold/70">Coming soon</span>
                    </div>
                    <span className="text-lg text-white/30">←</span>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/20 bg-white/5 px-5 py-3">
                      <span className="text-sm font-medium text-white/90">Web app</span>
                      <span className="text-xs text-white/50">Same profile & photos</span>
                    </div>
                    <span className="text-lg text-white/30">→</span>
                    <div className="flex flex-col gap-1 rounded-lg border border-white/20 bg-white/5 px-5 py-3">
                      <span className="text-sm font-medium text-white/90">AI worker (Nano Banana)</span>
                      <span className="text-xs text-white/50">Generates try-on results</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-6 text-center">
                <p className="text-sm font-medium text-white/80">Same you. Online or offline.</p>
                <p className="mt-2 text-xs text-white/50">
                  One web app fans out into every shopping experience.
                </p>
                <p className="mt-4 font-serif text-base font-semibold tracking-[0.22em] text-gold">
                  We call it, TRYL Omniverse.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-white/10 py-28">
        <div className="mx-auto max-w-6xl px-4 md:px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="font-serif text-3xl font-light text-white md:text-4xl"
          >
            Ready to try?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-white/70"
          >
            Upload 2 fitting photos (beta), then try on from Zara product pages with the Chrome extension.
          </motion.p>
          {!user && (
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 }}
              onClick={() => setSignUpOpen(true)}
              className="mt-10 inline-block rounded-sm border border-gold bg-gold/20 px-10 py-4 text-sm font-medium text-gold transition hover:bg-gold/30"
            >
              Create free account
            </motion.button>
          )}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-16 border-t border-white/10 pt-10"
          >
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
              Coming soon
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                disabled
                className="cursor-not-allowed rounded-sm border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/40"
              >
                Chrome Extension
              </button>
              <button
                disabled
                className="cursor-not-allowed rounded-sm border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/40"
              >
                App Store
              </button>
              <button
                disabled
                className="cursor-not-allowed rounded-sm border border-white/15 bg-white/[0.03] px-4 py-2 text-xs font-medium text-white/40"
              >
                Play Store
              </button>
            </div>
            <p className="mt-3 text-xs text-white/30">Not yet available</p>
          </motion.div>
        </div>
      </section>

      <SignUpModal isOpen={signUpOpen} onClose={() => setSignUpOpen(false)} />
    </div>
  );
}
