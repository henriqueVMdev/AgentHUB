import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultThemeId, type Theme } from '../themes'

interface ThemeState {
  themeId: string
  customThemes: Theme[]
  setTheme: (id: string) => void
  addCustomTheme: (t: Theme) => void
  removeCustomTheme: (id: string) => void
}

/** Tema atual + temas customizados, persistidos no localStorage. As CSS vars são aplicadas no App. */
export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      themeId: defaultThemeId,
      customThemes: [],
      setTheme: (themeId) => set({ themeId }),
      addCustomTheme: (t) => set({ customThemes: [...get().customThemes, t] }),
      removeCustomTheme: (id) =>
        set({
          customThemes: get().customThemes.filter((t) => t.id !== id),
          themeId: get().themeId === id ? defaultThemeId : get().themeId,
        }),
    }),
    { name: 'agents-pool-theme' },
  ),
)
