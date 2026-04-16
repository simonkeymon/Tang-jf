import { useEffect, useState } from 'react';
import { Button, Card, Input, PageContainer, Select } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

type ConfigResponse = {
  base_url: string;
  api_key: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  is_custom: boolean;
};

export default function AIConfigPage() {
  const [isCustom, setIsCustom] = useState(true);
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [model, setModel] = useState('gpt-4o');
  const [status, setStatus] = useState('未配置');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const response = await api.get('/ai/config');
      const config: ConfigResponse = response.data.config;
      setBaseUrl(config.base_url);
      setModel(config.model);
      setIsCustom(config.is_custom);
      setMaskedKey(config.api_key);
      setStatus('已连接');
    } catch {
      setStatus('未配置');
    }
  }

  async function handleTestConnection() {
    if (!baseUrl || !model || (!apiKey && !maskedKey)) {
      setStatus('连接失败');
      setError('请先填写 连接地址、模型和 访问密钥');
      return;
    }

    if (!apiKey) {
      setStatus('连接失败');
      setError('测试连接时请重新输入一次 访问密钥。保存配置时可以留空保留旧 Key。');
      return;
    }

    try {
      const response = await api.post('/ai/test', {
        base_url: baseUrl,
        api_key: apiKey,
        model,
        temperature: 0.2,
        max_tokens: 512,
        is_custom: isCustom,
      });

      setStatus('已连接');
      setError('');
      setMessage(`测试连接成功：${response.data.model}`);
    } catch (requestError) {
      setStatus('连接失败');
      setError(getErrorMessage(requestError));
    }
  }

  async function handleSave() {
    try {
      const response = await api.put('/ai/config', {
        base_url: baseUrl,
        api_key: apiKey || 'sk-preserve-existing',
        model,
        temperature: 0.2,
        max_tokens: 512,
        is_custom: isCustom,
      });

      const config: ConfigResponse = response.data.config;
      setMaskedKey(config.api_key);
      setApiKey('');
      setStatus('已连接');
      setError('');
      setMessage('配置已保存');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function handleExport(format: 'json' | 'csv') {
    const response = await api.get(`/export/data?format=${format}`, {
      responseType: format === 'csv' ? 'text' : 'json',
    });

    const content =
      typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    const blob = new Blob([content], {
      type: format === 'csv' ? 'text/csv' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tang-export.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`已导出 ${format.toUpperCase()} 数据`);
  }

  return (
    <PageContainer className="page-stack">
      <header className="page-header">
        <div className="section-intro">
          <span className="eyebrow">AI 设置</span>
          <h1 className="page-title">在同一处管理模型连接、导出与验证。</h1>
          <p className="page-subtitle">
            把连接地址、模型、密钥与导出放在同一处管理，减少来回查找。
          </p>
        </div>
        <span className={`pill ${status === '已连接' ? 'status-ok' : 'status-warning'}`}>
          {status}
        </span>
      </header>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <section className="section-shell">
        <div className="stats-grid">
          <StatusTile label="连接状态" value={status} hint="先验证连接，再保存配置。" />
          <StatusTile label="模型名称" value={model} hint="支持填写兼容的模型名称。" />
          <StatusTile label="接入方式" value={isCustom ? '自定义' : '默认配置'} hint="决定使用你的专属配置还是系统默认配置。" />
        </div>
      </section>

      <section className="content-grid settings-grid">
        <Card className="surface-card surface-subtle">
          <div className="section-intro">
            <span className="eyebrow">模型连接</span>
            <h2>把连接信息整理成更容易理解的步骤。</h2>
            <p className="page-subtitle">
              先选模式，再填写 endpoint 和模型；所有配置都保留当前业务逻辑，只做视觉与可读性优化。
            </p>
          </div>

          <div className="panel-split">
            <label className="field">
              <span className="field-label">使用自定义 AI</span>
              <Select
                value={String(isCustom)}
                onChange={(event) => setIsCustom(event.target.value === 'true')}
              >
                <option value="true">是</option>
                <option value="false">否</option>
              </Select>
            </label>

            <label className="field">
              <span className="field-label">连接地址</span>
              <Input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span className="field-label">访问密钥</span>
            <Input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={maskedKey ? '留空则保留当前 Key' : '输入 访问密钥'}
            />
            <p className="field-hint">
              {maskedKey
                ? `当前已保存：${maskedKey}。如不需要更换，可留空保存。`
                : '首次启用时必须填写。'}
            </p>
          </label>

          <label className="field">
            <span className="field-label">模型名称</span>
            <Input
              list="ai-model-suggestions"
              value={model}
              onChange={(event) => setModel(event.target.value)}
              placeholder="例如：gpt-4o、gpt-4.1-mini、deepseek-chat、qwen-plus"
            />
            <datalist id="ai-model-suggestions">
              <option value="gpt-4o" />
              <option value="gpt-4o-mini" />
              <option value="gpt-4.1-mini" />
              <option value="gpt-4.1" />
              <option value="deepseek-chat" />
              <option value="claude-3-5-sonnet-latest" />
              <option value="qwen-plus" />
            </datalist>
            <p className="field-hint">你可以直接输入要使用的兼容模型名称。</p>
          </label>

          <div className="button-row">
            <Button type="button" variant="secondary" onClick={() => void handleTestConnection()}>
              测试连接
            </Button>
            <Button type="button" onClick={handleSave}>
              保存配置
            </Button>
          </div>
        </Card>

        <div className="settings-rail">
          <Card className="surface-card">
            <div className="section-intro">
              <span className="eyebrow">导出与状态</span>
              <h2>把当前状态做成一个易读侧栏。</h2>
            </div>
            <div className="stack">
              <div className="status-tile">
                <p className="metric-label">连接地址</p>
                <span className="code-chip">{baseUrl}</span>
              </div>
              <div className="status-tile">
                <p className="metric-label">模型</p>
                <span className="code-chip">{model}</span>
              </div>
              {maskedKey ? (
                <div className="status-tile">
                  <p className="metric-label">已保存 Key</p>
                  <span className="code-chip">{maskedKey}</span>
                </div>
              ) : null}
            </div>
            <div className="subsection-divider" />
            <p className="muted">导出当前账号的 JSON 或 CSV 数据，便于备份或进一步分析。</p>
            <div className="button-row">
              <Button type="button" variant="ghost" onClick={() => handleExport('json')}>
                导出 JSON
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleExport('csv')}>
                导出 CSV
              </Button>
            </div>
          </Card>

          <Card className="surface-card surface-subtle">
            <div className="section-intro">
              <span className="eyebrow">最小验证</span>
              <h3>如何确认食谱是真的由 AI 参与生成。</h3>
            </div>
            <ul className="check-list">
              <li>先在这里把模型配置保存并测试连接，确保状态显示为“已连接”。</li>
              <li>去个人资料把饮食禁忌改成明显食材，例如“鱼”或“葱姜蒜”。</li>
              <li>回到今日食谱点击“重新生成”，观察页面上的“生成来源”和菜名变化。</li>
              <li>如果显示“真实 AI 生成”且菜名、食材同步变化，就能最小化验证 AI 已生效。</li>
            </ul>
          </Card>
        </div>
      </section>
    </PageContainer>
  );
}

function StatusTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="surface-card surface-subtle status-tile">
      <p className="metric-label">{label}</p>
      <p className="status-tile-value">{value}</p>
      <p className="muted" style={{ margin: 0 }}>
        {hint}
      </p>
    </Card>
  );
}
