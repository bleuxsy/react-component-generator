import type { GeneratedComponent, Provider } from '../types';

// API 키는 의도적으로 저장하지 않는다. 생성된 코드가 같은 origin에서 실행되므로
// localStorage에 둔 값은 생성 코드가 읽어 외부로 보낼 수 있다.
export const STORAGE_KEYS = {
  provider: 'rcg:provider',
  history: 'rcg:promptHistory',
  components: 'rcg:components',
} as const;

export const MAX_HISTORY = 20;

const PROVIDERS: readonly Provider[] = ['anthropic', 'google'];
const DEFAULT_PROVIDER: Provider = 'google';

// 사생활 보호 모드·저장소 차단 등으로 접근 자체가 실패할 수 있으므로 모든 접근을 감싼다.
function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

// 용량 초과 등으로 저장에 실패해도 화면 동작에는 영향을 주지 않는다.
function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 무시
  }
}

export function loadProvider(): Provider {
  const value = readJson(STORAGE_KEYS.provider);
  return PROVIDERS.includes(value as Provider) ? (value as Provider) : DEFAULT_PROVIDER;
}

export function saveProvider(provider: Provider): void {
  writeJson(STORAGE_KEYS.provider, provider);
}

export function addPromptToHistory(history: string[], prompt: string): string[] {
  return [prompt, ...history.filter((p) => p !== prompt)].slice(0, MAX_HISTORY);
}

export function loadHistory(): string[] {
  const value = readJson(STORAGE_KEYS.history);
  return Array.isArray(value) ? value.filter((p): p is string => typeof p === 'string') : [];
}

export function saveHistory(history: string[]): void {
  writeJson(STORAGE_KEYS.history, history);
}

function toComponent(value: unknown): GeneratedComponent | null {
  if (typeof value !== 'object' || value === null) return null;
  const { id, prompt, code, createdAt } = value as Record<string, unknown>;
  if (typeof id !== 'string' || typeof prompt !== 'string' || typeof code !== 'string') return null;
  if (typeof createdAt !== 'string') return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  return { id, prompt, code, createdAt: date };
}

export function loadComponents(): GeneratedComponent[] {
  const value = readJson(STORAGE_KEYS.components);
  if (!Array.isArray(value)) return [];
  return value.map(toComponent).filter((c): c is GeneratedComponent => c !== null);
}

export function saveComponents(components: GeneratedComponent[]): void {
  writeJson(STORAGE_KEYS.components, components);
}
