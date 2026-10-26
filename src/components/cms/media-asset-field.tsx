'use client'

import { useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { MediaAssetPicker } from './media-asset-picker'

export const MediaAssetField: TextFieldClientComponent = ({ path, field, readOnly }) => {
  const { value, setValue, disabled, showError, errorMessage } = useField<string>({ path })
  return <><MediaAssetPicker value={value || ''} onChange={setValue} kind={field.name} label={typeof field.label === 'string' ? field.label : field.name} disabled={Boolean(readOnly || disabled)} />{showError && <p role="alert">{typeof errorMessage === 'string' ? errorMessage : 'Adresse de média invalide.'}</p>}</>
}
