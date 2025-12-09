import { AspectRatio, Resolution, VeoModel } from '../types'

export type UserSettings = {
  prompt: string
  aspectRatio: AspectRatio
  resolution: Resolution
  model: VeoModel
}

const SETTINGS_KEY = 'veo-studio.settings'

export const DEFAULT_SETTINGS: UserSettings = {
  prompt: '',
  aspectRatio: AspectRatio.Landscape,
  resolution: Resolution.HD,
  model: VeoModel.Fast
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidAspectRatio(v: any): v is AspectRatio {
  return Object.values(AspectRatio).includes(v as AspectRatio)
}

function isValidResolution(v: any): v is Resolution {
  return Object.values(Resolution).includes(v as Resolution)
}

function isValidModel(v: any): v is VeoModel {
  return Object.values(VeoModel).includes(v as VeoModel)
}

export function validateSettings(raw: any): UserSettings {
  const prompt = typeof raw?.prompt === 'string' ? raw.prompt : DEFAULT_SETTINGS.prompt
  const aspectRatio = isValidAspectRatio(raw?.aspectRatio) ? raw.aspectRatio : DEFAULT_SETTINGS.aspectRatio
  const resolution = isValidResolution(raw?.resolution) ? raw.resolution : DEFAULT_SETTINGS.resolution
  const model = isValidModel(raw?.model) ? raw.model : DEFAULT_SETTINGS.model
  return { prompt, aspectRatio, resolution, model }
}

export function loadSettings(): UserSettings | null {
  if (!isBrowser()) return null
  try {
    const data = window.localStorage.getItem(SETTINGS_KEY)
    if (!data) return null
    const parsed = JSON.parse(data)
    return validateSettings(parsed)
  } catch {
    return null
  }
}

export function saveSettings(s: UserSettings): void {
  if (!isBrowser()) return
  try {
    const normalized = validateSettings(s)
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(normalized))
  } catch {
  }
}

export function clearSettings(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(SETTINGS_KEY)
  } catch {
  }
}
