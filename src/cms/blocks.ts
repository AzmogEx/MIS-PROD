import type { Block, Field } from 'payload'

export const styleFields: Field[] = [
  { name: 'hidden', label: 'Masquer cette section', type: 'checkbox', defaultValue: false },
  { name: 'anchor', label: 'Ancre (facultative)', type: 'text', validate: (value: unknown) => !value || /^[a-z][a-z0-9-]*$/.test(String(value)) || 'Utilisez des lettres minuscules, chiffres et tirets.' },
  { name: 'appearance', label: 'Apparence locale (vide = héritage)', type: 'group', fields: [
    { name: 'background', label: 'Fond', type: 'select', options: ['inherit', 'dark', 'elevated', 'gold'], defaultValue: 'inherit' },
    { name: 'color', label: 'Texte', type: 'select', options: ['inherit', 'light', 'muted', 'gold'], defaultValue: 'inherit' },
    { name: 'align', label: 'Alignement', type: 'select', options: ['left', 'center', 'right'], defaultValue: 'left' },
    { name: 'width', label: 'Largeur', type: 'select', options: ['full', 'wide', 'reading'], defaultValue: 'wide' },
    { name: 'spacing', label: 'Espacement vertical', type: 'select', options: ['inherit', 'compact', 'normal', 'generous'], defaultValue: 'inherit' },
    { name: 'columns', label: 'Colonnes ordinateur', type: 'number', min: 1, max: 4, defaultValue: 1 },
    { name: 'gridLayout', label: 'Disposition des grilles historiques', type: 'select', defaultValue: 'original', options: [{ label: 'Composition d’origine', value: 'original' }, { label: 'Grille régulière — colonnes réglables', value: 'uniform' }], admin: { description: 'Piliers, chiffres, cartes univers, réalisations hors mise en avant, témoignages, tarifs/options et galerie des pages univers. Les en-têtes et les lignes de prestations restent inchangés.' } },
    { name: 'radius', label: 'Arrondi', type: 'number', min: 0, max: 64, defaultValue: 0 },
    { name: 'border', label: 'Bordure', type: 'checkbox' },
    { name: 'customBackground', label: 'Fond personnalisé (vide = préréglage)', type: 'text', validate: safeColor },
    { name: 'customColor', label: 'Texte personnalisé (vide = préréglage)', type: 'text', validate: safeColor },
    { name: 'typeface', label: 'Typographie locale', type: 'select', options: [{ label:'Hériter',value:'inherit' },{ label:'Sans empattement',value:'sans' },{ label:'Éditoriale',value:'serif' },{ label:'Technique',value:'mono' }], defaultValue:'inherit' },
    { name: 'tabletColumns', label: 'Colonnes tablette (vide = ordinateur)', type: 'number', min:1, max:4 },
    { name: 'mobileColumns', label: 'Colonnes mobile', type: 'number', min:1, max:2, defaultValue:1 },
    { name: 'animation', label: 'Animation de section', type: 'select', options:[{label:'Hériter',value:'inherit'},{label:'Aucune',value:'none'},{label:'Apparition douce',value:'fade'}], defaultValue:'inherit' },
    { name: 'animationDuration', label: 'Durée de l’apparition (ms)', type: 'number', min:100, max:1500, defaultValue:500 },
  ] },
]

const legacy = (slug: string, name: string, fields: Field[] = []): Block => ({ slug, labels: { singular: name, plural: name }, fields: [...fields, ...styleFields] })
const textFields: Field[] = [
  { name: 'eyebrow', label: 'Surtitre', type: 'text', localized: true },
  { name: 'title', label: 'Titre', type: 'text', localized: true },
  { name: 'body', label: 'Texte', type: 'textarea', localized: true },
  { name: 'media', label: 'Média', type: 'upload', relationTo: 'media' },
  { name: 'linkLabel', label: 'Texte du bouton', type: 'text', localized: true },
  { name: 'link', label: 'Adresse du bouton', type: 'text', validate: safeLink },
]
export function safeLink(value: unknown) { return !value || /^(\/(?!\/)|#|https:\/\/|mailto:|tel:)/.test(String(value)) || 'Adresse interne /… ou lien https, mailto, tel requis.' }
export function safeColor(value: unknown) { return !value || /^#[0-9a-f]{6}$/i.test(String(value)) || 'Couleur hexadécimale à six chiffres requise, ex. #c9a961.' }

export const pageBlocks: Block[] = [
  legacy('hero', 'Accueil — introduction'), legacy('manifesto', 'Manifeste'), legacy('stats', 'Chiffres du studio'),
  legacy('universes', 'Univers'), legacy('portfolio', 'Réalisations'), legacy('clients', 'Clients et témoignages'),
  legacy('cta', 'Invitation au brief'), legacy('pricing', 'Tarifs mariage'),
  legacy('universe', 'Page univers', [{ name: 'universeSlug', label: 'Identifiant de l’univers', type: 'text', required: true }]),
  legacy('contact', 'Formulaire de brief', [{ name: 'formSlug', label: 'Formulaire', type: 'text', defaultValue: 'brief-projet' }]),
  legacy('legal', 'Document légal', [{ name: 'title', label: 'Titre', type: 'text', localized: true }, { name: 'number', label: 'Numéro', type: 'text' }, { name: 'lastUpdate', label: 'Date de mise à jour affichée', type: 'text' }, { name: 'sections', label: 'Paragraphes', type: 'array', fields: [{ name: 'kind', label: 'Type', type: 'select', options: ['paragraph', 'heading', 'subheading', 'list'], defaultValue: 'paragraph' }, { name: 'text', label: 'Texte (coordonnées partagées : {{site.email}})', type: 'textarea', localized: true }] }]),
  legacy('editorial', 'Titre, texte, image et bouton', textFields),
  legacy('columns', 'Colonnes', [{ name: 'items', label: 'Colonnes', type: 'array', maxRows: 4, fields: textFields }]),
  legacy('gallery', 'Galerie de médias', [{ name: 'title', label: 'Titre', type: 'text', localized: true }, { name: 'items', label: 'Images / vidéos', type: 'array', fields: [{ name: 'media', type: 'upload', relationTo: 'media', required: true }, { name: 'caption', label: 'Légende', type: 'text', localized: true }] }]),
  legacy('faq', 'Questions fréquentes', [{ name: 'title', label: 'Titre', type: 'text', localized: true }, { name: 'items', label: 'Questions', type: 'array', fields: [{ name: 'question', label: 'Question', type: 'text', required: true, localized: true }, { name: 'answer', label: 'Réponse', type: 'textarea', required: true, localized: true }] }]),
  legacy('steps', 'Étapes, équipe ou prestations', [{ name: 'title', label: 'Titre', type: 'text', localized: true }, { name: 'items', label: 'Éléments', type: 'array', fields: textFields }]),
  legacy('shared', 'Section synchronisée', [{ name: 'section', label: 'Section partagée', type: 'relationship', relationTo: 'shared-sections', required: true }]),
]
