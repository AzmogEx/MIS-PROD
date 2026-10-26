'use client'
import { useState } from 'react'
import { useField, useForm } from '@payloadcms/ui'
import type { JSONFieldClientProps } from 'payload'
import { formTranslationEntries, type FormTranslations } from '@/cms/form-translations'
import type { PublicForm } from '@/cms/form-schema'

export function FormTranslationField({ path, readOnly }: JSONFieldClientProps) {
  const { value, setValue, disabled } = useField<FormTranslations>({ path })
  const { getData } = useForm()
  const [locale, setLocale] = useState<'fr' | 'en'>('en')
  const [entries, setEntries] = useState<Record<string, string>>({})
  const translation = value?.[locale]
  const blocked = Boolean(readOnly || disabled)
  const load = () => setEntries(formTranslationEntries(getData() as Partial<PublicForm>))
  const edit = (key: string, text: string) => setValue({ ...value, [locale]: { ...translation, state: 'draft', values: { ...translation?.values, [key]: text } } })
  return <div className="field-type" style={{ marginBottom: 32 }}>
    <h3>Traductions et microtextes du formulaire</h3>
    <p>L’anglais est diffusé après relecture complète. Toute modification du français rend la relecture obsolète : le formulaire public revient au français jusqu’à validation. Les clés, conditions et réponses ne changent pas.</p>
    <label>Langue <select value={locale} onChange={event => setLocale(event.target.value as 'fr' | 'en')}><option value="en">Anglais</option><option value="fr">Microtextes français</option></select></label>
    <button type="button" onClick={load} style={{ minHeight: 44, margin: 12 }}>Charger / actualiser les textes à traduire</button>
    <p role="status">État : {translation?.state === 'reviewed' ? 'relu' : translation?.state === 'outdated' ? 'obsolète — relire la source' : 'brouillon'}</p>
    {Object.entries(entries).filter(([key]) => locale === 'en' || key.startsWith('ui.')).map(([key, source]) => <label key={`${locale}:${key}`} style={{ display: 'block', marginBottom: 16 }}><strong>{key}</strong><p style={{ margin: '4px 0', opacity: .75 }}>{source || 'Champ facultatif vide'}</p><textarea disabled={blocked} value={translation?.values?.[key] || ''} onChange={event => edit(key, event.target.value)} rows={2} maxLength={10000} style={{ width: '100%', minHeight: 60 }} /></label>)}
    {locale === 'en' && <label><input type="checkbox" disabled={blocked} checked={translation?.state === 'reviewed'} onChange={event => setValue({ ...value, en: { ...translation, values: translation?.values || {}, state: event.target.checked ? 'reviewed' : 'draft' } })} /> J’ai relu l’ensemble des traductions anglaises par rapport au français actuel. Enregistrez et publiez le formulaire pour les diffuser.</label>}
  </div>
}
