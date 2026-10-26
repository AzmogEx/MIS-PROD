import { UNIVERSES_LIST } from '@/data/universes';
import { formUI, type FormUI } from './form-translations';

/** Shared, serializable schema. The server is authoritative for conditions and validation. */
export type FormFieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'file';
export type FormAnswer = string | boolean;
export type FormAnswers = Record<string, FormAnswer>;
export interface FormOption { value: string; label: string; description?: string | null }
export interface FormStep { key: string; label?: string | null; title: string; description?: string | null }
export interface FormField {
  key: string;
  label: string;
  type: FormFieldType;
  step: string;
  required?: boolean | null;
  placeholder?: string | null;
  help?: string | null;
  minLength?: number | null;
  maxLength?: number | null;
  options?: FormOption[] | null;
  conditionField?: string | null;
  conditionValues?: { value: string }[] | null;
}
export interface PublicForm {
  locale?: 'fr' | 'en'; requestedLocale?: 'fr' | 'en'; translationState?: 'source' | 'draft' | 'reviewed' | 'outdated'; ui?: FormUI;
  id?: string | number;
  slug: string;
  title: string;
  revision: string;
  steps: FormStep[];
  fields: FormField[];
  texts: {
    next: string; back: string; submit: string; pending: string;
    successTitle: string; successDescription: string; signature: string;
    errorTitle: string; networkError: string; invalidError: string;
    rateLimitError: string; unavailableError: string; requiredError: string;
    privacy: string; honeypot: string;
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFieldVisible(field: FormField, answers: FormAnswers): boolean {
  if (!field.conditionField) return true;
  return Boolean(field.conditionValues?.some(({ value }) => String(answers[field.conditionField!] ?? '') === value));
}

export function validateFormAnswers(form: PublicForm, input: unknown, onlyStep?: string): {
  answers: FormAnswers; errors: Record<string, string>;
} {
  const source = isRecord(input) ? input : {};
  const ui = { ...formUI, ...form.ui };
  const message = (key: keyof FormUI, count?: number) => ui[key].replaceAll('{{count}}', String(count ?? ''));
  const answers: FormAnswers = {};
  const errors: Record<string, string> = {};
  const normalized: FormAnswers = {};
  for (const field of form.fields) {
    const raw = source[field.key];
    normalized[field.key] = field.type === 'checkbox' ? raw === true : typeof raw === 'string' ? raw.trim() : '';
  }
  for (const field of form.fields) {
    if (onlyStep && field.step !== onlyStep) continue;
    if (!isFieldVisible(field, normalized)) continue;
    const raw = source[field.key];
    const value = normalized[field.key];
    if (raw !== undefined && raw !== null && typeof raw !== 'string' && typeof raw !== 'boolean') {
      errors[field.key] = `${field.label} : ${message('invalidFormat')}`;
      continue;
    }
    answers[field.key] = value;
    if (field.required && (value === '' || value === false)) {
      errors[field.key] = `${field.label} : ${form.texts.requiredError}`;
    } else if (typeof value === 'string' && value) {
      if (field.type === 'file') { if (!/^bf_[a-f0-9]{64}$/.test(value)) errors[field.key] = `${field.label} : ${message('invalidFile')}`; continue; }
      if (value.length < (field.minLength ?? 0)) errors[field.key] = `${field.label} : ${message('minimum', field.minLength ?? 0)}`;
      if (value.length > (field.maxLength ?? 5000)) errors[field.key] = `${field.label} : ${message('maximum', field.maxLength ?? 5000)}`;
      if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.key] = `${field.label} : ${message('invalidEmail')}`;
      if (field.type === 'date' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))) errors[field.key] = `${field.label} : ${message('invalidDate')}`;
      if (field.type === 'number' && !/^-?\d+(\.\d+)?$/.test(value)) errors[field.key] = `${field.label} : ${message('invalidNumber')}`;
      if ((field.type === 'select' || field.type === 'radio') && !field.options?.some((option) => option.value === value)) errors[field.key] = `${field.label} : ${message('invalidChoice')}`;
    }
  }
  return { answers, errors };
}

