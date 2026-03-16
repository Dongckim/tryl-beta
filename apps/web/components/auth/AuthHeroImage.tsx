"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function AuthHeroImage() {
  const pathname = usePathname();
  const isSignUp = pathname?.includes("/auth/sign-up") ?? false;
  const src = isSignUp ? "/images/auth-signup-hero.png" : "/images/auth-hero.png";

  return (
    <div className="relative hidden flex-1 overflow-hidden bg-gray-900 sm:block" aria-hidden>
      <Image
        src={src}
        alt=""
        fill
        className="object-cover object-center"
        priority
        sizes="58vw"
      />
    </div>
  );
}
