import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  STORAGE_KEYS,
  MAX_HISTORY,
  loadProvider,
  saveProvider,
  addPromptToHistory,
  loadHistory,
  saveHistory,
  loadComponents,
  saveComponents,
} from './storage';
import type { GeneratedComponent } from '../types';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('provider', () => {
  it('저장된 값이 없으면 google을 반환한다', () => {
    expect(loadProvider()).toBe('google');
  });

  it('저장한 provider를 불러온다', () => {
    saveProvider('anthropic');
    expect(loadProvider()).toBe('anthropic');
  });

  it('알 수 없는 값이 저장되어 있으면 google을 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.provider, JSON.stringify('openai'));
    expect(loadProvider()).toBe('google');
  });

  it('localStorage 읽기가 실패하면 google을 반환한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(loadProvider()).toBe('google');
  });
});

describe('addPromptToHistory', () => {
  it('새 프롬프트를 맨 앞에 추가한다', () => {
    expect(addPromptToHistory(['a'], 'b')).toEqual(['b', 'a']);
  });

  it('이미 있는 프롬프트는 중복 없이 맨 앞으로 옮긴다', () => {
    expect(addPromptToHistory(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c']);
  });

  it(`최대 ${MAX_HISTORY}개까지만 유지한다`, () => {
    const full = Array.from({ length: MAX_HISTORY }, (_, i) => `p${i}`);
    const next = addPromptToHistory(full, 'new');
    expect(next).toHaveLength(MAX_HISTORY);
    expect(next[0]).toBe('new');
    expect(next).not.toContain(`p${MAX_HISTORY - 1}`);
  });
});

describe('history', () => {
  it('저장된 값이 없으면 빈 배열을 반환한다', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('저장한 히스토리를 불러온다', () => {
    saveHistory(['a', 'b']);
    expect(loadHistory()).toEqual(['a', 'b']);
  });

  it('JSON이 깨져 있으면 빈 배열을 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.history, '{not json');
    expect(loadHistory()).toEqual([]);
  });

  it('문자열이 아닌 항목은 제외한다', () => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(['a', 1, null, 'b']));
    expect(loadHistory()).toEqual(['a', 'b']);
  });
});

describe('components', () => {
  const sample: GeneratedComponent = {
    id: '1-abc',
    prompt: '프로필 카드',
    code: 'render(<Card />)',
    createdAt: new Date('2026-11-05T04:00:00.000Z'),
  };

  it('저장된 값이 없으면 빈 배열을 반환한다', () => {
    expect(loadComponents()).toEqual([]);
  });

  it('저장한 컴포넌트를 불러오면 createdAt이 Date로 복원된다', () => {
    saveComponents([sample]);
    const [loaded] = loadComponents();
    expect(loaded.createdAt).toBeInstanceOf(Date);
    expect(loaded).toEqual(sample);
  });

  it('JSON이 깨져 있으면 빈 배열을 반환한다', () => {
    localStorage.setItem(STORAGE_KEYS.components, 'oops');
    expect(loadComponents()).toEqual([]);
  });

  it('필드가 빠졌거나 날짜가 잘못된 항목은 제외한다', () => {
    localStorage.setItem(
      STORAGE_KEYS.components,
      JSON.stringify([
        { ...sample, createdAt: sample.createdAt.toISOString() },
        { id: '2', prompt: 'x', createdAt: sample.createdAt.toISOString() },
        { ...sample, id: '3', createdAt: 'not-a-date' },
      ]),
    );
    expect(loadComponents().map((c) => c.id)).toEqual(['1-abc']);
  });

  it('저장 용량 초과로 쓰기가 실패해도 예외를 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => saveComponents([sample])).not.toThrow();
  });
});
