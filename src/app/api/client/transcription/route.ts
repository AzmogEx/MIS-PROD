import { getCMS } from '@/cms/payload'
import { transcriptionHandlers } from '@/cms/transcription-http'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300
export const { GET, POST } = transcriptionHandlers(getCMS)
