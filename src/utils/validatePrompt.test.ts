import { describe, it, expect } from 'vitest';
import { validatePrompt } from './validatePrompt';

describe('validatePrompt', () => {
  it('500자 이하 프롬프트는 유효하다', () => {
    expect(validatePrompt('가'.repeat(500))).toEqual({ isValid: true, error: null });
  });

  it('500자를 넘으면 무효이고 현재 글자 수를 담은 에러를 반환한다', () => {
    expect(validatePrompt('가'.repeat(501))).toEqual({
      isValid: false,
      error: '프롬프트는 500자 이하로 입력해주세요. (현재 501자)',
    });
  });

  it('앞뒤 공백은 글자 수에 포함하지 않는다', () => {
    expect(validatePrompt(`  ${'가'.repeat(500)}\n\n`)).toEqual({ isValid: true, error: null });
  });

  it('이모지는 한 글자로 센다', () => {
    expect(validatePrompt('😀'.repeat(500))).toEqual({ isValid: true, error: null });
  });
});
