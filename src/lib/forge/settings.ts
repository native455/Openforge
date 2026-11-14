export interface ProviderSettings { preset: string; baseUrl: string; apiKey: string; model: string }
export const PRESETS = [
  { id: "openrouter", label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "openai/gpt-4o-mini" },
  { id: "openai", label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { id: "groq", label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { id: "custom", label: "Custom (OpenAI-compatible)", baseUrl: "", model: "" },
];
const KEY = "openforge.provider.v1";
export const emptySettings: ProviderSettings = { preset: "openrouter", baseUrl: PRESETS[0].baseUrl, apiKey: "", model: PRESETS[0].model };

export function loadSettings(): ProviderSettings {
  if (typeof window === "undefined") return emptySettings;
  try { return { ...emptySettings, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return emptySettings; }
}
export function saveSettings(s: ProviderSettings) { localStorage.setItem(KEY, JSON.stringify(s)); }
export function clearSettings() { localStorage.removeItem(KEY); }
export const isConfigured = (s: ProviderSettings) => !!(s.apiKey && s.baseUrl && s.model);