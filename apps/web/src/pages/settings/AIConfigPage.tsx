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
      setError('请先填写 Base URL、模型和 API Key');
      return;
    }

    if (!apiKey) {
      setStatus('连接失败');
      setError('测试连接时请重新输入一次 API Key。保存配置时可以留空保留旧 Key。');
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
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">AI 设置</h1>
          <p className="page-subtitle">配置自定义模型与导出能力，保持当前服务的可替换性。</p>
        </div>
        <span className={`pill ${status === '已连接' ? 'status-ok' : 'status-warning'}`}>
          {status}
        </span>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <div className="content-grid">
        <Card className="surface-card">
          <h2>连接配置</h2>
          <div className="form-grid">
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
              <span className="field-label">Base URL</span>
              <Input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
            </label>

            <label className="field">
              <span className="field-label">API Key</span>
              <Input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder={maskedKey ? '留空则保留当前 Key' : '输入 API Key'}
              />
              <p className="field-hint">
                {maskedKey
                  ? `当前已保存：${maskedKey}。如不需要更换，可留空保存。`
                  : '首次启用时必须填写。'}
              </p>
            </label>

            <label className="field">
              <span className="field-label">模型（可自定义）</span>
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
              <p className="field-hint">你可以直接输入任何兼容 OpenAI 接口的自定义模型名。</p>
            </label>

            <div className="button-row">
              <Button type="button" variant="secondary" onClick={() => void handleTestConnection()}>
                测试连接
              </Button>
              <Button type="button" onClick={handleSave}>
                保存配置
              </Button>
            </div>
          </div>
        </Card>

        <Card className="surface-card">
          <h2>数据导出</h2>
          <p className="muted">导出当前账号的 JSON 或 CSV 数据，便于备份或进一步分析。</p>
          <div className="button-row">
            <Button type="button" variant="ghost" onClick={() => handleExport('json')}>
              导出 JSON
            </Button>
            <Button type="button" variant="ghost" onClick={() => handleExport('csv')}>
              导出 CSV
            </Button>
          </div>
          {maskedKey ? (
            <p className="muted" style={{ marginBottom: 0 }}>
              已保存 Key：{maskedKey}
            </p>
          ) : null}
        </Card>
      </div>
    </PageContainer>
  );
}
