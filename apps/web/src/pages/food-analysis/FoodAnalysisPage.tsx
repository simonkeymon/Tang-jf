import { ChangeEvent, useState } from 'react';
import { Button, Card, PageContainer } from '@tang/shared';

import { api, resolveApiAssetUrl } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setAnalysis(null);
    setMessage('');
    setError('');

    if (nextFile) {
      setPreviewUrl(URL.createObjectURL(nextFile));
      return;
    }

    setPreviewUrl('');
  }

  async function handleAnalyze() {
    if (!file) {
      setError('请先选择图片');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploadResponse = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const imageUrl = resolveApiAssetUrl(uploadResponse.data.file.url);
      const analysisResponse = await api.post('/food/analyze', { image_url: imageUrl });
      setAnalysis(analysisResponse.data.analysis);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">食物拍照分析</h1>
          <p className="page-subtitle">上传一张食物照片，快速估算餐盘热量与组成。</p>
        </div>
        <Button type="button" onClick={handleAnalyze} disabled={loading}>
          {loading ? '分析中...' : '开始分析'}
        </Button>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <div className="content-grid">
        <Card className="surface-card">
          <h2>上传图片</h2>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          {previewUrl ? (
            <div style={{ marginTop: 16 }}>
              <img src={previewUrl} alt="预览" style={{ maxWidth: '100%', borderRadius: 16 }} />
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: 16 }}>
              <p>选择图片后，这里会显示预览。</p>
            </div>
          )}
        </Card>

        <Card className="surface-card">
          <h2>分析结果</h2>
          {!analysis ? (
            <div className="empty-state">
              <p>还没有分析结果。</p>
            </div>
          ) : (
            <div className="stack">
              <div className="table-like-row">
                <span>总热量</span>
                <strong>{analysis.total_calories} kcal</strong>
              </div>
              <div className="table-like-row">
                <span>置信度</span>
                <strong>{analysis.confidence}</strong>
              </div>
              <ul className="list-reset">
                {analysis.foods.map((food) => (
                  <li key={food.id} className="table-like-row">
                    <span>
                      {food.name} · {food.estimated_portion}
                    </span>
                    <strong>{food.estimated_calories} kcal</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}
