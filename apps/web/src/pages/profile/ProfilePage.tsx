import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../lib/api';
import { Button, Card, Input, PageContainer, Select } from '@tang/shared';
import { getErrorMessage } from '../../utils/error-handler';

type ProfileForm = {
  gender: 'male' | 'female';
  age: number;
  height_cm: number;
  weight_kg: number;
  goal: 'lose' | 'maintain' | 'gain';
  activity_level:
    | 'sedentary'
    | 'lightly_active'
    | 'moderately_active'
    | 'very_active'
    | 'extra_active';
  allergies: string;
  dietary_restrictions: string;
};

type ComputedProfile = {
  bmr: number;
  tdee: number;
  daily_calorie_target: number;
};

const DEFAULT_FORM: ProfileForm = {
  gender: 'male',
  age: 30,
  height_cm: 175,
  weight_kg: 75,
  goal: 'maintain',
  activity_level: 'moderately_active',
  allergies: '',
  dietary_restrictions: '',
};

export default function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM);
  const [computed, setComputed] = useState<ComputedProfile | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const response = await api.get('/user/profile');
      const profile = response.data.profile;
      setForm({
        gender: profile.gender,
        age: profile.age,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        goal: profile.goal,
        activity_level: profile.activity_level,
        allergies: (profile.allergies ?? []).join(', '),
        dietary_restrictions: (profile.dietary_restrictions ?? []).join(', '),
      });
      setComputed({
        bmr: profile.bmr,
        tdee: profile.tdee,
        daily_calorie_target: profile.daily_calorie_target,
      });
      setMessage('');
    } catch {
      setMessage('当前还没有个人资料，请先填写。');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const payload = {
        gender: form.gender,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        goal: form.goal,
        activity_level: form.activity_level,
        allergies: splitItems(form.allergies),
        dietary_restrictions: splitItems(form.dietary_restrictions),
      };

      const response = await api.put('/user/profile', payload);
      const profile = response.data.profile;
      setComputed({
        bmr: profile.bmr,
        tdee: profile.tdee,
        daily_calorie_target: profile.daily_calorie_target,
      });
      setMessage('资料已保存，现在可以去生成饮食计划。');
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <div className="page-header">
        <div>
          <h1 className="page-title">个人资料</h1>
          <p className="page-subtitle">这里决定系统如何估算你的基础代谢、总能耗与每日热量目标。</p>
        </div>
        <Link to="/plan">
          <Button type="button" variant="ghost">
            去看饮食计划
          </Button>
        </Link>
      </div>

      {message ? <div className="banner banner-success">{message}</div> : null}
      {error ? <div className="banner banner-error">{error}</div> : null}

      <div className="content-grid">
        <Card className="surface-card">
          <h2>基础信息</h2>
          <form className="form-grid" onSubmit={handleSubmit}>
            <div className="form-grid two-columns">
              <label className="field">
                <span className="field-label">性别</span>
                <Select
                  value={form.gender}
                  onChange={(event) =>
                    setForm({ ...form, gender: event.target.value as 'male' | 'female' })
                  }
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                </Select>
              </label>

              <label className="field">
                <span className="field-label">年龄</span>
                <Input
                  type="number"
                  value={form.age}
                  onChange={(event) => setForm({ ...form, age: Number(event.target.value) })}
                />
              </label>

              <label className="field">
                <span className="field-label">身高 (cm)</span>
                <Input
                  type="number"
                  value={form.height_cm}
                  onChange={(event) => setForm({ ...form, height_cm: Number(event.target.value) })}
                />
              </label>

              <label className="field">
                <span className="field-label">体重 (kg)</span>
                <Input
                  type="number"
                  value={form.weight_kg}
                  onChange={(event) => setForm({ ...form, weight_kg: Number(event.target.value) })}
                />
              </label>

              <label className="field">
                <span className="field-label">目标</span>
                <Select
                  value={form.goal}
                  onChange={(event) =>
                    setForm({ ...form, goal: event.target.value as ProfileForm['goal'] })
                  }
                >
                  <option value="lose">减脂</option>
                  <option value="maintain">维持</option>
                  <option value="gain">增肌</option>
                </Select>
              </label>

              <label className="field">
                <span className="field-label">活动水平</span>
                <Select
                  value={form.activity_level}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      activity_level: event.target.value as ProfileForm['activity_level'],
                    })
                  }
                >
                  <option value="sedentary">久坐</option>
                  <option value="lightly_active">轻度活动</option>
                  <option value="moderately_active">中度活动</option>
                  <option value="very_active">高强度活动</option>
                  <option value="extra_active">极高强度活动</option>
                </Select>
              </label>
            </div>

            <label className="field">
              <span className="field-label">过敏食物</span>
              <Input
                value={form.allergies}
                onChange={(event) => setForm({ ...form, allergies: event.target.value })}
                placeholder="例如：花生, 海鲜"
              />
              <p className="field-hint">用逗号分隔，生成食谱时会尽量规避。</p>
            </label>

            <label className="field">
              <span className="field-label">饮食禁忌</span>
              <Input
                value={form.dietary_restrictions}
                onChange={(event) => setForm({ ...form, dietary_restrictions: event.target.value })}
                placeholder="例如：少油, 不吃内脏"
              />
            </label>

            <Button type="submit" disabled={saving}>
              {saving ? '保存中...' : '保存资料'}
            </Button>
          </form>
        </Card>

        <Card className="surface-card">
          <h2>系统计算结果</h2>
          {loading ? (
            <p className="muted">正在读取资料...</p>
          ) : computed ? (
            <div className="stack">
              <Metric label="BMR 基础代谢" value={`${computed.bmr} kcal`} />
              <Metric label="TDEE 总能耗" value={`${computed.tdee} kcal`} />
              <Metric label="每日建议热量" value={`${computed.daily_calorie_target} kcal`} />
              <div className="button-row">
                <Link to="/plan">
                  <Button type="button" variant="secondary">
                    下一步：生成计划
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>还没有计算结果。</p>
              <p className="muted">保存基础资料后，这里会自动展示推荐热量。</p>
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

function splitItems(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="table-like-row">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
