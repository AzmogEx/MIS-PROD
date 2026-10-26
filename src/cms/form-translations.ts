import { isRecord, type PublicForm } from './form-schema'

export const formUI = {
  invalidFormat: 'format invalide.', minimum: '{{count}} caractères minimum.', maximum: '{{count}} caractères maximum.', invalidEmail: 'adresse email invalide.', invalidDate: 'date invalide.', invalidNumber: 'nombre invalide.', invalidChoice: 'choix invalide.', invalidFile: 'téléversez une pièce jointe valide.',
  requestTooLarge: 'La demande dépasse la taille autorisée. Réduisez les textes et réessayez.', originRefused: 'La requête a été refusée. Rechargez cette page puis réessayez.', submissionConflict: 'Cette réception correspond déjà à une autre demande. Vérifiez votre saisie et sélectionnez à nouveau les pièces jointes.', uploadInvalidFormat: 'Format de fichier refusé. Utilisez un PDF ou une image JPEG, PNG ou WebP valide.', uploadRateLimit: 'Trop de téléversements. Attendez une minute puis réessayez.',
  uploadWait: 'Attendez la fin du téléversement des pièces jointes.', uploadFailed: 'Le fichier n’a pas été enregistré.', uploadTooLarge: 'Le fichier dépasse la limite de 10 Mo.', uploadPending: 'Téléversement privé en cours…', uploadDone: '{{filename}} · fichier enregistré. Envoyez le formulaire pour le joindre à votre demande.', uploadInterrupted: 'Téléversement interrompu. Réessayez.', uploadExisting: 'Une pièce jointe a été enregistrée pour cette demande.', uploadHelp: 'PDF, JPEG, PNG ou WebP · 10 Mo maximum · accès réservé à l’équipe chargée du projet.', uploadRetry: 'Réessayer le téléversement', uploadRemove: 'Retirer la pièce jointe', uploadRemoved: 'Pièce jointe retirée de cette demande.',
}
export type FormUI = typeof formUI
export type FormTranslation = { values?: Record<string, string>; state?: 'draft' | 'reviewed' | 'outdated'; sourceRevision?: string }
export type FormTranslations = { fr?: FormTranslation; en?: FormTranslation }

/** Stable technical keys stay unchanged: only presentation copy is translated. */
export function formTranslationEntries(form: Partial<PublicForm>): Record<string, string> {
  const entries: Record<string, string> = { title: form.title || '' }
  for (const [key, value] of Object.entries(form.texts || {})) entries[`texts.${key}`] = String(value || '')
  for (const step of form.steps || []) for (const key of ['label', 'title', 'description'] as const) entries[`step.${step.key}.${key}`] = step[key] || ''
  for (const field of form.fields || []) {
    for (const key of ['label', 'placeholder', 'help'] as const) entries[`field.${field.key}.${key}`] = field[key] || ''
    for (const option of field.options || []) for (const key of ['label', 'description'] as const) entries[`option.${field.key}.${option.value}.${key}`] = option[key] || ''
  }
  for (const [key, value] of Object.entries(formUI)) entries[`ui.${key}`] = value
  return entries
}

export function translationState(translations: FormTranslations | undefined, revision: string) {
  const en = translations?.en
  return en?.state === 'reviewed' && en.sourceRevision === revision ? 'reviewed' : en?.state === 'reviewed' || en?.state === 'outdated' ? 'outdated' : 'draft'
}

export function applyFormTranslation(form: PublicForm, translations: FormTranslations | undefined, locale: 'fr' | 'en', revision: string): PublicForm {
  const state = translationState(translations, revision)
  const english = locale === 'en' && state === 'reviewed'
  const values = english ? translations?.en?.values || {} : {}
  const text = (key: string, fallback: string | null | undefined) => typeof values[key] === 'string' && values[key].trim() ? values[key] : fallback || ''
  const ui = { ...formUI }
  for (const key of Object.keys(ui) as Array<keyof FormUI>) {
    const source = translations?.fr?.values?.[`ui.${key}`]
    ui[key] = text(`ui.${key}`, typeof source === 'string' && source.trim() ? source : formUI[key])
  }
  return { ...form, locale: english ? 'en' : 'fr', requestedLocale: locale, translationState: locale === 'en' ? state : 'source', ui,
    title: text('title', form.title),
    texts: Object.fromEntries(Object.entries(form.texts).map(([key, value]) => [key, text(`texts.${key}`, value)])) as PublicForm['texts'],
    steps: form.steps.map(step => ({ ...step, label: text(`step.${step.key}.label`, step.label), title: text(`step.${step.key}.title`, step.title), description: text(`step.${step.key}.description`, step.description) })),
    fields: form.fields.map(field => ({ ...field, label: text(`field.${field.key}.label`, field.label), placeholder: text(`field.${field.key}.placeholder`, field.placeholder), help: text(`field.${field.key}.help`, field.help), options: field.options?.map(option => ({ ...option, label: text(`option.${field.key}.${option.value}.label`, option.label), description: text(`option.${field.key}.${option.value}.description`, option.description) })) })),
  }
}

export function validateFormTranslations(value: unknown) {
  if (value == null) return true
  if (!isRecord(value) || JSON.stringify(value).length > 200_000) return 'Traductions invalides ou trop volumineuses.'
  for (const [locale, data] of Object.entries(value)) {
    if (!['fr', 'en'].includes(locale) || !isRecord(data) || !isRecord(data.values)) return 'Chaque langue nécessite un dictionnaire de textes.'
    if (data.state && !['draft', 'reviewed', 'outdated'].includes(String(data.state))) return 'État de traduction invalide.'
    if (Object.entries(data.values).some(([key, text]) => key.length > 200 || typeof text !== 'string' || text.length > 10000)) return 'Chaque traduction doit être un texte de 10 000 caractères maximum.'
  }
  return true
}
