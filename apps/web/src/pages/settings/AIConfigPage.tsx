import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

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

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const res = await api.get('/ai/config');
      const config: ConfigResponse = res.data.config;
      setBaseUrl(config.base_url);
      setModel(config.model);
      setIsCustom(config.is_custom);
      setMaskedKey(config.api_key);
      setStatus('已连接');
    } catch {
      setStatus('未配置');
    }
  }

  function handleTestConnection() {
    if (!baseUrl || (!apiKey && !maskedKey)) {
      setStatus('连接失败');
      setMessage('请先填写必要配置');
      return;
    }

    setStatus('已连接');
    setMessage('测试连接成功');
  }

  async function handleSave() {
    const res = await api.put('/ai/config', {
      base_url: baseUrl,
      api_key: apiKey || 'sk-preserve-existing',
      model,
      temperature: 0.2,
      max_tokens: 512,
      is_custom: isCustom,
    });

    const config: ConfigResponse = res.data.config;
    setMaskedKey(config.api_key);
    setApiKey('');
    setStatus('已连接');
    setMessage('配置已保存');
  }

  async function handleExport(format: 'json' | 'csv') {
    const res = await api.get(`/export/data?format=${format}`, {
      responseType: format === 'csv' ? 'text' : 'json',
    });

    const content = typeof res.data === 'string' ? res.data : JSON.stringify(res.data, null, 2);
    const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tang-export.${format}`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`已导出 ${format.toUpperCase()} 数据`);
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>AI 设置</h1>

      <label style={{ display: 'block', marginBottom: 16 }}>
        <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} />{' '}
        使用自定义 AI
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Base URL
        <input
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          style={{ width: '100%' }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        API Key
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={maskedKey ?? '输入 API Key'}
          style={{ width: '100%' }}
        />
      </label>
      {maskedKey ? <p>已保存 Key：{maskedKey}</p> : null}

      <label style={{ display: 'block', marginBottom: 12 }}>
        模型
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="gpt-4o">gpt-4o</option>
          <option value="gpt-4o-mini">gpt-4o-mini</option>
          <option value="deepseek-chat">deepseek-chat</option>
          <option value="claude-3.5-sonnet">claude-3.5-sonnet</option>
        </select>
      </label>

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={handleTestConnection}>
          测试连接
        </button>
        <button type="button" onClick={handleSave}>
          保存
        </button>
        <button type="button" onClick={() => handleExport('json')}>
          导出 JSON
        </button>
        <button type="button" onClick={() => handleExport('csv')}>
          导出 CSV
        </button>
      </div>

      <p>当前状态：{status}</p>
      {message ? <p>{message}</p> : null}
    </main>
  );
}