/** Reject broken schemas when publishing, including dependent or hidden mandatory identity fields. */
export function validateFormDefinition(form: Pick<PublicForm, 'steps' | 'fields'>): string | null {
  if (!form.steps.length || form.steps.length > 12 || !form.fields.length || form.fields.length > 80) return 'Prévoyez 1 à 12 étapes et 1 à 80 champs.';
  const steps = new Set(form.steps.map((step) => step.key));
  const keys = new Set(form.fields.map((field) => field.key));
  if (steps.size !== form.steps.length || keys.size !== form.fields.length) return 'Chaque étape et chaque champ doivent avoir une clé unique.';
  const allowed = new Set<FormFieldType>(['text', 'email', 'tel', 'textarea', 'select', 'radio', 'checkbox', 'date', 'number', 'file']);
  if (form.fields.filter(field => field.type === 'file').length > 3) return 'Trois questions de pièce jointe maximum par formulaire.';
  for (const [index, field] of form.fields.entries()) {
    if (!/^[a-z][a-zA-Z0-9_-]{0,63}$/.test(field.key) || ['__proto__', 'constructor', 'prototype'].includes(field.key)) return 'Une clé de champ est invalide.';
    if (!steps.has(field.step) || !allowed.has(field.type)) return `${field.label} : étape ou type inconnu.`;
    if ((field.minLength ?? 0) > (field.maxLength ?? 5000)) return `${field.label} : minimum supérieur au maximum.`;
    if (['radio', 'select'].includes(field.type)) {
      if (!field.options?.length || new Set(field.options.map((option) => option.value)).size !== field.options.length) return `${field.label} : les choix sont obligatoires et uniques.`;
    }
    if (field.conditionField) {
      const previous = form.fields.slice(0, index).find((candidate) => candidate.key === field.conditionField);
      if (!previous || previous.type === 'file' || previous.conditionField || form.steps.findIndex((s) => s.key === previous.step) > form.steps.findIndex((s) => s.key === field.step) || !field.conditionValues?.length) return `${field.label} : choisissez un champ antérieur, sans condition, et au moins une valeur.`;
    }
  }
  return null;
}

/** Imported verbatim where possible from the original three-step form. No example submissions. */
export const initialBriefForm: PublicForm = {
  slug: 'brief-projet', title: 'Brief projet', revision: 'initial',
  steps: [
    { key: 'univers', label: 'Univers', title: 'Quel est votre univers ?', description: 'Pour adapter les questions à votre besoin.' },
    { key: 'projet', label: 'Projet', title: 'Parlez-nous de votre projet.', description: "Plus c’est précis, mieux on revient vers vous." },
    { key: 'vous', label: 'Vous', title: 'Et vous ?', description: 'On vous recontacte sous 24 h ouvrées.' },
  ],
  fields: [
    { key: 'universe', label: 'Univers', type: 'radio', step: 'univers', required: true, options: UNIVERSES_LIST.map((universe) => ({ value: universe.slug, label: universe.eyebrow, description: universe.pitch })) },
    { key: 'organization', label: 'Entreprise / institution / organisation', type: 'text', step: 'projet', maxLength: 200, conditionField: 'universe', conditionValues: [{ value: 'entreprises' }, { value: 'institutions' }] },
    { key: 'eventDate', label: 'Date / période prévue', type: 'text', step: 'projet', maxLength: 200, conditionField: 'universe', conditionValues: [{ value: 'entreprises' }, { value: 'particuliers' }] },
    { key: 'audienceSize', label: 'Audience attendue', type: 'text', step: 'projet', maxLength: 200, conditionField: 'universe', conditionValues: [{ value: 'entreprises' }] },
    { key: 'residentName', label: 'Résident concerné (si atelier)', type: 'text', step: 'projet', maxLength: 200, help: 'Optionnel. Évitez les informations médicales dans ce formulaire.', conditionField: 'universe', conditionValues: [{ value: 'institutions' }] },
    { key: 'occasion', label: "Type d’événement", type: 'text', step: 'projet', maxLength: 200, conditionField: 'universe', conditionValues: [{ value: 'particuliers' }] },
    { key: 'message', label: 'Décrivez votre projet', type: 'textarea', step: 'projet', required: true, minLength: 10, maxLength: 5000, placeholder: "Le contexte, l’ambiance recherchée, les contraintes, l’audience…" },
    { key: 'name', label: 'Votre nom', type: 'text', step: 'vous', required: true, minLength: 2, maxLength: 200, placeholder: 'Prénom Nom' },
    { key: 'email', label: 'Email', type: 'email', step: 'vous', required: true, maxLength: 200, placeholder: 'vous@exemple.fr' },
    { key: 'phone', label: 'Téléphone', type: 'tel', step: 'vous', maxLength: 80 },
  ],
  texts: {
    next: 'Continuer', back: 'Retour', submit: 'Envoyer le brief', pending: 'Envoi…',
    successTitle: 'Brief reçu. Merci.', successDescription: 'On revient vers vous sous 24 h ouvrées avec une première lecture de votre projet et les questions qui restent à éclaircir.', signature: 'Studio MIS — Nîmes',
    errorTitle: 'Erreur d’envoi', networkError: 'Erreur réseau. Votre saisie est conservée ; réessayez dans quelques instants.',
    invalidError: 'Vérifiez les champs signalés.', rateLimitError: 'Trop de tentatives. Réessayez dans une minute.', unavailableError: 'Le formulaire est momentanément indisponible. Réessayez dans quelques instants.', requiredError: 'ce champ est obligatoire.',
    privacy: 'Vos informations servent uniquement au traitement de votre demande. Consultez notre politique de confidentialité.', honeypot: 'Site web (laisser vide)',
  },
};
