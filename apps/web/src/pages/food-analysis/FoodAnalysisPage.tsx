import { ChangeEvent, useState } from 'react';

import { api } from '../../lib/api';

type FoodAnalysisResult = {
  id: string;
  foods: Array<{
    id: string;
    name: string;
    estimated_portion: string;
    estimated_calories: number;
  }>;
  total_calories: number;
  confidence: 'high' | 'medium' | 'low';
};

export default function FoodAnalysisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setAnalysis(null);
    setMessage('');

    if (nextFile) {
      setPreviewUrl(URL.createObjectURL(nextFile));
    } else {
      setPreviewUrl('');
    }
  }

  async function handleAnalyze() {
    if (!file) {
      setMessage('请先选择图片');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = uploadRes.data.file.url;
      const analysisRes = await api.post('/food/analyze', { image_url: imageUrl });
      setAnalysis(analysisRes.data.analysis);
    } catch {
      setMessage('分析失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 16, paddingBottom: 96 }}>
      <h1>食物拍照分析</h1>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {previewUrl ? (
        <div style={{ marginTop: 16 }}>
          <img src={previewUrl} alt="预览" style={{ maxWidth: '100%', borderRadius: 8 }} />
        </div>
      ) : null}
      <div style={{ marginTop: 16 }}>
        <button type="button" onClick={handleAnalyze} disabled={loading}>
          {loading ? '分析中...' : '分析热量'}
        </button>
      </div>
      {message ? <p>{message}</p> : null}

      {analysis ? (
        <section style={{ marginTop: 24 }}>
          <h2>分析结果</h2>
          <p>总热量：{analysis.total_calories} kcal</p>
          <p>置信度：{analysis.confidence}</p>
          <ul>
            {analysis.foods.map((food) => (
              <li key={food.id}>
                {food.name} · {food.estimated_portion} · {food.estimated_calories} kcal
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setMessage('已记录到今日午餐（入口已接好，详细整合稍后补全）')}
          >
            记录到今日午餐
          </button>
        </section>
      ) : null}
    </main>
  );
}
