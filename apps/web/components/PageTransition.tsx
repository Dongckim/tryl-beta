"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-[calc(100vh-4rem)] min-w-full bg-black">
      <motion.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.45, ease }}
        className="min-h-[calc(100vh-4rem)]"
      >
        {children}
      </motion.div>
    </div>
  );
}
