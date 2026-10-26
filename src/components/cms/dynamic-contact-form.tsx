'use client';

import { useRef, useState, type FormEvent, type MouseEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { isFieldVisible, validateFormAnswers, type FormAnswers, type FormField, type PublicForm } from '@/cms/form-schema';
import { useAnalytics } from './analytics';
import { useSiteContent, useLocalizedHref } from './content-context';
import { formUI, type FormUI } from '@/cms/form-translations';

export function DynamicContactForm({ form }: { form: PublicForm }) {
  const { ui } = useSiteContent();
  const localize = useLocalizedHref();
  const messages = { ...formUI, ...form.ui };
  const analytics = useAnalytics();
  const analyticsKey = form.id ? `form-${form.id}` : undefined;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [done, setDone] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const key = useRef<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = form.steps[step];
  const set = (field: string, value: string | boolean) => { analytics.track('form_start', { key: analyticsKey, once: `form-${form.id}-start` }); setAnswers((old) => ({ ...old, [field]: value })); setErrors((old) => ({ ...old, [field]: '' })); };
  const move = (to: number) => {
    setStep(to);
    setErrors({});
    setError('');
    requestAnimationFrame(() => heading.current?.focus());
  };
  const next = (event?: MouseEvent) => {
    event?.preventDefault();
    if (uploads) { setError(messages.uploadWait); return; }
    const checked = validateFormAnswers(form, answers, current.key);
    setErrors(checked.errors);
    if (!Object.keys(checked.errors).length) { analytics.track('form_step', { key: analyticsKey, step: step + 1, once: `form-${form.id}-step-${step + 1}` }); move(step + 1); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (pending || uploads) return;
    if (step < form.steps.length - 1) { next(); return; }
    const checked = validateFormAnswers(form, answers);
    if (Object.keys(checked.errors).length) {
      const first = form.fields.find((field) => checked.errors[field.key]);
      if (first) setStep(form.steps.findIndex((s) => s.key === first.step));
      setErrors(checked.errors); setError(form.texts.invalidError); return;
    }
    setPending(true); setError('');
    analytics.track('form_step', { key: analyticsKey, step: step + 1, once: `form-${form.id}-step-${step + 1}` });
    if (!key.current) key.current = crypto.randomUUID();
    try {
      const response = await fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-idempotency-key': key.current },
        body: JSON.stringify({ formSlug: form.slug, locale: form.requestedLocale || form.locale || 'fr', revision: form.revision, answers, website: honeypot }),
      });
      const result = await response.json() as { ok?: boolean; error?: string; fields?: Record<string, string> };
      if (!response.ok || !result.ok) {
        if (response.status === 409) { key.current = null; setAnswers(old => Object.fromEntries(Object.entries(old).filter(([name]) => !form.fields.some(field => field.key === name && field.type === 'file')))); }
        setError(response.status >= 500 ? form.texts.unavailableError : response.status === 429 ? form.texts.rateLimitError : response.status === 413 ? messages.requestTooLarge : response.status === 403 ? messages.originRefused : response.status === 409 ? messages.submissionConflict : response.status === 422 ? form.texts.invalidError : result.error || form.texts.unavailableError);
        if (response.status >= 500) analytics.track('technical_error', { key: analyticsKey, once: `form-${form.id}-server-error` });
        if (result.fields) {
          setErrors(result.fields);
          const first = form.fields.find((field) => result.fields?.[field.key]);
          if (first) setStep(form.steps.findIndex((s) => s.key === first.step));
        }
      } else { setDone(true); }
    } catch { setError(form.texts.networkError); analytics.track('technical_error', { key: analyticsKey, once: `form-${form.id}-network-error` }); }
    finally { setPending(false); }
  };
  const upload = async (field: string, file: File, uploadKey: string) => {
    if (!key.current) key.current = crypto.randomUUID();
    setUploads(count => count + 1);
    analytics.track('form_start', { key: analyticsKey, once: `form-${form.id}-start` });
    try {
      const response = await fetch(`/api/brief-files?form=${encodeURIComponent(form.slug)}&field=${encodeURIComponent(field)}`, { method: 'POST', headers: { 'Content-Type': file.type, 'x-idempotency-key': key.current, 'x-upload-key': uploadKey, 'x-file-name': encodeURIComponent(file.name) }, body: file });
      const result = await response.json() as { token?: string; filename?: string; error?: string };
      if (!response.ok || !result.token) throw new Error(response.status === 413 ? messages.uploadTooLarge : response.status === 415 ? messages.uploadInvalidFormat : response.status === 429 ? messages.uploadRateLimit : response.status === 403 ? messages.originRefused : messages.uploadFailed);
      set(field, result.token);
      return { filename: result.filename || file.name };
    } finally { setUploads(count => count - 1); }
  };

  if (done) return <div className="flex flex-col items-start gap-8 py-20 md:py-28" role="status">
    <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold bg-gold/10 text-gold"><Check aria-hidden className="h-6 w-6" /></span>
    <h2 className="max-w-2xl font-serif text-[clamp(2rem,5vw,3.5rem)] leading-tight">{form.texts.successTitle}</h2>
    <p className="max-w-md text-base text-foreground-muted">{form.texts.successDescription}</p>
    <p className="font-mono text-xs tracking-widest text-foreground-subtle">{form.texts.signature}</p>
  </div>;

  return <form onSubmit={submit} noValidate className="relative">
    <div aria-hidden className="absolute -left-[10000px] h-px w-px overflow-hidden"><label>{form.texts.honeypot}<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} /></label></div>
    <ol className="flex flex-wrap gap-3" aria-label={form.title}>
      {form.steps.map((s, index) => <li key={s.key} aria-current={index === step ? 'step' : undefined} className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs ${index === step ? 'border-gold bg-gold text-background' : index < step ? 'border-gold text-gold' : 'border-border text-foreground-subtle'}`}>{index < step ? <Check className="h-4 w-4" aria-hidden /> : index + 1}</span>
        <span className={`max-w-48 text-xs ${index === step ? 'text-foreground' : 'text-foreground-muted'}`}>{s.label || s.title}</span>
        {index < form.steps.length - 1 && <span aria-hidden className="mx-2 h-px w-6 bg-border" />}
      </li>)}
    </ol>
    <div className="mt-12 min-h-[420px] md:mt-16">
      <h2 ref={heading} tabIndex={-1} className="font-serif text-[clamp(1.875rem,4vw,3rem)] leading-tight tracking-tight outline-none">{current.title}</h2>
      {current.description && <p className="mt-4 max-w-xl text-base text-foreground-muted">{current.description}</p>}
      <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
        {form.fields.filter((field) => field.step === current.key && isFieldVisible(field, answers)).map((field) => <FormControl messages={messages} key={field.key} field={field} value={answers[field.key]} error={errors[field.key]} onChange={(value) => set(field.key, value)} onFile={(file, uploadKey) => upload(field.key, file, uploadKey)} />)}
      </div>
    </div>
    {error && <div role="alert" className="mt-8 rounded-lg border border-red-400/50 bg-red-500/10 p-5"><p className="font-medium text-red-300">{form.texts.errorTitle}</p><p className="mt-2 text-sm">{error}</p></div>}
    <div className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-8">
      <Button type="button" variant="ghost" disabled={step === 0 || pending || uploads > 0} onClick={() => move(step - 1)}><ArrowLeft className="h-4 w-4" aria-hidden />{form.texts.back}</Button>
      {step < form.steps.length - 1 ? <Button key="next" type="button" variant="primary" disabled={uploads > 0} onClick={next}>{form.texts.next}<ArrowRight className="h-4 w-4" aria-hidden /></Button> : <Button key="submit" type="submit" variant="primary" disabled={pending || uploads > 0}>{pending ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />{form.texts.pending}</> : <>{form.texts.submit}<ArrowRight className="h-4 w-4" aria-hidden /></>}</Button>}
    </div>
    {form.texts.privacy && <p className="mt-8 max-w-2xl text-sm leading-relaxed text-foreground-muted">{form.texts.privacy} <Link href={localize('/confidentialite')} className="underline underline-offset-4">{ui.privacyLabel}</Link></p>}
  </form>;
}

function BriefFileControl({ id, value, onChange, onFile, describedBy, messages }: { messages: FormUI; id: string; value: string; onChange: (value: string) => void; onFile: (file: File, uploadKey: string) => Promise<{ filename: string }>; describedBy?: string }) {
  const [file, setFile] = useState<File | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [failed, setFailed] = useState(false);
  const uploadKey = useRef('');
  async function send(selected: File, fresh: boolean) {
    if (selected.size > 10 * 1024 * 1024) { setMessage(messages.uploadTooLarge); setFailed(true); return; }
    if (fresh) uploadKey.current = crypto.randomUUID();
    setBusy(true); setFailed(false); setMessage(messages.uploadPending); onChange('');
    try { const result = await onFile(selected, uploadKey.current); setMessage(messages.uploadDone.replaceAll('{{filename}}', result.filename)); }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : messages.uploadInterrupted); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3">
    <input id={id} type="file" disabled={busy} accept="application/pdf,image/jpeg,image/png,image/webp" aria-describedby={[describedBy, `${id}-upload`].filter(Boolean).join(' ')} onChange={event => { const selected = event.target.files?.[0]; event.currentTarget.value = ''; if (selected) { setFile(selected); void send(selected, true); } }} className="block min-h-12 w-full rounded border border-border p-3 text-sm file:mr-4 file:rounded file:border-0 file:bg-foreground file:px-3 file:py-2 file:text-background focus-visible:outline-2 focus-visible:outline-gold" />
    <p id={`${id}-upload`} role={failed ? 'alert' : 'status'} className="text-sm text-foreground-muted">{message || (value ? messages.uploadExisting : messages.uploadHelp)}</p>
    {failed && file && <button type="button" disabled={busy} onClick={() => void send(file, false)} className="min-h-11 rounded border border-border px-4 py-2 text-sm">{messages.uploadRetry}</button>}
    {value && !busy && <button type="button" onClick={() => { onChange(''); setFile(null); setMessage(messages.uploadRemoved); }} className="min-h-11 rounded border border-border px-4 py-2 text-sm">{messages.uploadRemove}</button>}
  </div>;
}

function FormControl({ field, value, error, onChange, onFile, messages }: { messages: FormUI; field: FormField; value: string | boolean | undefined; error?: string; onChange: (value: string | boolean) => void; onFile: (file: File, uploadKey: string) => Promise<{ filename: string }> }) {
  const id = `brief-${field.key}`;
  const describedBy = [field.help ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const common = { id, required: Boolean(field.required), 'aria-invalid': Boolean(error), 'aria-describedby': describedBy };
  const label = <>{field.label}{field.required && <span className="ml-1 text-gold" aria-hidden>*</span>}</>;
  return <div className={`flex flex-col gap-3 ${['textarea', 'radio'].includes(field.type) ? 'md:col-span-2' : ''}`}>
    {field.type === 'radio' ? <fieldset aria-describedby={describedBy} aria-invalid={Boolean(error)}>
      <legend className="mb-4 text-sm font-medium">{label}</legend>
      <div className="grid gap-4 md:grid-cols-3">{field.options?.map((option) => <label key={option.value} className={`relative flex min-h-28 cursor-pointer flex-col gap-3 rounded-xl border p-5 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-gold ${value === option.value ? 'border-gold bg-gold/5' : 'border-border hover:border-gold/60'}`}>
        <input type="radio" name={id} value={option.value} checked={value === option.value} required={Boolean(field.required)} onChange={() => onChange(option.value)} className="h-4 w-4 accent-gold" />
        <span className="font-serif text-2xl">{option.label}</span>{option.description && <span className="text-sm leading-relaxed text-foreground-muted">{option.description}</span>}
      </label>)}</div>
    </fieldset> : field.type === 'checkbox' ? <label htmlFor={id} className="flex min-h-11 items-center gap-3"><input {...common} type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-gold" /><span>{label}</span></label> : <>
      <Label htmlFor={id}>{label}</Label>
      {field.type === 'file' ? <BriefFileControl messages={messages} id={id} value={String(value || '')} onChange={onChange} onFile={onFile} describedBy={describedBy} /> : field.type === 'textarea' ? <Textarea {...common} minLength={field.minLength ?? undefined} maxLength={field.maxLength ?? 5000} value={String(value ?? '')} placeholder={field.placeholder || undefined} onChange={(event) => onChange(event.target.value)} /> : field.type === 'select' ? <select {...common} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} className="min-h-12 w-full rounded border border-border bg-background px-3 text-base text-foreground focus:outline-2 focus:outline-gold"><option value="">—</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <Input {...common} type={field.type} minLength={field.minLength ?? undefined} maxLength={field.maxLength ?? 5000} value={String(value ?? '')} placeholder={field.placeholder || undefined} onChange={(event) => onChange(event.target.value)} />}
    </>}
    {field.help && <p id={`${id}-help`} className="text-sm text-foreground-muted">{field.help}</p>}
    {error && <p id={`${id}-error`} role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;
}
