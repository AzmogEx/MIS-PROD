/**
 * Données des 3 univers MIS.
 * Centralisées ici — utilisées par UniversesSection (preview homepage),
 * UniversePageLayout (template page dédiée) et le contact form.
 */

export type UniverseSlug = string;

export type UniverseFormula = {
  number: string;
  title: string;
  description: string;
  bullets: string[];
  /** Indication tarifaire ou format ("Sur devis", "À partir de…", etc.) */
  meta?: string;
};

export type UniversePortfolioItem = {
  title: string;
  category: string;
  /** "tall" / "wide" / "square" — pour le layout masonry */
  shape: "tall" | "wide" | "square";
  ambiance: "warm" | "cold" | "champagne";
  /**
   * Seed Picsum Photos — détermine de façon stable l'image affichée.
   * À remplacer par une URL d'image réelle (ou un fichier /public)
   * quand le client fournira son portfolio.
   */
  seed: string;
  /**
   * Chemin vers une vidéo MP4 (placée dans /public/videos/) qui sera
   * jouée dans la lightbox au clic sur la card. Optionnel.
   */
  videoSrc?: string;
  imageSrc?: string;
  alt?: string;
};

export type Universe = {
  slug: UniverseSlug;
  number: string;
  eyebrow: string;
  /** Pour la nav et la card homepage */
  shortName: string;
  /** Titre h1 de la page univers */
  title: string;
  /** Sous-titre dramatique sous le h1 */
  subtitle: string;
  /** Phrase d'accroche / promesse */
  pitch: string;
  /** Description longue */
  intro: string;
  ambiance: "warm" | "cold" | "champagne";
  formulas: UniverseFormula[];
  portfolio: UniversePortfolioItem[];
};

