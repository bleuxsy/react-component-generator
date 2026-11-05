import { useState, useEffect } from 'react';
import { PromptInput } from './components/PromptInput';
import { ComponentCard } from './components/ComponentCard';
import { useComponentGenerator } from './hooks/useComponentGenerator';
import type { Provider } from './types';
import './App.css';

const PROVIDER_CONFIG = {
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...' },
  google: { label: 'Google', placeholder: 'AIza...' },
} as const;

function App() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [provider, setProvider] = useState<Provider>('google');
  const [envKeys, setEnvKeys] = useState<Record<Provider, boolean>>({
    anthropic: false,
    google: false,
  });
  const { components, isLoading, error, generate, removeComponent, clearAll } =
    useComponentGenerator();

  useEffect(() => {
    fetch('/api/config')
      .then((res) => res.json())
      .then((data) => setEnvKeys(data.envKeys))
      .catch(() => {});
  }, []);

  const hasEnvKey = envKeys[provider];
  const isKeyReady = hasEnvKey || apiKey.trim().length > 0;

  const handleGenerate = (prompt: string) => {
    if (!apiKey.trim() && !hasEnvKey) {
      alert(`${PROVIDER_CONFIG[provider].label} API 키를 입력하거나 .env에 설정해주세요.`);
      return;
    }
    generate(prompt, apiKey || undefined, provider);
  };

  const handleProviderChange = (newProvider: Provider) => {
    setProvider(newProvider);
    setApiKey('');
  };

  const activeProvider = PROVIDER_CONFIG[provider].label;

  return (
    <div className="app">
      <header className="app-header">
        <div className="badge-plate" aria-hidden="true">
          <span className="badge-model">RC-1</span>
          <span className="badge-stripes" />
        </div>
        <div className="header-copy">
          <h1>컴포넌트 생성기</h1>
          <p>만들고 싶은 화면을 설명하면 React 컴포넌트로 바로 그려 드립니다.</p>
        </div>
        <ul className="status-leds" aria-label="현재 작업 상태">
          <li>
            <span className={`led ${isKeyReady ? 'led--on' : 'led--wait'}`} aria-hidden="true" />
            {activeProvider} {isKeyReady ? '연결됨' : '키 필요'}
          </li>
          <li>
            <span className={`led ${isLoading ? 'led--busy' : 'led--on'}`} aria-hidden="true" />
            {isLoading ? '생성 중' : '대기'}
          </li>
          <li>
            <span className="counter">{String(components.length).padStart(2, '0')}</span>
            생성됨
          </li>
        </ul>
      </header>

      <main className="workspace">
        <section className="composer-panel" aria-label="컴포넌트 생성">
          <PromptInput onGenerate={handleGenerate} isLoading={isLoading} />
        </section>

        <aside className="settings-panel" aria-label="실행 설정">
          <h2 className="plate-title">실행 설정</h2>
          <div className="field">
            <label htmlFor="provider">AI 제공자</label>
            <select
              id="provider"
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as Provider)}
            >
              {Object.entries(PROVIDER_CONFIG).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="api-key">API 키</label>
            <div className="api-key-field">
              <input
                id="api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  hasEnvKey ? '서버 키 사용 중' : PROVIDER_CONFIG[provider].placeholder
                }
                autoComplete="off"
              />
              <button
                className="key-btn"
                onClick={() => setShowKey(!showKey)}
                type="button"
              >
                {showKey ? '숨기기' : '보기'}
              </button>
            </div>
            <p className="field-hint">
              {hasEnvKey
                ? '.env 키가 연결되어 있습니다. 직접 입력하면 덮어씁니다.'
                : '키를 직접 입력하거나 서버 .env에 설정하세요.'}
            </p>
          </div>
        </aside>
      </main>

      {error && (
        <div className="alert-box" role="alert">
          <span className="alert-icon" aria-hidden="true">!</span>
          <div>
            <strong>생성하지 못했습니다</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <section className="results-section" aria-label="생성된 컴포넌트">
        {components.length > 0 && (
          <div className="results-header">
            <h2>생성된 컴포넌트</h2>
            <button className="key-btn key-btn--danger" onClick={clearAll}>
              전체 삭제
            </button>
          </div>
        )}

        {components.length === 0 && !isLoading && (
          <div className="empty-state">
            <div className="empty-window" aria-hidden="true">
              <div className="titlebar">
                <span className="titlebar-box" />
                <span className="titlebar-stripes" />
              </div>
              <div className="empty-canvas">
                <span className="ghost ghost--a" />
                <span className="ghost ghost--b" />
                <span className="ghost ghost--c" />
              </div>
            </div>
            <div className="empty-copy">
              <h2>아직 만든 컴포넌트가 없습니다</h2>
              <p>위 화면에 원하는 UI를 적거나 예시를 골라 생성해 보세요.</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="loading-card" role="status">
            <p>컴포넌트를 생성하고 있습니다</p>
            <div className="loading-bar" aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} style={{ animationDelay: `${i * 0.12}s` }} />
              ))}
            </div>
          </div>
        )}

        <div className="results-grid">
          {components.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onRemove={removeComponent}
              onRegenerate={handleGenerate}
              isLoading={isLoading}
            />
          ))}
        </div>
      </section>

      <footer className="app-footer">
        생성된 코드는 react-live로 즉시 렌더링됩니다.
      </footer>
    </div>
  );
}

export default App;
