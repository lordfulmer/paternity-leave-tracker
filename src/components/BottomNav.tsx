"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Heart, ClipboardCheck, History } from "lucide-react";
import { motion } from "framer-motion";

const items = [
  { href: "/", label: "Home", icon: Home },
  { href: "/log", label: "Log", icon: Dumbbell },
  { href: "/whoop", label: "Whoop", icon: Heart },
  { href: "/check-in", label: "Check-in", icon: ClipboardCheck },
  { href: "/history", label: "History", icon: History },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-bg-elevated/95 backdrop-blur-md border-t border-border z-50">
      <div className="max-w-2xl mx-auto grid grid-cols-5 px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium"
            >
              <Icon
                className={`w-5 h-5 transition-colors ${active ? "text-accent" : "text-ink-muted"}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={active ? "text-accent" : "text-ink-muted"}>{label}</span>
              {active && (
                <motion.div
                  layoutId="navindicator"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-accent"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
