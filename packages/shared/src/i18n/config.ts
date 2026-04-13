import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const zhCN = {
  common: { appName: 'Tang 健康饮食', welcome: '欢迎回来' },
  auth: { login: '登录', register: '注册' },
  plan: { title: '我的饮食计划' },
  recipe: { title: '今日食谱' },
  tracking: { title: '记录中心' },
};

const enUS = {
  common: { appName: 'Tang Health Diet', welcome: 'Welcome back' },
  auth: { login: 'Login', register: 'Register' },
  plan: { title: 'My Diet Plan' },
  recipe: { title: "Today's Recipes" },
  tracking: { title: 'Tracking Center' },
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    lng: 'zh-CN',
    fallbackLng: 'en-US',
    interpolation: { escapeValue: false },
  });
}

export { i18n };
