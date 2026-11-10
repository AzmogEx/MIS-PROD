"use client";

import { useSiteContent, useLocalizedHref } from "@/components/cms/content-context";

import Link from "next/link";
import { Instagram, Linkedin, Youtube } from "lucide-react";




export function Footer() {
  const { site: SITE, footer: copy } = useSiteContent();
  const localize = useLocalizedHref();
  const socialIcons = { instagram: Instagram, linkedin: Linkedin, youtube: Youtube };
  return (
    <footer data-cms-field="footer" className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-[1440px] px-6 py-20 md:px-10 md:py-28">
        {/* Bloc supérieur — wordmark énorme + colonnes */}
        <div className="grid gap-16 md:grid-cols-12 md:gap-10">
          {/* Wordmark + signature */}
          <div className="md:col-span-5">
            <Link data-cms-field="footer" data-cms-path="footer.homeLabel" href={localize('/')} className="group inline-block" aria-label={copy.homeLabel}>
              <span className="block font-serif text-[clamp(3rem,9vw,7rem)] leading-none tracking-[-0.02em] text-foreground transition-colors group-hover:text-gold">
                <span data-cms-path="footer.logo">{copy.logo}</span>
              </span>
              <span data-cms-path="footer.signature" className="mt-3 block font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
                {copy.signature}
              </span>
            </Link>
            <p data-cms-field="site" data-cms-path="site.tagline" className="mt-8 max-w-md font-serif text-xl italic leading-snug text-foreground-muted">
              {SITE.tagline}
            </p>
            <div className="mt-10 flex items-center gap-4">
              <span className="h-px w-10 bg-gold/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-gold">
                <span data-cms-field="footer" data-cms-path="footer.studioLabel">{copy.studioLabel}</span> · <span data-cms-field="site" data-cms-path="site.city">{SITE.city}</span> · <span data-cms-field="footer" data-cms-path="footer.sinceLabel">{copy.sinceLabel}</span> <span data-cms-field="site" data-cms-path="site.foundedYear">{SITE.foundedYear}</span>
              </span>
            </div>
          </div>

          {/* Colonnes nav */}
          <div className="grid grid-cols-2 gap-10 md:col-span-7 md:grid-cols-3">
            {copy.columns.map((col, columnIndex) => (
              <div key={col.label}>
                <h3 data-cms-path={`footer.columns.${columnIndex}.label`} className="mb-6 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
                  {col.label}
                </h3>
                <ul className="space-y-3">
                  {col.links.map((link, linkIndex) => (
                    <li key={link.href}>
                      <Link
                        data-cms-path={`footer.columns.${columnIndex}.links.${linkIndex}.href`}
                        href={link.href}
                        className="group inline-flex items-center font-sans text-sm text-foreground-muted transition-colors hover:text-foreground"
                      >
                        <span className="inline-grid grid-cols-[0fr] overflow-hidden text-gold transition-[grid-template-columns] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:grid-cols-[1fr]">
                          <span className="min-w-0 pr-2 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                            ↗
                          </span>
                        </span>
                        <span data-cms-path={`footer.columns.${columnIndex}.links.${linkIndex}.label`}>{link.label}</span>
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
            <h3 data-cms-path="footer.contactLabel" className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
              {copy.contactLabel}
            </h3>
            <a
              data-cms-path="site.email"
              href={`mailto:${SITE.email}`}
              className="block font-serif text-2xl italic text-foreground transition-colors hover:text-gold md:text-3xl"
            >
              {SITE.email}
            </a>
            <a
              data-cms-path="site.phoneE164"
              href={`tel:${SITE.phoneE164}`}
              className="mt-2 block font-sans text-sm text-foreground-muted transition-colors hover:text-foreground"
            >
              <span data-cms-field="site" data-cms-path="site.phone">{SITE.phone}</span>
            </a>
            <p className="mt-4 font-sans text-sm text-foreground-muted">
              <span data-cms-field="site" data-cms-path="site.address.postalCode">{SITE.address.postalCode}</span> <span data-cms-field="site" data-cms-path="site.address.city">{SITE.address.city}</span>, <span data-cms-field="site" data-cms-path="site.address.country">{SITE.address.country}</span>
            </p>
          </div>

          {/* Social */}
          <div className="md:col-span-4">
            <h3 data-cms-path="footer.socialLabel" className="mb-4 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
              {copy.socialLabel}
            </h3>
            <ul className="flex gap-3">
              {copy.socialLinks.map(({ href, label, icon }, index) => {
                const Icon = socialIcons[icon as keyof typeof socialIcons] ?? Instagram;
                return (
                <li key={label}>
                  <a
                    data-cms-path={`footer.socialLinks.${index}.href`}
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
              © {new Date().getFullYear()} <span data-cms-field="site" data-cms-path="site.name">{SITE.name}</span>
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground-subtle">
              <span data-cms-path="footer.rightsLabel">{copy.rightsLabel}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Ligne or finale */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
    </footer>
  );
}
