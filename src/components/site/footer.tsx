"use client";

import { useSiteContent, useLocalizedHref } from "@/components/cms/content-context";

import Link from "next/link";
import { Instagram, Linkedin, Youtube } from "lucide-react";




export function Footer() {
  const { site: SITE, footer: copy } = useSiteContent();
  const localize = useLocalizedHref();
  const socialIcons = { instagram: Instagram, linkedin: Linkedin, youtube: Youtube };
  return (
    <footer className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 md:py-28">
        {/* Bloc supérieur — wordmark énorme + colonnes */}
        <div className="grid gap-16 md:grid-cols-12 md:gap-10">
          {/* Wordmark + signature */}
          <div className="md:col-span-5">
            <Link href={localize('/')} className="group inline-block" aria-label={copy.homeLabel}>
              <span className="block font-serif text-[clamp(3rem,9vw,7rem)] leading-none tracking-[-0.02em] text-foreground transition-colors group-hover:text-gold">
                {copy.logo}
              </span>
              <span className="mt-3 block font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
                {copy.signature}
              </span>
            </Link>
            <p className="mt-8 max-w-md font-serif text-xl italic leading-snug text-foreground-muted">
              {SITE.tagline}
            </p>
            <div className="mt-10 flex items-center gap-4">
              <span className="h-px w-10 bg-gold/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                {copy.studioLabel} · {SITE.city} · {copy.sinceLabel} {SITE.foundedYear}
              </span>
            </div>
          </div>

          {/* Colonnes nav */}
          <div className="grid grid-cols-2 gap-10 md:col-span-7 md:grid-cols-3">
            {copy.columns.map((col) => (
              <div key={col.label}>
                <h3 className="mb-6 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
                  {col.label}
                </h3>
                <ul className="space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center font-sans text-sm text-foreground-muted transition-colors hover:text-foreground"
                      >
                        <span className="inline-grid grid-cols-[0fr] overflow-hidden text-gold transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-cols-[1fr]">
                          <span className="min-w-0 pr-2 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                            ↗
                          </span>
                        </span>
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Séparateur */}
        <div className="my-16 h-px w-full bg-border md:my-20" />

        {/* Bloc bas — contact + social + copyright */}
        <div className="grid gap-10 md:grid-cols-12 md:items-end md:gap-6">
          {/* Contact */}
          <div className="md:col-span-5">
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
              {copy.contactLabel}
            </h3>
            <a
              href={`mailto:${SITE.email}`}
              className="block font-serif text-2xl italic text-foreground transition-colors hover:text-gold md:text-3xl"
            >
              {SITE.email}
            </a>
            <a
              href={`tel:${SITE.phoneE164}`}
              className="mt-2 block font-sans text-sm text-foreground-muted transition-colors hover:text-foreground"
            >
              {SITE.phone}
            </a>
            <p className="mt-4 font-sans text-sm text-foreground-muted">
              {SITE.address.postalCode} {SITE.address.city}, {SITE.address.country}
            </p>
          </div>

          {/* Social */}
          <div className="md:col-span-4">
            <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
              {copy.socialLabel}
            </h3>
            <ul className="flex gap-3">
              {copy.socialLinks.map(({ href, label, icon }) => {
                const Icon = socialIcons[icon as keyof typeof socialIcons] ?? Instagram;
                return (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-border-strong text-foreground-muted transition-all duration-500 hover:border-gold hover:text-gold"
                  >
                    <Icon
                      className="h-4 w-4 transition-transform duration-500 group-hover:scale-110"
                      strokeWidth={1.25}
                    />
                  </a>
                </li>
              ); })}
            </ul>
          </div>

          {/* Copyright */}
          <div className="md:col-span-3 md:text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-foreground-subtle">
              © {new Date().getFullYear()} {SITE.name}
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground-subtle">
              {copy.rightsLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Ligne or finale */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </footer>
  );
}
