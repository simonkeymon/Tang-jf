import { useEffect, useState } from 'react';
import { Button, Card, PageContainer } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

type Report = {
  type: string;
  generated_at: string;
  weight_trend: { latest_weight: number | null; entries_count: number };
  execution_rate: number;
  calorie_summary: { actual: number; target: number };
  ai_summary: string;
};

export default function ReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void loadWeeklyReport();
  }, []);

  async function loadWeeklyReport() {
    try {
      const response = await api.get('/report/weekly');
      setReport(response.data.report);
    } catch {
      setReport(null);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError('');

    try {
      const response = await api.post('/report/generate?type=weekly');
      setReport(response.data.report);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">健康报告</h1>
          <p className="page-subtitle">按周汇总体重趋势、热量执行率与 AI 复盘内容。</p>
        </div>
        <Button type="button" onClick={handleGenerate} disabled={generating}>
          {generating ? '生成中...' : '生成周报'}
        </Button>
      </div>

      {error ? <div className="banner banner-error">{error}</div> : null}

      {!report ? (
        <Card className="surface-card">
          <div className="empty-state">
            <p>当前还没有周报，请先生成。</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="stats-grid">
            <Metric
              label="最新体重"
              value={`${report.weight_trend.latest_weight ?? '暂无'}${report.weight_trend.latest_weight ? ' kg' : ''}`}
            />
            <Metric label="记录次数" value={`${report.weight_trend.entries_count}`} />
            <Metric label="执行率" value={`${Math.round(report.execution_rate * 100)}%`} />
            <Metric
              label="热量"
              value={`${report.calorie_summary.actual}/${report.calorie_summary.target}`}
            />
          </div>

          <Card className="surface-card" style={{ marginTop: 24 }}>
            <h2>AI 总结</h2>
            <p className="muted" style={{ marginBottom: 0 }}>
              {report.ai_summary}
            </p>
          </Card>
        </>
      )}
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value" style={{ fontSize: '1.25rem' }}>
        {value}
      </p>
    </div>
  );
}
