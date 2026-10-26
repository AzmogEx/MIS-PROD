import type { ReactNode } from "react";
import { useSiteContent } from '@/components/cms/content-context';

/**
 * Layout commun pour les pages légales (mentions, confidentialité, CGV).
 * Maquette éditoriale épurée, lisibilité maximale.
 */
export function LegalPageLayout({
  number,
  eyebrow,
  title,
  lastUpdate,
  children,
  headingLevel = 1,
}: {
  number: string;
  eyebrow: string;
  title: string;
  lastUpdate: string;
  children: ReactNode;
  headingLevel?: 1 | 2;
}) {
  const {ui}=useSiteContent();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  return (
    <div className="relative">
      {/* Hero éditorial */}
      <section className="relative border-b border-border bg-background pt-40 pb-20 md:pt-52 md:pb-28">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-foreground-subtle">
                ({number}) — {eyebrow}
              </p>
            </div>
            <div className="md:col-span-9">
              <Heading className="font-serif text-[clamp(2.5rem,6vw,5rem)] leading-[1.05] tracking-[-0.02em] text-foreground">
                {title}
              </Heading>
              <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.32em] text-foreground-subtle">
                {ui.lastUpdateLabel} · {lastUpdate}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contenu */}
      <section className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-[1440px] px-6 md:px-10">
          <div className="grid gap-10 md:grid-cols-12 md:gap-16">
            <div className="md:col-span-3" />
            <article className="prose-legal md:col-span-9 md:max-w-3xl">
              {children}
            </article>
          </div>
        </div>
      </section>
    </div>
  );
}
