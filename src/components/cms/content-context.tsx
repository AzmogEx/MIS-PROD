"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { usePathname } from 'next/navigation';
import { defaultContent, type SiteContent } from "@/cms/seed-content";

const SiteContentContext = createContext<SiteContent>(defaultContent);
const ContentLocaleContext = createContext<'fr' | 'en' | undefined>(undefined);

/** The server supplies an already decoded published snapshot (or protected preview). */
export function SiteContentProvider({ content, children, locale }: { content?: SiteContent; children: ReactNode; locale?: 'fr' | 'en' }) {
  const snapshot = useMemo(() => content ?? defaultContent, [content]);
  return <ContentLocaleContext.Provider value={locale}><SiteContentContext.Provider value={snapshot}><MotionConfig reducedMotion="user">{children}</MotionConfig></SiteContentContext.Provider></ContentLocaleContext.Provider>;
}

export function useSiteContent() { return useContext(SiteContentContext); }
export function useLocalizedHref() {
  const path = usePathname(); const locale = useContext(ContentLocaleContext);
  const english = locale ? locale === 'en' : /^\/en(?:\/|$)/.test(path || '');
  return (href: string) => english && /^\/(?!\/|api\/|en(?:\/|$))/.test(href) ? '/en' + (href === '/' ? '' : href) : href;
}
