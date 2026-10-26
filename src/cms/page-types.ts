export interface MediaRecord { id: number; url?: string | null; alt?: string; mimeType?: string; width?: number; height?: number; poster?: MediaRecord; captions?: MediaRecord; transcript?: string; language?:'fr'|'en'; visibility?: string; rightsUntil?: string }
export interface PageBlock {
  id?: string; blockType: string; blockName?: string; hidden?: boolean; anchor?: string;
  title?: string; eyebrow?: string; body?: string; media?: MediaRecord | number | null; linkLabel?: string; link?: string;
  universeSlug?: string; formSlug?: string; number?: string; lastUpdate?: string;
  sections?: { kind: string; text: string }[];
  items?: (PageBlock & { question?: string; answer?: string; caption?: string })[];
  section?: { id: number; layout: PageBlock[] } | number | null;
  appearance?: { background?: string; color?: string; align?: 'left' | 'center' | 'right'; width?: string; spacing?: string; columns?: number; gridLayout?: 'original' | 'uniform'; radius?: number; border?: boolean; customBackground?:string; customColor?:string; typeface?:'inherit'|'sans'|'serif'|'mono'; tabletColumns?:number; mobileColumns?:number; animation?:'inherit'|'none'|'fade'; animationDuration?:number };
}
export interface PageRecord {
  id: number; title: string; path: string; layout: PageBlock[]; _status?: 'draft' | 'published'; updatedAt: string;
  seo?: { title?: string; description?: string; noindex?: boolean; image?: MediaRecord | null };
  translationState?: string;
}
