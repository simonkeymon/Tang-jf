import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, PageContainer, useTranslation } from '@tang/shared';

import { api } from '../../lib/api';
import { getErrorMessage } from '../../utils/error-handler';

interface Plan {
  id: string;
  goal: string;
  daily_calorie_target: number;
  duration_days: number;
  macro_ratio: {
    protein: number;
    carbohydrate: number;
    fat: number;
  };
  phase_descriptions: string[];
  notes: string;
}

export default function PlanPage() {
  const { t } = useTranslation();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<'plan' | 'recipe' | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    void fetchPlan();
  }, []);

  async function fetchPlan() {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/plan/current');
      setPlan(response.data.plan);
    } catch (requestError) {
      if (
        typeof requestError === 'object' &&
        requestError !== null &&
        'response' in requestError &&
        requestError.response &&
        typeof requestError.response === 'object' &&
        'status' in requestError.response &&
        requestError.response.status === 404
      ) {
        setPlan(null);
      } else {
        setError(getErrorMessage(requestError));
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGeneratePlan() {
    try {
      setWorking('plan');
      setError('');
      const response = await api.post('/plan/generate');
      setPlan(response.data.plan);
      setMessage('专属饮食计划已生成。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorking(null);
    }
  }

  async function handleGenerateRecipe() {
    try {
      setWorking('recipe');
      setError('');
      await api.post('/recipe/generate-daily', {
        date: new Date().toISOString().slice(0, 10),
      });
      setMessage('今日食谱已生成，去看看今天吃什么吧。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return <PageContainer className="page-stack">加载计划中...</PageContainer>;
  }

  return (
    <PageContainer className="page-stack">
      <header className="page-header">
        <div className="section-intro">
          <span className="eyebrow">30 天饮食策略</span>
          <h1 className="page-title">{t('plan.title')}</h1>
          <p className="page-subtitle">围绕你的目标生成 30 天饮食策略，并衔接今日食谱。</p>
        </div>
        <div className="button-row">
          <Link to="/profile">
            <Button type="button" variant="ghost">
              编辑资料
            </Button>
          </Link>
          {plan ? (
            <Button type="button" onClick={handleGenerateRecipe} disabled={working !== null}>
              {working === 'recipe' ? '生成中...' : '生成今日食谱'}
            </Button>
          ) : null}
        </div>
      </header>

      {error ? <div className="banner banner-error">{error}</div> : null}
      {message ? <div className="banner banner-success">{message}</div> : null}

      {!plan ? (
        <Card className="surface-card surface-subtle">
          <div className="empty-state">
            <span className="eyebrow">计划尚未开始</span>
            <h2>你还没有饮食计划</h2>
            <p className="muted">先在个人资料里完善身体数据，再让 AI 为你生成专属计划。</p>
            <div className="button-row" style={{ justifyContent: 'center' }}>
              <Link to="/profile">
                <Button type="button" variant="secondary">
                  先完善资料
                </Button>
              </Link>
              <Button type="button" onClick={handleGeneratePlan} disabled={working !== null}>
                {working === 'plan' ? '生成中...' : '创建饮食计划'}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <>
          <section className="section-shell">
            <Card className="surface-card plan-hero-panel">
              <div className="plan-hero-grid">
                <div className="section-intro">
                  <span className="eyebrow">计划总览</span>
                  <h2 className="section-title">围绕 {translateGoal(plan.goal)} 的热量与宏量分配。</h2>
                  <p className="page-subtitle">
                    用轻量但清晰的结构，把周期、热量和营养比例放到同一个阅读节奏里，便于今天直接行动。
                  </p>
                  <div className="pill-row">
                    <span className="pill">周期 {plan.duration_days} 天</span>
                    <span className="pill">目标 {translateGoal(plan.goal)}</span>
                    <span className="pill">{plan.daily_calorie_target} kcal / 天</span>
                  </div>
                </div>

                <div className="stats-grid">
                  <MetricCard label="目标" value={translateGoal(plan.goal)} />
                  <MetricCard label="每日热量" value={`${plan.daily_calorie_target} kcal`} />
                  <MetricCard label="周期" value={`${plan.duration_days} 天`} />
                  <MetricCard
                    label="宏量比例"
                    value={`${plan.macro_ratio.carbohydrate}/${plan.macro_ratio.protein}/${plan.macro_ratio.fat}`}
                  />
                </div>
              </div>
            </Card>
          </section>

          <section className="section-card-grid">
            <Card className="surface-card timeline-card surface-subtle">
              <div className="section-intro">
                <span className="eyebrow">执行阶段</span>
                <h3>按阶段推进，而不是只看一天的结果。</h3>
              </div>
              <div className="timeline-list">
                {plan.phase_descriptions.map((phase, index) => (
                  <div key={phase} className="table-like-row timeline-item">
                    <div>
                      <p className="timeline-title">阶段 {index + 1}</p>
                      <p className="timeline-copy">{phase}</p>
                    </div>
                    <span className="pill">阶段</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="surface-card">
              <div className="section-intro">
                <span className="eyebrow">营养结构</span>
                <h3>把宏量比例读成可执行的取舍。</h3>
              </div>
              <div className="macro-grid">
                <MacroCard label="碳水" value={`${plan.macro_ratio.carbohydrate}%`} />
                <MacroCard label="蛋白" value={`${plan.macro_ratio.protein}%`} />
                <MacroCard label="脂肪" value={`${plan.macro_ratio.fat}%`} />
              </div>
              <div className="subsection-divider" />
              <div className="button-row">
                <Button type="button" onClick={handleGenerateRecipe} disabled={working !== null}>
                  {working === 'recipe' ? '生成中...' : '生成今日食谱'}
                </Button>
                <Link to="/profile">
                  <Button type="button" variant="secondary">
                    回到资料页调整目标
                  </Button>
                </Link>
              </div>
            </Card>
          </section>

          <section className="section-shell">
            <Card className="surface-card" style={{ gridColumn: '1 / -1' }}>
              <div className="section-intro">
                <span className="eyebrow">AI 计划说明</span>
                <h3>把生成结果整理成更容易复盘的结构。</h3>
              </div>
              <div className="notes-prose">{renderPlanNotes(plan.notes)}</div>
            </Card>
          </section>
        </>
      )}
    </PageContainer>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card metric-card surface-subtle">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}

function MacroCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="macro-card">
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </div>
  );
}

function translateGoal(goal: string) {
  if (goal === 'lose') return '减脂';
  if (goal === 'gain') return '增肌';
  return '维持体型';
}

function renderPlanNotes(notes: string) {
  const blocks = parseMarkdownBlocks(notes);

  if (blocks.length === 0) {
    return <p className="muted notes-paragraph">AI 暂未返回详细说明。</p>;
  }

  return blocks.map((block, index) => {
    if (block.type === 'heading') {
      return <h3 key={`${block.type}-${index}`}>{block.text}</h3>;
    }

    if (block.type === 'list') {
      return (
        <Card key={`${block.type}-${index}`} className="surface-card notes-list-card">
          <ul className="list-reset note-list">
            {block.items.map((item, itemIndex) => (
              <li key={`${item}-${itemIndex}`} className="note-list-item">
                <span className="note-step">{itemIndex + 1}</span>
                <span className="muted" style={{ color: '#23324c' }}>
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      );
    }

    return (
      <p key={`${block.type}-${index}`} className="notes-paragraph">
        {block.text}
      </p>
    );
  });
}

function parseMarkdownBlocks(notes: string): Array<
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
> {
  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line, index, array) => !(line === '' && array[index - 1] === ''));

  const blocks: Array<
    | { type: 'heading'; text: string }
    | { type: 'paragraph'; text: string }
    | { type: 'list'; items: string[] }
  > = [];

  let paragraphBuffer: string[] = [];
  let listBuffer: string[] = [];

  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    blocks.push({
      type: 'paragraph',
      text: cleanInlineMarkdown(paragraphBuffer.join(' ')),
    });
    paragraphBuffer = [];
  }

  function flushList() {
    if (listBuffer.length === 0) return;
    blocks.push({
      type: 'list',
      items: listBuffer.map(cleanInlineMarkdown),
    });
    listBuffer = [];
  }

  for (const line of lines) {
    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      flushParagraph();
      flushList();
      blocks.push({
        type: 'heading',
        text: cleanInlineMarkdown(line.replace(/^#{1,6}\s+/, '')),
      });
      continue;
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      flushParagraph();
      listBuffer.push(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, ''));
      continue;
    }

    flushList();
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

function cleanInlineMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/^>\s?/, '')
    .trim();
}
