export type UiMode = 'original' | 'design-lab'

export const UI_MODE_STORAGE_KEY = 'bonalyze-ui-mode'
export const UI_MODE_EVENT = 'bonalyze-ui-mode-change'
export const DESIGNLAB_CLASS = 'designlab-ui'
export const DEFAULT_UI_MODE: UiMode = 'design-lab'

export function isUiMode(value: string | null | undefined): value is UiMode {
  return value === 'original' || value === 'design-lab'
}

export function resolveUiMode(value: string | null | undefined): UiMode {
  return isUiMode(value) ? value : DEFAULT_UI_MODE
}
