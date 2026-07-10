import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { defaultThemeId } from '../themes'

interface ThemeState {
  themeId: string
  setTheme: (id: string) => void
}

/** Tema persistido no localStorage. A aplicação das CSS vars é feita no App (useEffect). */
export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      themeId: defaultThemeId,
      setTheme: (themeId) => set({ themeId }),
    }),
    { name: 'agents-pool-theme' },
  ),
)
