import { ChangeEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, Card, Input, PageContainer, Select } from '@tang/shared';

import { api, resolveApiAssetUrl } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

type MealType = '早餐' | '午餐' | '晚餐' | '加餐';

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
  note?: string;
};

export default function FoodAnalysisPage() {
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>(parseMealType(searchParams.get('meal_type')));
  const [mealDate, setMealDate] = useState(getValidDate(searchParams.get('date')) ?? today);
  const [note, setNote] = useState(searchParams.get('note') ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const returnTo = searchParams.get('return_to');
  const cameFromRecipe = searchParams.get('source') === 'recipe';

  useEffect(
    () => () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    },
    [previewUrl],
  );

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
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
      const analysisResponse = await api.post('/food/analyze', {
        image_url: imageUrl,
        note: note.trim() || undefined,
      });
      setAnalysis(analysisResponse.data.analysis);
      setMessage('识别完成，可以直接把结果记录到对应餐次。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordMeal() {
    if (!analysis) {
      setError('请先完成拍照识别');
      return;
    }

    if (analysis.total_calories <= 0 || analysis.foods.length === 0) {
      setError('当前结果无法识别为有效餐食，请换一张更清晰的食物照片');
      return;
    }

    setRecording(true);
    setError('');

    try {
      await api.post('/tracking/checkin', {
        date: mealDate,
        meal_type: mealType,
        status: 'completed',
        calories: analysis.total_calories,
        note: buildMealRecordNote(analysis, note),
      });
      setMessage(
        `${formatMealContext(mealDate, mealType, today)} 已记录，约 ${analysis.total_calories} kcal。`,
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRecording(false);
    }
  }

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">食物拍照分析</h1>
          <p className="page-subtitle">
            {cameFromRecipe
              ? `为${mealType}拍一张照片，识别后可以直接记录这餐实际吃了什么和热量。`
              : '上传一张食物照片，快速估算餐盘热量与组成，并可直接记录到对应餐次。'}
          </p>
        </div>
        <div className="button-row">
          {returnTo ? (
            <Link to={returnTo}>
              <Button type="button" variant="ghost">
                返回上一页
              </Button>
            </Link>
          ) : null}
          <Button type="button" onClick={handleAnalyze} disabled={loading}>
            {loading ? '分析中...' : '开始分析'}
          </Button>
        </div>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <Card className="surface-card" style={{ marginBottom: 24 }}>
        <h2>记录到哪一餐</h2>
        <div className="form-grid two-columns">
          <label className="field">
            <span className="field-label">日期</span>
            <Input
              type="date"
              value={mealDate}
              onChange={(event) => setMealDate(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">餐次</span>
            <Select
              value={mealType}
              onChange={(event) => setMealType(event.target.value as MealType)}
            >
              <option value="早餐">早餐</option>
              <option value="午餐">午餐</option>
              <option value="晚餐">晚餐</option>
              <option value="加餐">加餐</option>
            </Select>
          </label>
        </div>
        <label className="field">
          <span className="field-label">补充说明（可选）</span>
          <textarea
            className="ui-input"
            rows={4}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例如：自己做的少油鸡胸肉、是否加了酱汁、是否搭配主食等"
            style={{ padding: 14 }}
          />
          <p className="field-hint">这段说明会一起发给 AI，帮助它更准确识别并保存到本餐记录。</p>
        </label>
      </Card>

      <div className="content-grid">
        <Card className="surface-card">
          <h2>上传图片</h2>
          <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
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
                <strong>{formatConfidence(analysis.confidence)}</strong>
              </div>
              {analysis.note ? (
                <div className="table-like-row">
                  <span>识别备注</span>
                  <strong>{analysis.note}</strong>
                </div>
              ) : null}
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
              <div className="button-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRecordMeal}
                  disabled={
                    recording || analysis.total_calories <= 0 || analysis.foods.length === 0
                  }
                >
                  {recording ? '记录中...' : `记录到${mealType}`}
                </Button>
                {returnTo ? (
                  <Link to={returnTo}>
                    <Button type="button" variant="ghost">
                      返回查看本餐
                    </Button>
                  </Link>
                ) : null}
              </div>
              <p className="muted" style={{ margin: 0 }}>
                记录后会自动把这餐标记为已打卡，并保存识别到的食物摘要和热量。
              </p>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

function parseMealType(raw: string | null): MealType {
  if (raw === '早餐' || raw === '午餐' || raw === '晚餐' || raw === '加餐') {
    return raw;
  }

  return '午餐';
}

function getValidDate(raw: string | null) {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return null;
}

function buildMealRecordNote(analysis: FoodAnalysisResult, note: string) {
  const foods = analysis.foods
    .map((food) => `${food.name}（${food.estimated_portion}）`)
    .join('、');
  const base = foods || analysis.note || 'AI 识别餐食';
  const trimmedNote = note.trim();

  if (!trimmedNote) {
    return base;
  }

  return `${base}；备注：${trimmedNote}`;
}

function formatConfidence(confidence: FoodAnalysisResult['confidence']) {
  if (confidence === 'high') return '高';
  if (confidence === 'medium') return '中';
  return '低';
}

function formatMealContext(date: string, mealType: MealType, today: string) {
  if (date === today) {
    return `今日${mealType}`;
  }

  return `${date} ${mealType}`;
}
