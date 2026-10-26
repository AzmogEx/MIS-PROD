import type { CollectionBeforeChangeHook } from 'payload'
import { contentRevision } from './translation'
import { formTranslationEntries, type FormTranslations } from './form-translations'
import type { PublicForm } from './form-schema'

export function formSourceRevision(form: Record<string, unknown>) {
  return contentRevision({ ...form, frenchMicrocopy: (form.translations as FormTranslations | undefined)?.fr?.values || {} }, ['title', 'steps', 'fields', 'texts', 'frenchMicrocopy'])
}
export const formTranslationGuard: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const merged = { ...originalDoc, ...data }
  const translation = (merged.translations as FormTranslations | undefined)?.en
  const old = (originalDoc?.translations as FormTranslations | undefined)?.en
  if (translation?.state === 'reviewed' && JSON.stringify(translation) !== JSON.stringify(old)) {
    const missing = Object.entries(formTranslationEntries(merged as Partial<PublicForm>)).filter(([, source]) => source.trim()).find(([key]) => !translation.values?.[key]?.trim())
    if (missing) throw new Error(`Traduction anglaise incomplète : ${missing[0]}. Complétez les textes avant relecture.`)
    data.translations = { ...merged.translations, en: { ...translation, sourceRevision: formSourceRevision(merged) } }
  }
  return data
}
