import { useEffect, useState } from 'react';

import { api } from '../../lib/api';

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

  useEffect(() => {
    void loadWeeklyReport();
  }, []);

  async function loadWeeklyReport() {
    try {
      const res = await api.get('/report/weekly');
      setReport(res.data.report);
    } catch {
      setReport(null);
    }
  }

  async function handleGenerate() {
    const res = await api.post('/report/generate?type=weekly');
    setReport(res.data.report);
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16 }}>
      <h1>健康报告</h1>
      <button type="button" onClick={handleGenerate}>
        生成周报
      </button>
      {report ? (
        <section style={{ marginTop: 16 }}>
          <p>类型：{report.type}</p>
          <p>最新体重：{report.weight_trend.latest_weight ?? '暂无'} kg</p>
          <p>记录次数：{report.weight_trend.entries_count}</p>
          <p>执行率：{Math.round(report.execution_rate * 100)}%</p>
          <p>
            热量：{report.calorie_summary.actual} / {report.calorie_summary.target} kcal
          </p>
          <p>{report.ai_summary}</p>
        </section>
      ) : (
        <p>当前还没有周报，请先生成。</p>
      )}
    </main>
  );
}
