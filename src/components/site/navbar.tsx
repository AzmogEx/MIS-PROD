/* eslint-disable @next/next/no-img-element */
"use client";

import { useSiteContent, useLocalizedHref } from "@/components/cms/content-context";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";


export function Navbar() {
  const { site: SITE, navigation: copy } = useSiteContent();
  const localize = useLocalizedHref();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [menuOpen]);
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 24);
  });

  return (
    <motion.header
      initial={{ y: -32, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      // Important : on cible UNIQUEMENT les propriétés qui changent au scroll
      // (background, border, backdrop). transition-all entrerait en conflit
      // avec l'animation Motion sur transform/opacity au mount.
      className={cn(
        "fixed inset-x-0 top-0 z-50",
        "transition-[background-color,border-color,backdrop-filter] duration-500 ease-out",
        scrolled
          ? "border-b border-white/[0.08] bg-[rgba(5,5,5,0.7)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-gradient-to-b from-background/55 via-background/25 to-transparent",
      )}
    >
      <nav className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6 md:px-10">
        {/* Logo / wordmark */}
        <Link
          href={localize('/')}
          aria-label={copy.logoAlt}
          className="group flex items-center gap-3"
        >
          <span
            className="font-serif text-2xl tracking-[0.18em] text-foreground transition-colors group-hover:text-gold"
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
          >
            {copy.logoImage ? <img src={copy.logoImage} alt={copy.logoAlt} className="h-10 max-w-36 object-contain" /> : copy.logo}
          </span>
          <span className="hidden h-3 w-px bg-foreground/30 md:block" />
          <span
            className="hidden font-mono text-[10px] uppercase tracking-[0.32em] text-foreground/65 md:block"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
          >
            {copy.studioLabel} · {SITE.city} · {SITE.foundedYear}
          </span>
        </Link>

        {/* Liens centrés */}
        <ul className="hidden items-center gap-10 md:flex">
          {copy.links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="group relative font-mono text-[11px] uppercase tracking-[0.28em] text-foreground/85 transition-colors hover:text-foreground"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-gold transition-all duration-500 group-hover:w-full" />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
        <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-foreground md:hidden" aria-label={menuOpen ? copy.menuClose : copy.menuOpen} aria-expanded={menuOpen} aria-controls="mis-mobile-menu" onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
        {/* CTA contact */}
        <Link
          href={copy.briefHref}
          className="group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full border border-foreground/30 bg-background/20 px-5 font-mono text-[11px] uppercase tracking-[0.24em] text-foreground backdrop-blur-md transition-[color,border-color,background-color] duration-500 hover:border-gold hover:bg-gold/10 hover:text-gold"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.4)" }}
        >
          <span className="relative z-10">{copy.briefLabel}</span>
          <span className="relative z-10 transition-transform duration-500 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
        </div>
      </nav>
      {menuOpen && <nav id="mis-mobile-menu" aria-label={copy.menuLabel} className="border-t border-border bg-background px-6 py-4 md:hidden"><ul>{copy.links.map(link => <li key={link.href}><Link href={link.href} onClick={() => setMenuOpen(false)} className="block rounded px-3 py-4 text-base text-foreground focus-visible:outline-2 focus-visible:outline-gold">{link.label}</Link></li>)}</ul></nav>}
    </motion.header>
  );
}
