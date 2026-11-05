export const MAX_PROMPT_LENGTH = 500;

export interface PromptValidation {
  isValid: boolean;
  error: string | null;
}

/** 제출될 값(trim 후)의 글자 수. 이모지 등 서로게이트 쌍도 한 글자로 센다. */
export function countPromptLength(prompt: string): number {
  return Array.from(prompt.trim()).length;
}

export function validatePrompt(prompt: string): PromptValidation {
  const length = countPromptLength(prompt);
  if (length > MAX_PROMPT_LENGTH) {
    return {
      isValid: false,
      error: `프롬프트는 ${MAX_PROMPT_LENGTH}자 이하로 입력해주세요. (현재 ${length}자)`,
    };
  }
  return { isValid: true, error: null };
}
