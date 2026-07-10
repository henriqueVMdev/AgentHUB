// Paletas de terminal famosas. Cada valor é um triplet "R G B"
// consumido via CSS var (rgb(var(--term-x) / <alpha>)), então opacidade e glows seguem o tema.

export const TOKENS = [
  'bg', 'panel', 'border', 'green', 'dim', 'cyan', 'amber', 'red', 'text', 'muted',
] as const
export type Token = (typeof TOKENS)[number]

export interface Theme {
  id: string
  label: string
  vars: Record<Token, string>
}

// "green" = cor de destaque primária do tema (nem sempre verde).
export const themes: Theme[] = [
  {
    id: 'matrix', label: 'Matrix',
    vars: { bg: '8 11 10', panel: '13 20 17', border: '27 42 34', green: '34 255 156', dim: '59 166 118', cyan: '34 211 238', amber: '251 191 36', red: '255 92 102', text: '199 249 224', muted: '92 125 108' },
  },
  {
    id: 'dracula', label: 'Dracula',
    vars: { bg: '40 42 54', panel: '33 34 44', border: '68 71 90', green: '189 147 249', dim: '98 114 164', cyan: '139 233 253', amber: '241 250 140', red: '255 85 85', text: '248 248 242', muted: '98 114 164' },
  },
  {
    id: 'tokyo-night', label: 'Tokyo Night',
    vars: { bg: '26 27 38', panel: '22 22 30', border: '41 46 66', green: '122 162 247', dim: '86 95 137', cyan: '125 207 255', amber: '224 175 104', red: '247 118 142', text: '192 202 245', muted: '86 95 137' },
  },
  {
    id: 'gruvbox', label: 'Gruvbox',
    vars: { bg: '40 40 40', panel: '29 32 33', border: '60 56 54', green: '184 187 38', dim: '146 131 116', cyan: '142 192 124', amber: '250 189 47', red: '251 73 52', text: '235 219 178', muted: '146 131 116' },
  },
  {
    id: 'nord', label: 'Nord',
    vars: { bg: '46 52 64', panel: '41 46 57', border: '59 66 82', green: '136 192 208', dim: '76 86 106', cyan: '143 188 187', amber: '235 203 139', red: '191 97 106', text: '236 239 244', muted: '97 110 136' },
  },
  {
    id: 'solarized', label: 'Solarized Dark',
    vars: { bg: '0 43 54', panel: '7 54 66', border: '14 75 89', green: '133 153 0', dim: '88 110 117', cyan: '42 161 152', amber: '181 137 0', red: '220 50 47', text: '238 232 213', muted: '88 110 117' },
  },
  {
    id: 'monokai', label: 'Monokai',
    vars: { bg: '39 40 34', panel: '30 31 28', border: '62 61 50', green: '166 226 46', dim: '117 113 94', cyan: '102 217 239', amber: '230 219 116', red: '249 38 114', text: '248 248 242', muted: '117 113 94' },
  },
  {
    id: 'catppuccin', label: 'Catppuccin',
    vars: { bg: '30 30 46', panel: '24 24 37', border: '49 50 68', green: '166 227 161', dim: '108 112 134', cyan: '148 226 213', amber: '249 226 175', red: '243 139 168', text: '205 214 244', muted: '108 112 134' },
  },
  {
    id: 'synthwave', label: 'Synthwave',
    vars: { bg: '13 2 33', panel: '25 11 46', border: '45 27 78', green: '255 42 109', dim: '122 92 255', cyan: '5 217 232', amber: '249 248 113', red: '255 56 96', text: '209 196 233', muted: '106 90 153' },
  },
]

export const defaultThemeId = 'matrix'

export function applyTheme(id: string) {
  if (typeof document === 'undefined') return
  const theme = themes.find((t) => t.id === id) ?? themes[0]
  const root = document.documentElement
  for (const token of TOKENS) root.style.setProperty(`--term-${token}`, theme.vars[token])
}
