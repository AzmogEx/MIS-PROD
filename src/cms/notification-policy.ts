export const notificationReconciliationMessage = 'Reprise bloquée : la fenêtre de déduplication est dépassée. Vérifiez dans Resend si cet email a été accepté avant toute nouvelle notification ; le bouton Reprendre ne peut pas autoriser un nouvel envoi.'

export function notificationRetryExpired(mail: { attempts?: unknown; firstAttemptAt?: unknown; createdAt?: unknown; state?: unknown }, now = new Date()): boolean {
  const hasFirstAttempt = typeof mail.firstAttemptAt === 'string' && Boolean(mail.firstAttemptAt)
  const attempted = hasFirstAttempt || Number(mail.attempts || 0) > 0 || mail.state === 'processing'
  if (!attempted) return false
  const started = Date.parse(String(hasFirstAttempt ? mail.firstAttemptAt : mail.createdAt || ''))
  return !Number.isFinite(started) || now.getTime() - started >= 23 * 60 * 60 * 1000
}
