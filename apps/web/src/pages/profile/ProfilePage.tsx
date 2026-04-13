import { FormEvent, useEffect, useState } from 'react';

import { api } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { Button, Input, PageContainer, Select } from '@tang/shared';

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
  const { logout } = useAuth();
  const [form, setForm] = useState<ProfileForm>(DEFAULT_FORM);
  const [computed, setComputed] = useState<ComputedProfile | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await api.get('/user/profile');
      const profile = res.data.profile;
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
    } catch {
      setMessage('当前还没有个人资料，请先填写。');
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');

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

    const res = await api.put('/user/profile', payload);
    const profile = res.data.profile;
    setComputed({
      bmr: profile.bmr,
      tdee: profile.tdee,
      daily_calorie_target: profile.daily_calorie_target,
    });
    setMessage('保存成功');
  }

  return (
    <PageContainer>
      <h1>个人资料</h1>
      <p>填写你的基础信息，系统会计算 BMR / TDEE 和每日建议热量。</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <label>
          性别
          <Select
            value={form.gender}
            onChange={(e) => setForm({ ...form, gender: e.target.value as 'male' | 'female' })}
          >
            <option value="male">男</option>
            <option value="female">女</option>
          </Select>
        </label>

        <label>
          年龄
          <Input
            type="number"
            value={form.age}
            onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
          />
        </label>

        <label>
          身高 (cm)
          <Input
            type="number"
            value={form.height_cm}
            onChange={(e) => setForm({ ...form, height_cm: Number(e.target.value) })}
          />
        </label>

        <label>
          体重 (kg)
          <Input
            type="number"
            value={form.weight_kg}
            onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })}
          />
        </label>

        <label>
          目标
          <Select
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value as ProfileForm['goal'] })}
          >
            <option value="lose">减脂</option>
            <option value="maintain">维持</option>
            <option value="gain">增肌</option>
          </Select>
        </label>

        <label>
          活动水平
          <Select
            value={form.activity_level}
            onChange={(e) =>
              setForm({ ...form, activity_level: e.target.value as ProfileForm['activity_level'] })
            }
          >
            <option value="sedentary">久坐</option>
            <option value="lightly_active">轻度活动</option>
            <option value="moderately_active">中度活动</option>
            <option value="very_active">高强度活动</option>
            <option value="extra_active">极高强度活动</option>
          </Select>
        </label>

        <label>
          过敏食物（用逗号分隔）
          <Input
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
          />
        </label>

        <label>
          饮食禁忌（用逗号分隔）
          <Input
            value={form.dietary_restrictions}
            onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })}
          />
        </label>

        <Button type="submit">保存</Button>
      </form>

      {computed ? (
        <section style={{ marginTop: 24 }}>
          <h2>计算结果</h2>
          <p>BMR: {computed.bmr}</p>
          <p>TDEE: {computed.tdee}</p>
          <p>每日建议热量: {computed.daily_calorie_target}</p>
        </section>
      ) : null}

      {message ? <p>{message}</p> : null}

      <Button type="button" onClick={logout} style={{ marginTop: 24 }}>
        退出登录
      </Button>
    </PageContainer>
  );
}

function splitItems(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