export const UNIVERSES: Record<UniverseSlug, Universe> = {
  institutions: {
    slug: "institutions",
    number: "01",
    eyebrow: "Institutions · Santé",
    shortName: "Institutions",
    title: "Réveiller la mémoire.",
    subtitle:
      "Pour les EHPAD, hôpitaux, collectivités et structures médico-sociales.",
    pitch:
      "L'image comme outil thérapeutique, comme trace, comme transmission.",
    intro:
      "Depuis 2017, MIS accompagne les institutions de santé et les collectivités dans la création de contenus à forte valeur humaine. Ateliers mémoire pour résidents d'EHPAD, documentaires de vie, captations d'événements internes : nous filmons avec la pudeur et la précision qu'exigent ces contextes.",
    ambiance: "warm",
    formulas: [
      {
        number: "F.01",
        title: "Atelier mémoire vidéo",
        description:
          "Une séance de 2h en chambre ou en salle commune, autour d'archives photo/vidéo et d'objets personnels. Restitution d'un film court de 5 à 8 minutes pour le résident et sa famille.",
        bullets: [
          "Cadre intime, prise de son discrète",
          "Montage tendre, musique sobre",
          "Format DVD + lien privé pour la famille",
        ],
        meta: "À partir de 480 €",
      },
      {
        number: "F.02",
        title: "Documentaire de vie",
        description:
          "Un récit cinématographique de 12 à 25 minutes mêlant interviews, archives, regards, lieux marquants. Pour les résidents qui souhaitent transmettre.",
        bullets: [
          "Repérage + interviews multi-séances",
          "Numérisation d'archives familiales",
          "Livraison HD + projection en institution",
        ],
        meta: "Sur devis",
      },
      {
        number: "F.03",
        title: "Captation d'événements institutionnels",
        description:
          "Conférences, journées portes ouvertes, fêtes annuelles, formations internes. Captation multi-caméras + livraison rapide.",
        bullets: [
          "1 à 4 caméras + son HF",
          "Livraison sous 7 jours",
          "Sous-titres SME en option",
        ],
      },
      {
        number: "F.04",
        title: "Films de sensibilisation",
        description:
          "Films pédagogiques pour campagnes, formations, recrutement. Témoignages, mises en situation, voix off.",
        bullets: [
          "Écriture + storyboard",
          "Comédiens / témoins encadrés",
          "Livraison broadcast / réseaux sociaux",
        ],
      },
    ],
    portfolio: [
      { title: "Mémoires de Saint-Joseph", category: "Atelier mémoire", shape: "tall", ambiance: "warm", seed: "mzn-inst-1" },
      { title: "Le récit d'Henri, 92 ans", category: "Documentaire de vie", shape: "wide", ambiance: "warm", seed: "mzn-inst-2" },
      { title: "Inauguration nouvelle aile", category: "Événement", shape: "square", ambiance: "warm", seed: "mzn-inst-3" },
      { title: "Campagne bientraitance", category: "Sensibilisation", shape: "square", ambiance: "warm", seed: "mzn-inst-4" },
      { title: "Atelier réminiscence", category: "Atelier mémoire", shape: "wide", ambiance: "warm", seed: "mzn-inst-5" },
      { title: "Portrait de Yvette", category: "Documentaire de vie", shape: "tall", ambiance: "warm", seed: "mzn-inst-6" },
    ],
  },

  entreprises: {
    slug: "entreprises",
    number: "02",
    eyebrow: "Entreprises · Broadcast",
    shortName: "Entreprises",
    title: "Diffuser l'expertise.",
    subtitle:
      "Pour les groupes, ETI, agences événementielles et services communication.",
    pitch:
      "Plateaux TV mobiles, streaming 4K, multi-caméras. La régie pro qui se déplace.",
    intro:
      "Quand votre événement n'a pas le droit d'avoir un plan B, MIS devient votre régie broadcast itinérante. ATEM, LiveU, Canon EOS R5, micros Sennheiser : nous transformons une salle, un parking, un parc en plateau de diffusion 4K. Latence sub-seconde, redondance complète.",
    ambiance: "cold",
    formulas: [
      {
        number: "F.01",
        title: "Plateau TV mobile",
        description:
          "Régie complète sur site : 3 à 6 caméras, mixer ATEM, fond LED, prompteur, deux animateurs, retransmission live.",
        bullets: [
          "Régie ATEM Mini Extreme + ISO recording",
          "Streaming RTMP/SRT vers vos canaux",
          "Habillage graphique sur mesure",
        ],
        meta: "À partir de 3 200 € / jour",
      },
      {
        number: "F.02",
        title: "Live streaming 4K",
        description:
          "Diffusion 4K HDR multi-plateformes (YouTube, LinkedIn Live, plateforme privée). Bonding 4G/5G LiveU pour les sites sans fibre.",
        bullets: [
          "LiveU LU800 — 14 modems redondants",
          "Latence sub-seconde",
          "Stats en temps réel",
        ],
      },
      {
        number: "F.03",
        title: "Captation multi-caméras",
        description:
          "2 à 6 caméras Canon EOS R5 + optiques L. Livraison master 4K + déclinaisons 16:9, 1:1, 9:16.",
        bullets: [
          "Étalonnage cinéma (DaVinci Resolve)",
          "Mixage audio 5.1 ou stéréo",
          "Sous-titrage FR / EN inclus",
        ],
      },
      {
        number: "F.04",
        title: "Films corporate",
        description:
          "Films de marque, recrutement, RSE, présentations produit. De l'écriture au livrable, en passant par l'étalonnage cinéma.",
        bullets: [
          "Écriture + storyboard",
          "Casting comédiens / collaborateurs",
          "Versions broadcast + réseaux",
        ],
        meta: "Sur devis",
      },
      {
        number: "F.05",
        title: "Webinaires hybrides",
        description:
          "Plateau présentiel + intervenants distants Zoom/Teams parfaitement intégrés. Habillage graphique, Q&R, modération en direct.",
        bullets: [
          "Régie audio dédiée intervenants distants",
          "Captation HD avec NDI",
          "Replay nettoyé + chapitrage",
        ],
      },
    ],
    portfolio: [
      { title: "Convention annuelle Groupe X", category: "Plateau TV", shape: "wide", ambiance: "cold", seed: "mzn-ent-1" },
      { title: "Lancement produit live", category: "Streaming 4K", shape: "tall", ambiance: "cold", seed: "mzn-ent-2" },
      { title: "Film RSE 2024", category: "Corporate", shape: "square", ambiance: "cold", seed: "mzn-ent-3" },
      { title: "Webinaire 600 participants", category: "Hybride", shape: "wide", ambiance: "cold", seed: "mzn-ent-4" },
      { title: "Recrutement Tech", category: "Marque employeur", shape: "tall", ambiance: "cold", seed: "mzn-ent-5" },
      { title: "Captation AG actionnaires", category: "Multi-caméras", shape: "square", ambiance: "cold", seed: "mzn-ent-6" },
    ],
  },

  particuliers: {
    slug: "particuliers",
    number: "03",
    eyebrow: "Particuliers · Héritage",
    shortName: "Particuliers",
    title: "Capturer l'instant.",
    subtitle:
      "Pour celles et ceux qui veulent un souvenir qui ne vieillit pas.",
    pitch:
      "Mariages cinématographiques, biographies vidéo, héritage filmé.",
    intro:
      "Un mariage, une biographie, un événement familial : ces instants méritent un regard de cinéma, pas un compte-rendu. MIS aborde chaque film personnel avec la même rigueur qu'un documentaire — repérage, écriture, étalonnage. Pour que vos enfants, et leurs enfants, regardent encore.",
    ambiance: "champagne",
    formulas: [
      {
        number: "F.01",
        title: "Film de mariage cinématographique",
        description:
          "Une journée filmée à 2 caméras, de la préparation au bouquet final. Livraison d'un film court (4-6 min) + un film long (25-40 min) + extraits réseaux.",
        bullets: [
          "2 chefs-opérateurs · son HF",
          "Drone (selon site)",
          "Étalonnage cinéma + bande-son licenciée",
        ],
        meta: "À partir de 2 400 €",
      },
      {
        number: "F.02",
        title: "Biographie vidéo",
        description:
          "Le récit d'une vie, raconté en 30 à 60 minutes. Interviews multi-séances, archives photo, lieux significatifs.",
        bullets: [
          "Préparation + 3 à 6 séances d'interview",
          "Numérisation d'archives familiales",
          "Livraison master + clé USB premium",
        ],
        meta: "Sur devis",
      },
      {
        number: "F.03",
        title: "Événements familiaux",
        description:
          "Anniversaires marquants, baptêmes, fêtes de famille. Captation discrète + film souvenir 6-10 min.",
        bullets: [
          "Format reportage immersif",
          "Mixage musique licenciée",
          "Livraison sous 4 semaines",
        ],
      },
      {
        number: "F.04",
        title: "Héritage filmé",
        description:
          "Lettre vidéo aux générations futures. Format intime, en huis clos, écrit avec vous.",
        bullets: [
          "Direction d'interview empathique",
          "Captation 4K + son haute fidélité",
          "Coffret bois + clé USB premium",
        ],
      },
    ],
    portfolio: [
      { title: "Lucile & Marc — Domaine de…", category: "Mariage", shape: "wide", ambiance: "champagne", seed: "mzn-part-1" },
      { title: "L'histoire d'Antoine, 78 ans", category: "Biographie", shape: "tall", ambiance: "champagne", seed: "mzn-part-2" },
      { title: "60 ans de mariage des Gérard", category: "Famille", shape: "square", ambiance: "champagne", seed: "mzn-part-3" },
      { title: "Camille & Théo — Camargue", category: "Mariage", shape: "tall", ambiance: "champagne", seed: "mzn-part-4" },
      { title: "Lettre à mes petits-enfants", category: "Héritage", shape: "wide", ambiance: "champagne", seed: "mzn-part-5" },
      { title: "Baptême de Joseph", category: "Famille", shape: "square", ambiance: "champagne", seed: "mzn-part-6" },
    ],
  },
};

export const UNIVERSES_LIST: Universe[] = Object.values(UNIVERSES);
