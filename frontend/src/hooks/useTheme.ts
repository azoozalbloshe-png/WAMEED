import { useTheme } from '../contexts/ThemeContext'

export function useThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return { theme, toggleTheme }
}

export function useThemeIcon() {
  const { theme, toggleTheme } = useTheme()
  const icon = theme === 'light' ? 'Moon' : 'Sun'
  return { icon, toggleTheme }
}
