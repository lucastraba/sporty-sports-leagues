import { useI18n } from 'vue-i18n'
import type { LoadError } from '@/stores/leagues'

const ERROR_KEYS: Record<LoadError['kind'], string> = {
  network: 'errors.network',
  timeout: 'errors.timeout',
  'rate-limit': 'errors.rateLimit',
  http: 'errors.http',
  'invalid-response': 'errors.invalidResponse',
  unknown: 'errors.unknown',
}

// Translations for values that come from data rather than from the templates.
export const useLabels = () => {
  const { t, te } = useI18n()

  // Known sports are translated; anything else the API sends is shown as it comes.
  const sportName = (sport: string) => {
    const key = `sports.${sport.replace(/\s+/g, '')}`
    return te(key) ? t(key) : sport
  }

  const errorMessage = (error: LoadError) => t(ERROR_KEYS[error.kind], { status: error.status })

  return { sportName, errorMessage }
}
