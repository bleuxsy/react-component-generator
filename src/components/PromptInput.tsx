import { useState } from 'react';
import { countPromptLength, MAX_PROMPT_LENGTH, validatePrompt } from '../utils/validatePrompt';

interface PromptInputProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

const EXAMPLES = [
  'SaaS 관리자용 KPI 카드 3개. 매출, 활성 사용자, 전환율을 비교 가능한 형태로 표시',
  '설정 페이지의 알림 토글 패널. 이메일, 슬랙, 주간 리포트 옵션 포함',
  '검색 필터 바. 상태, 담당자, 날짜 범위를 선택하고 결과 수를 보여주는 UI',
  '온보딩 체크리스트. 5단계 진행률과 완료/대기 상태를 보여주는 카드',
  '요금제 비교 카드 3개. 추천 플랜을 강조하고 CTA 버튼 포함',
  '테이블 행 상세보기 패널. 선택한 고객의 기본 정보와 최근 활동 표시',
];

export function PromptInput({ onGenerate, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');
  const validation = validatePrompt(prompt);
  // Ctrl+Enter는 버튼 disabled를 거치지 않으므로 핸들러와 버튼이 같은 조건을 공유한다.
  const canSubmit = prompt.trim().length > 0 && validation.isValid && !isLoading;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onGenerate(prompt.trim());
    }
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="prompt-section">
      <form onSubmit={handleSubmit} className="prompt-form">
        <div className="crt">
          <div className="crt-screen">
            <label htmlFor="prompt" className="crt-line">
              무엇을 만들까요?
            </label>
            <div className="crt-input">
              <span className="crt-caret" aria-hidden="true">&gt;</span>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="고객 목록 위에 들어갈 검색 필터 바. 상태, 담당자, 날짜 범위 필터 포함"
                className="prompt-textarea"
                rows={4}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSubmit(e);
                  }
                }}
              />
            </div>
          </div>
        </div>
        {validation.error && (
          <p className="prompt-error" role="alert">
            {validation.error}
          </p>
        )}
        <div className="prompt-controls">
          <span className="shortcut-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> 로 바로 생성
          </span>
          <span className={`char-count ${validation.isValid ? '' : 'char-count--over'}`}>
            {`${countPromptLength(prompt)} / ${MAX_PROMPT_LENGTH}`}
          </span>
          <button
            type="submit"
            className="btn-generate"
            disabled={!canSubmit}
          >
            {isLoading ? '생성 중...' : '컴포넌트 생성'}
          </button>
        </div>
      </form>
      <div className="prompt-examples">
        <h3 className="examples-label">예시로 시작하기</h3>
        <div className="example-list">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              className="example-chip"
              onClick={() => handleExampleClick(example)}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
