import type { Lang } from '../../types'
import type { LangModel } from './model'
import enModel from './model-en.json'
import neModel from './model-ne.json'

const MODELS: Record<Lang, LangModel> = {
  en: enModel as LangModel,
  ne: neModel as LangModel,
}

export function getModel(lang: Lang): LangModel {
  return MODELS[lang]
}

/** The unlock-order alphabet for a language (descending frequency). */
export function alphabetFor(lang: Lang): string[] {
  return MODELS[lang].tokens
}
