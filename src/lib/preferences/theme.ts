// Theme preference model shared by the root layout (server) and the
// PreferencesProvider (client). "system" means no `data-theme` attribute on
// <html>, so globals.css follows `prefers-color-scheme`.
export type ThemePref = "system" | "light" | "dark";
export const THEME_COOKIE = "of_theme";
export const THEMES: ThemePref[] = ["system", "light", "dark"];

export function parseTheme(v: string | undefined): ThemePref {
  return v === "light" || v === "dark" ? v : "system";
}
