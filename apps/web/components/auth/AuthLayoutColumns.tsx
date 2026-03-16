"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function AuthLayoutColumns({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSignUp = pathname?.includes("/auth/sign-up") ?? false;
  const src = isSignUp ? "/images/auth-signup-hero.png" : "/images/auth-hero.png";

  const formPanel = (
    <div className="flex w-full flex-1 flex-col overflow-y-auto bg-white px-6 py-6 sm:w-[42%] sm:flex-none sm:px-12 sm:py-10">
      <div className="mx-auto w-full max-w-sm flex-1 sm:flex sm:min-h-0 sm:items-center">
        <div className="w-full">{children}</div>
      </div>
    </div>
  );

  const imagePanel = (
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

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-10 flex overflow-hidden">
      {isSignUp ? (
        <>
          {imagePanel}
          {formPanel}
        </>
      ) : (
        <>
          {formPanel}
          {imagePanel}
        </>
      )}
    </div>
  );
}
