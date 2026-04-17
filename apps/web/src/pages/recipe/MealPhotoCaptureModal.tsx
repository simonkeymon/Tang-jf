import { ChangeEvent, useEffect, useState } from 'react';
import { Button } from '@tang/shared';

import { api, resolveApiAssetUrl } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

export type MealType = '早餐' | '午餐' | '晚餐' | '加餐';

export type CheckinEntry = {
  date: string;
  meal_type: MealType;
  status: 'completed' | 'skipped' | 'partial';
  calories?: number;
  note?: string;
};

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

type MealPhotoCaptureModalProps = {
  date: string;
  mealType: MealType;
  title: string;
  onClose: () => void;
  onRecorded: (checkin: CheckinEntry, message: string) => void;
};

export function MealPhotoCaptureModal({
  date,
  mealType,
  title,
  onClose,
  onRecorded,
}: MealPhotoCaptureModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [analysis, setAnalysis] = useState<FoodAnalysisResult | null>(null);
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      setError('请先拍照或选择一张食物图片');
      return;
    }

    setAnalyzing(true);
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
      setMessage('识别完成，确认后会直接更新这餐记录。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setAnalyzing(false);
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
      const response = await api.post('/tracking/checkin', {
        date,
        meal_type: mealType,
        status: 'completed',
        calories: analysis.total_calories,
        note: buildMealRecordNote(analysis, note),
      });

      onRecorded(
        response.data.checkin,
        `${mealType} 已通过 AI 识别记录，约 ${analysis.total_calories} kcal。`,
      );
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRecording(false);
    }
  }

  return (
    <div className="modal-overlay meal-photo-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal-surface meal-photo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-photo-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="page-header meal-photo-modal-header" style={{ marginBottom: 16 }}>
          <div>
            <h2 id="meal-photo-modal-title">AI 拍照识别热量</h2>
            <p className="page-subtitle">
              当前记录的是 {mealType} · {title}。拍照后会直接更新这餐吃了什么和热量。
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="meal-photo-modal-close"
          >
            关闭
          </Button>
        </div>

        {message ? <div className="banner banner-success">{message}</div> : null}
        {error ? <div className="banner banner-error">{error}</div> : null}

        <div className="content-grid meal-photo-modal-grid">
          <div className="stack meal-photo-modal-form">
            <label className="field">
              <span className="field-label">拍照或选择图片</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
              />
              <p className="field-hint">手机端会优先尝试打开后置摄像头，也可以直接选相册图片。</p>
            </label>

            <label className="field">
              <span className="field-label">补充说明（可选）</span>
              <textarea
                className="ui-input"
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="例如：自己做的、少油、加了酱汁、主食大概多少等"
                style={{ padding: 14 }}
              />
              <p className="field-hint">补充说明会一起发给 AI，帮助识别更接近你实际吃的这餐。</p>
            </label>

            <div className="button-row meal-photo-modal-actions">
              <Button type="button" onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? '识别中...' : '开始识别'}
              </Button>
              {analysis ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRecordMeal}
                  disabled={recording}
                >
                  {recording ? '记录中...' : `记录到${mealType}`}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="stack meal-photo-modal-results">
            <div
              className="surface-card meal-photo-modal-panel"
              style={{ boxShadow: 'none', background: 'var(--color-bg-alt)' }}
            >
              <h3>照片预览</h3>
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={`${mealType} 预览`}
                  className="meal-photo-modal-image"
                  style={{ width: '100%', borderRadius: 16, objectFit: 'cover' }}
                />
              ) : (
                <div className="empty-state" style={{ paddingBlock: 40 }}>
                  <p>拍照后，这里会显示预览。</p>
                </div>
              )}
            </div>

            <div
              className="surface-card meal-photo-modal-panel"
              style={{ boxShadow: 'none', background: 'var(--color-bg-alt)' }}
            >
              <h3>识别结果</h3>
              {!analysis ? (
                <div className="empty-state" style={{ paddingBlock: 40 }}>
                  <p>完成识别后，这里会展示热量和食物明细。</p>
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
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
