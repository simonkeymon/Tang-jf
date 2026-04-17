import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { plans, recipes } from '../../db/schema/index.js';
import type { AIServerService } from '../ai/ai.service.js';
import type { DietPlanRecord, MacroRatio, PlanService } from '../plan/plan.service.js';
import type { ProfileResponse, UserService } from '../user/user.service.js';
import { buildRecipePrompt, buildSwapRecipePrompt } from './recipe.prompts.js';

type MealType = '早餐' | '午餐' | '晚餐' | '加餐';
type CuisineType =
  | '川菜'
  | '粤菜'
  | '苏菜'
  | '鲁菜'
  | '湘菜'
  | '闽菜'
  | '浙菜'
  | '徽菜'
  | '家常菜';
type GoalType = 'lose' | 'maintain' | 'gain';

type RecipeIngredient = { name: string; quantity: string; unit: string };
type RecipeStep = { order: number; instruction: string };

type RecipePlanContext = {
  goal: GoalType;
  macro_ratio: MacroRatio;
  daily_calorie_target: number;
};

type CompiledFoodPreferences = {
  blockedTags: Set<string>;
  ingredientKeywords: string[];
  textKeywords: string[];
};

type RecipeGenerationMode = 'ai' | 'mock' | 'fallback';

export interface RecipeGenerationMeta {
  mode: RecipeGenerationMode;
  provider: 'openai-compatible' | 'mock';
  model: string;
  generated_at: string;
  reason?: string;
}

type ExcludedTitlesByMeal = Partial<Record<MealType, string[]>>;

type RecipeTemplate = {
  meal_type: MealType;
  title: string;
  cuisine_type: CuisineType;
  ingredients: RecipeIngredient[];
  steps: string[];
  cook_time_minutes: number;
  goals: GoalType[];
  tags: string[];
};

const MEAL_ORDER: MealType[] = ['早餐', '午餐', '晚餐', '加餐'];
const CUISINE_TYPES: CuisineType[] = [
  '川菜',
  '粤菜',
  '苏菜',
  '鲁菜',
  '湘菜',
  '闽菜',
  '浙菜',
  '徽菜',
  '家常菜',
];

const TAG_KEYWORDS: Record<string, { ingredientKeywords: string[]; textKeywords: string[] }> = {
  fish: {
    ingredientKeywords: [
      '鱼',
      '鲈鱼',
      '三文鱼',
      '鳕鱼',
      '巴沙鱼',
      '金枪鱼',
      '鱼片',
      '鱼柳',
      '鱼肉',
      '带鱼',
      '鲫鱼',
      '鲤鱼',
      '鳗鱼',
      '黄花鱼',
    ],
    textKeywords: [
      '鲈鱼',
      '三文鱼',
      '鳕鱼',
      '巴沙鱼',
      '金枪鱼',
      '鱼片',
      '鱼柳',
      '鱼肉',
      '带鱼',
      '鲫鱼',
      '鲤鱼',
      '鳗鱼',
      '黄花鱼',
      '清蒸鱼',
      '煎鱼',
      '烤鱼',
    ],
  },
  seafood: {
    ingredientKeywords: [
      '海鲜',
      '虾',
      '虾仁',
      '蟹',
      '蟹肉',
      '鱿鱼',
      '墨鱼',
      '章鱼',
      '贝',
      '蛤蜊',
      '扇贝',
      '牡蛎',
      '海参',
    ],
    textKeywords: ['海鲜', '虾仁', '蟹肉', '鱿鱼', '扇贝', '牡蛎', '海参'],
  },
  beef: {
    ingredientKeywords: ['牛肉'],
    textKeywords: ['牛肉'],
  },
  pork: {
    ingredientKeywords: ['猪肉', '里脊', '五花肉', '排骨', '培根', '火腿'],
    textKeywords: ['猪肉', '里脊', '五花肉', '排骨', '培根', '火腿'],
  },
  poultry: {
    ingredientKeywords: ['鸡肉', '鸡胸肉', '鸡腿', '鸡翅', '鸭肉', '火鸡'],
    textKeywords: ['鸡胸肉', '鸡腿', '鸡肉', '鸭肉', '火鸡'],
  },
  mutton: {
    ingredientKeywords: ['羊肉'],
    textKeywords: ['羊肉'],
  },
  offal: {
    ingredientKeywords: ['内脏', '肝', '腰', '肚', '心', '肠', '血'],
    textKeywords: ['内脏', '猪肝', '鸡肝', '肥肠', '毛肚', '鸭血'],
  },
  dairy: {
    ingredientKeywords: ['牛奶', '酸奶', '奶酪', '芝士', '黄油', '奶油'],
    textKeywords: ['牛奶', '酸奶', '奶酪', '芝士', '黄油', '奶油'],
  },
  egg: {
    ingredientKeywords: ['鸡蛋', '蛋'],
    textKeywords: ['鸡蛋', '蛋白', '蛋黄'],
  },
  nut: {
    ingredientKeywords: ['坚果', '花生', '核桃', '杏仁', '腰果'],
    textKeywords: ['坚果', '花生', '核桃', '杏仁', '腰果'],
  },
  soy: {
    ingredientKeywords: ['豆腐', '豆浆', '黄豆', '毛豆', '豆皮'],
    textKeywords: ['豆腐', '豆浆', '黄豆', '毛豆', '豆皮'],
  },
  gluten: {
    ingredientKeywords: ['面包', '面条', '面', '意面', '吐司', '全麦'],
    textKeywords: ['面包', '面条', '意面', '吐司', '全麦'],
  },
};

const PREFERENCE_RULES: Array<{ triggers: string[]; blockedTags: string[] }> = [
  { triggers: ['鱼类', '鱼肉', '不吃鱼', '鱼', 'fish'], blockedTags: ['fish'] },
  { triggers: ['海鲜', '海产', '河鲜', 'seafood', '贝类'], blockedTags: ['fish', 'seafood'] },
  { triggers: ['牛肉', 'beef'], blockedTags: ['beef'] },
  { triggers: ['猪肉', 'pork'], blockedTags: ['pork'] },
  { triggers: ['鸡肉', '鸡', '禽类', 'poultry'], blockedTags: ['poultry'] },
  { triggers: ['羊肉', 'mutton', 'lamb'], blockedTags: ['mutton'] },
  { triggers: ['内脏', 'offal'], blockedTags: ['offal'] },
  { triggers: ['乳制品', '奶', 'dairy', 'milk'], blockedTags: ['dairy'] },
  { triggers: ['鸡蛋', '蛋类', 'egg'], blockedTags: ['egg'] },
  { triggers: ['坚果', '花生', 'nut'], blockedTags: ['nut'] },
  { triggers: ['豆制品', 'soy', '大豆'], blockedTags: ['soy'] },
  { triggers: ['麸质', 'gluten'], blockedTags: ['gluten'] },
  {
    triggers: ['纯素', 'vegan'],
    blockedTags: ['beef', 'pork', 'poultry', 'mutton', 'fish', 'seafood', 'offal', 'dairy', 'egg'],
  },
  {
    triggers: ['素食', 'vegetarian', '不吃肉'],
    blockedTags: ['beef', 'pork', 'poultry', 'mutton', 'fish', 'seafood', 'offal'],
  },
];

const TERM_EXPANSIONS: Record<string, string[]> = {
  鱼类: ['鱼'],
  鱼肉: ['鱼'],
  河鲜: ['海鲜', '鱼'],
  海产: ['海鲜'],
  海鲜: ['海鲜', '鱼', '虾', '虾仁', '蟹', '扇贝', '牡蛎'],
  贝类: ['贝', '蛤蜊', '扇贝', '牡蛎'],
  牛羊肉: ['牛肉', '羊肉'],
  猪牛羊: ['猪肉', '牛肉', '羊肉'],
  肉类: ['牛肉', '猪肉', '鸡肉', '羊肉', '鱼', '海鲜'],
  葱姜蒜: ['葱', '姜', '姜片', '蒜', '蒜末', '大蒜'],
  葱蒜: ['葱', '蒜', '蒜末', '大蒜'],
  辛辣: ['辣', '辣椒', '小米辣', '剁椒', '辣酱'],
  辣: ['辣', '辣椒', '小米辣', '剁椒', '辣酱'],
  奶制品: ['乳制品', '牛奶', '酸奶', '奶酪', '芝士', '黄油', '奶油'],
  乳糖: ['乳制品', '牛奶', '酸奶', '奶酪', '芝士', '黄油', '奶油'],
  豆制品: ['豆腐', '豆浆', '黄豆', '毛豆', '豆皮'],
  坚果类: ['坚果', '花生', '核桃', '杏仁', '腰果'],
  蛋类: ['鸡蛋', '蛋'],
};

const RECIPE_TEMPLATES: RecipeTemplate[] = [
  {
    meal_type: '早餐',
    title: '希腊酸奶燕麦莓果碗',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '希腊酸奶', quantity: '220', unit: '克' },
      { name: '燕麦', quantity: '45', unit: '克' },
      { name: '蓝莓', quantity: '80', unit: '克' },
      { name: '奇亚籽', quantity: '10', unit: '克' },
    ],
    steps: ['将燕麦与酸奶拌匀。', '加入蓝莓和奇亚籽。', '冷藏 5 分钟后食用。'],
    cook_time_minutes: 8,
    goals: ['lose', 'maintain'],
    tags: ['dairy'],
  },
  {
    meal_type: '早餐',
    title: '小米南瓜粥配水煮鸡蛋',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '小米', quantity: '60', unit: '克' },
      { name: '南瓜', quantity: '120', unit: '克' },
      { name: '鸡蛋', quantity: '2', unit: '个' },
    ],
    steps: ['小米淘洗干净。', '南瓜切块与小米同煮。', '另起锅煮鸡蛋后搭配食用。'],
    cook_time_minutes: 20,
    goals: ['lose', 'maintain'],
    tags: ['egg'],
  },
  {
    meal_type: '早餐',
    title: '全麦鸡胸三明治配奇异果',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '全麦吐司', quantity: '2', unit: '片' },
      { name: '鸡胸肉', quantity: '90', unit: '克' },
      { name: '生菜', quantity: '40', unit: '克' },
      { name: '奇异果', quantity: '1', unit: '个' },
    ],
    steps: ['鸡胸肉煎熟后切片。', '将鸡胸肉与生菜夹入吐司。', '搭配奇异果一起食用。'],
    cook_time_minutes: 15,
    goals: ['lose', 'maintain', 'gain'],
    tags: ['poultry', 'gluten'],
  },
  {
    meal_type: '早餐',
    title: '牛油果牛肉卷配玉米杯',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '牛肉片', quantity: '100', unit: '克' },
      { name: '牛油果', quantity: '80', unit: '克' },
      { name: '玉米粒', quantity: '100', unit: '克' },
      { name: '全麦卷饼', quantity: '1', unit: '张' },
    ],
    steps: ['牛肉片快速煎熟。', '将牛油果和牛肉卷入卷饼。', '玉米粒蒸熟后装杯搭配食用。'],
    cook_time_minutes: 18,
    goals: ['gain', 'maintain'],
    tags: ['beef', 'gluten'],
  },
  {
    meal_type: '早餐',
    title: '豆腐藜麦时蔬能量碗',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '北豆腐', quantity: '160', unit: '克' },
      { name: '藜麦', quantity: '60', unit: '克' },
      { name: '彩椒', quantity: '80', unit: '克' },
      { name: '菠菜', quantity: '80', unit: '克' },
    ],
    steps: ['藜麦煮熟备用。', '豆腐煎至微黄。', '与彩椒菠菜一起装碗即可。'],
    cook_time_minutes: 18,
    goals: ['lose', 'maintain', 'gain'],
    tags: ['soy', 'vegetarian', 'vegan'],
  },
  {
    meal_type: '早餐',
    title: '香蕉花生酱燕麦杯',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '燕麦', quantity: '55', unit: '克' },
      { name: '香蕉', quantity: '1', unit: '根' },
      { name: '花生酱', quantity: '18', unit: '克' },
      { name: '牛奶', quantity: '200', unit: '毫升' },
    ],
    steps: ['燕麦与牛奶混合加热。', '加入香蕉片。', '淋上花生酱后食用。'],
    cook_time_minutes: 10,
    goals: ['gain', 'maintain'],
    tags: ['nut', 'dairy'],
  },
  {
    meal_type: '午餐',
    title: '香煎鸡胸藜麦时蔬碗',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '鸡胸肉', quantity: '180', unit: '克' },
      { name: '藜麦', quantity: '80', unit: '克' },
      { name: '西兰花', quantity: '120', unit: '克' },
      { name: '胡萝卜', quantity: '80', unit: '克' },
    ],
    steps: ['鸡胸肉煎至熟透。', '藜麦煮熟备用。', '西兰花和胡萝卜焯水后一起装碗。'],
    cook_time_minutes: 25,
    goals: ['lose', 'maintain'],
    tags: ['poultry'],
  },
  {
    meal_type: '午餐',
    title: '清蒸鲈鱼配糙米西兰花',
    cuisine_type: '粤菜',
    ingredients: [
      { name: '鲈鱼', quantity: '220', unit: '克' },
      { name: '糙米', quantity: '90', unit: '克' },
      { name: '西兰花', quantity: '150', unit: '克' },
      { name: '姜片', quantity: '3', unit: '片' },
    ],
    steps: ['鲈鱼铺上姜片蒸熟。', '糙米煮熟备用。', '西兰花焯水后与鲈鱼一起装盘。'],
    cook_time_minutes: 28,
    goals: ['maintain', 'gain'],
    tags: ['fish'],
  },
  {
    meal_type: '午餐',
    title: '黑椒牛肉彩椒意面',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '牛肉', quantity: '180', unit: '克' },
      { name: '全麦意面', quantity: '90', unit: '克' },
      { name: '彩椒', quantity: '120', unit: '克' },
      { name: '洋葱', quantity: '60', unit: '克' },
    ],
    steps: ['意面煮熟备用。', '牛肉与洋葱炒香。', '加入彩椒和意面翻匀。'],
    cook_time_minutes: 25,
    goals: ['gain', 'maintain'],
    tags: ['beef', 'gluten'],
  },
  {
    meal_type: '午餐',
    title: '番茄豆腐杂粮饭',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '北豆腐', quantity: '180', unit: '克' },
      { name: '番茄', quantity: '180', unit: '克' },
      { name: '杂粮饭', quantity: '120', unit: '克' },
      { name: '毛豆', quantity: '80', unit: '克' },
    ],
    steps: ['番茄炒出汁水。', '加入豆腐和毛豆炖煮。', '搭配杂粮饭装盘即可。'],
    cook_time_minutes: 22,
    goals: ['lose', 'maintain', 'gain'],
    tags: ['soy', 'vegetarian', 'vegan'],
  },
  {
    meal_type: '午餐',
    title: '孜然鸡腿藜麦沙拉',
    cuisine_type: '湘菜',
    ingredients: [
      { name: '鸡腿肉', quantity: '180', unit: '克' },
      { name: '藜麦', quantity: '70', unit: '克' },
      { name: '生菜', quantity: '120', unit: '克' },
      { name: '黄瓜', quantity: '80', unit: '克' },
    ],
    steps: ['鸡腿肉撒孜然煎熟。', '藜麦煮熟后放凉。', '与生菜黄瓜一起拌匀装盘。'],
    cook_time_minutes: 24,
    goals: ['lose', 'maintain'],
    tags: ['poultry'],
  },
  {
    meal_type: '午餐',
    title: '三文鱼牛油果能量饭',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '三文鱼', quantity: '180', unit: '克' },
      { name: '牛油果', quantity: '80', unit: '克' },
      { name: '糙米饭', quantity: '130', unit: '克' },
      { name: '芦笋', quantity: '100', unit: '克' },
    ],
    steps: ['三文鱼煎至表面金黄。', '糙米饭盛入碗中。', '加入牛油果和芦笋装盘即可。'],
    cook_time_minutes: 22,
    goals: ['gain', 'maintain'],
    tags: ['fish'],
  },
  {
    meal_type: '晚餐',
    title: '蒜香虾仁西葫芦面',
    cuisine_type: '粤菜',
    ingredients: [
      { name: '虾仁', quantity: '160', unit: '克' },
      { name: '西葫芦', quantity: '180', unit: '克' },
      { name: '蒜末', quantity: '1', unit: '勺' },
      { name: '番茄', quantity: '120', unit: '克' },
    ],
    steps: ['虾仁炒至变色。', '西葫芦刨丝快速翻炒。', '加入番茄丁调味后装盘。'],
    cook_time_minutes: 18,
    goals: ['lose', 'maintain'],
    tags: ['seafood'],
  },
  {
    meal_type: '晚餐',
    title: '香菇鸡胸肉炒青菜',
    cuisine_type: '川菜',
    ingredients: [
      { name: '鸡胸肉', quantity: '180', unit: '克' },
      { name: '香菇', quantity: '100', unit: '克' },
      { name: '青菜', quantity: '180', unit: '克' },
      { name: '蒜末', quantity: '1', unit: '勺' },
    ],
    steps: ['鸡胸肉切片腌制片刻。', '热锅下蒜末爆香后翻炒鸡胸肉。', '加入香菇和青菜炒至断生。'],
    cook_time_minutes: 20,
    goals: ['lose', 'maintain'],
    tags: ['poultry'],
  },
  {
    meal_type: '晚餐',
    title: '土豆炖牛肉配西芹',
    cuisine_type: '鲁菜',
    ingredients: [
      { name: '牛肉', quantity: '180', unit: '克' },
      { name: '土豆', quantity: '150', unit: '克' },
      { name: '西芹', quantity: '100', unit: '克' },
      { name: '胡萝卜', quantity: '80', unit: '克' },
    ],
    steps: ['牛肉焯水后炖煮。', '加入土豆和胡萝卜继续炖软。', '起锅前加入西芹段翻匀。'],
    cook_time_minutes: 35,
    goals: ['gain', 'maintain'],
    tags: ['beef'],
  },
  {
    meal_type: '晚餐',
    title: '豆腐毛豆炒时蔬',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '北豆腐', quantity: '180', unit: '克' },
      { name: '毛豆', quantity: '100', unit: '克' },
      { name: '西兰花', quantity: '120', unit: '克' },
      { name: '彩椒', quantity: '80', unit: '克' },
    ],
    steps: ['豆腐切块煎至表面微黄。', '加入毛豆和彩椒翻炒。', '放入西兰花炒匀后装盘。'],
    cook_time_minutes: 18,
    goals: ['lose', 'maintain', 'gain'],
    tags: ['soy', 'vegetarian', 'vegan'],
  },
  {
    meal_type: '晚餐',
    title: '照烧鸡腿饭配羽衣甘蓝',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '鸡腿肉', quantity: '180', unit: '克' },
      { name: '米饭', quantity: '120', unit: '克' },
      { name: '羽衣甘蓝', quantity: '100', unit: '克' },
      { name: '胡萝卜', quantity: '70', unit: '克' },
    ],
    steps: ['鸡腿肉煎熟后淋少量照烧汁。', '米饭盛盘备用。', '将羽衣甘蓝和胡萝卜快速翻炒后搭配装盘。'],
    cook_time_minutes: 22,
    goals: ['gain', 'maintain'],
    tags: ['poultry'],
  },
  {
    meal_type: '晚餐',
    title: '番茄鳕鱼豆腐煲',
    cuisine_type: '苏菜',
    ingredients: [
      { name: '鳕鱼', quantity: '180', unit: '克' },
      { name: '嫩豆腐', quantity: '160', unit: '克' },
      { name: '番茄', quantity: '180', unit: '克' },
      { name: '金针菇', quantity: '80', unit: '克' },
    ],
    steps: ['番茄炒软后加少量清水。', '放入鳕鱼和豆腐小火炖煮。', '加入金针菇煮熟后即可。'],
    cook_time_minutes: 24,
    goals: ['lose', 'maintain'],
    tags: ['fish', 'soy'],
  },
  {
    meal_type: '加餐',
    title: '无糖酸奶苹果坚果杯',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '无糖酸奶', quantity: '200', unit: '克' },
      { name: '苹果', quantity: '1', unit: '个' },
      { name: '坚果碎', quantity: '15', unit: '克' },
    ],
    steps: ['苹果切丁。', '酸奶装杯。', '加入苹果丁和坚果碎即可。'],
    cook_time_minutes: 5,
    goals: ['lose', 'maintain'],
    tags: ['dairy', 'nut'],
  },
  {
    meal_type: '加餐',
    title: '毛豆玉米杯',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '毛豆', quantity: '100', unit: '克' },
      { name: '玉米粒', quantity: '90', unit: '克' },
      { name: '小番茄', quantity: '80', unit: '克' },
    ],
    steps: ['毛豆煮熟后沥干。', '将玉米粒和小番茄装杯。', '与毛豆混合即可食用。'],
    cook_time_minutes: 8,
    goals: ['lose', 'maintain', 'gain'],
    tags: ['soy', 'vegetarian', 'vegan'],
  },
  {
    meal_type: '加餐',
    title: '香蕉花生酱全麦吐司',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '全麦吐司', quantity: '2', unit: '片' },
      { name: '香蕉', quantity: '1', unit: '根' },
      { name: '花生酱', quantity: '18', unit: '克' },
    ],
    steps: ['吐司轻烤至温热。', '抹上花生酱。', '铺上香蕉片即可食用。'],
    cook_time_minutes: 6,
    goals: ['gain', 'maintain'],
    tags: ['nut', 'gluten'],
  },
  {
    meal_type: '加餐',
    title: '低糖奶酪全麦饼干',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '低糖奶酪', quantity: '40', unit: '克' },
      { name: '全麦饼干', quantity: '4', unit: '片' },
      { name: '黄瓜', quantity: '80', unit: '克' },
    ],
    steps: ['全麦饼干摆盘。', '奶酪切块搭配摆放。', '加入黄瓜条即可。'],
    cook_time_minutes: 5,
    goals: ['maintain', 'gain'],
    tags: ['dairy', 'gluten'],
  },
  {
    meal_type: '加餐',
    title: '椰香奇亚籽布丁',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '椰乳', quantity: '180', unit: '毫升' },
      { name: '奇亚籽', quantity: '18', unit: '克' },
      { name: '草莓', quantity: '80', unit: '克' },
    ],
    steps: ['奇亚籽加入椰乳中浸泡。', '冷藏至凝固。', '加入草莓切片即可。'],
    cook_time_minutes: 8,
    goals: ['lose', 'maintain'],
    tags: ['vegan'],
  },
  {
    meal_type: '加餐',
    title: '蛋白奶昔配蓝莓',
    cuisine_type: '家常菜',
    ingredients: [
      { name: '高蛋白酸奶', quantity: '220', unit: '克' },
      { name: '蓝莓', quantity: '80', unit: '克' },
      { name: '燕麦', quantity: '25', unit: '克' },
    ],
    steps: ['将高蛋白酸奶倒入杯中。', '加入燕麦和蓝莓。', '拌匀后即可食用。'],
    cook_time_minutes: 5,
    goals: ['lose', 'maintain', 'gain'],
    tags: ['dairy'],
  },
];

export interface RecipeNutrition {
  calories: number;
  protein: number;
  carbohydrate: number;
  fat: number;
  fiber: number;
}

export interface DailyRecipeItem {
  id: string;
  meal_type: MealType;
  title: string;
  cuisine_type: CuisineType;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  nutrition: RecipeNutrition;
  cook_time_minutes: number;
  date?: string;
  plan_id?: string;
  user_id?: string;
  is_favorite?: boolean;
  generation_meta?: RecipeGenerationMeta;
}

export interface DailyRecipePlan {
  id: string;
  user_id: string;
  plan_id: string;
  date: string;
  meals: DailyRecipeItem[];
  total_calories: number;
  target_calories: number;
  generation_meta?: RecipeGenerationMeta;
}

export interface RecipeService {
  generateDailyRecipe(userId: string, date: string): Promise<DailyRecipePlan>;
  getDailyRecipe(userId: string, date: string): DailyRecipePlan | null;
  getTodayRecipe(userId: string): DailyRecipePlan | null;
  listDailyRecipes(userId: string): DailyRecipePlan[];
  getRecipe(userId: string, recipeId: string): DailyRecipeItem | null;
  generateRecipesFromIngredients(
    userId: string,
    ingredients: string[],
    meals: number,
  ): Promise<DailyRecipeItem[]>;
  favoriteRecipe(userId: string, recipeId: string): DailyRecipeItem;
  unfavoriteRecipe(userId: string, recipeId: string): void;
  listFavorites(userId: string): DailyRecipeItem[];
  swapRecipe(userId: string, recipeId: string): Promise<DailyRecipeItem>;
}

export class RecipeError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'RecipeError';
  }
}

export function createRecipeService(
  planService: PlanService,
  aiService: AIServerService,
  userService: UserService,
): RecipeService & { hydrate?(): Promise<void> } {
  const dailyRecipes = new Map<string, DailyRecipePlan[]>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      const recipeRows = await db.select().from(recipes);
      const planRows = await db.select().from(plans);
      const plansById = new Map(planRows.map((plan) => [plan.id, plan]));
      dailyRecipes.clear();

      for (const row of recipeRows) {
        const planRecord = plansById.get(row.plan_id);
        if (!planRecord) {
          continue;
        }

        const userPlans = dailyRecipes.get(planRecord.user_id) ?? [];
        const userPlan = userPlans.find(
          (plan) => plan.plan_id === row.plan_id && plan.date === row.date,
        );
        const meal = mapRecipeRow(row);

        if (userPlan) {
          userPlan.meals.push(meal);
          userPlan.total_calories += meal.nutrition.calories;
          continue;
        }

        const nextPlan: DailyRecipePlan = {
          id: `${row.plan_id}:${row.date}`,
          user_id: planRecord.user_id,
          plan_id: row.plan_id,
          date: row.date,
          meals: [meal],
          total_calories: meal.nutrition.calories,
          target_calories: planRecord.daily_calorie_target,
        };

        userPlans.push(nextPlan);
        dailyRecipes.set(planRecord.user_id, userPlans);
      }
    },

    async generateDailyRecipe(userId, date) {
      const plan = planService.getCurrentPlan(userId);
      const profile = userService.getProfile(userId);
      if (!plan) {
        throw new RecipeError(409, '请先生成饮食计划，再生成今日食谱');
      }

      const existingPlan = findDailyRecipe(dailyRecipes, userId, date);
      const excludedTitlesByMeal = groupTitlesByMeal(existingPlan?.meals ?? []);
      const fallbackPlan = buildRecipePlan(userId, plan, date, profile, excludedTitlesByMeal);
      const prompt = buildRecipePrompt(plan, profile, date, {
        excludedTitles: excludedTitlesByMeal,
      });
      const aiResponse = await aiService.chatForUser(userId, [{ role: 'user', content: prompt }], {
        mockResponse: JSON.stringify({
          meals: fallbackPlan.meals.map(serializeMealForAI),
        }),
      });

      const parsedPlan = parseDailyRecipePlan(
        aiResponse.content,
        fallbackPlan,
        compileFoodPreferences(profile),
        excludedTitlesByMeal,
      );
      const generationMeta = createGenerationMeta(aiResponse, {
        usedFallback: parsedPlan.usedFallback,
        acceptedCount: parsedPlan.acceptedCount,
        totalCount: parsedPlan.totalCount,
      });
      const recipePlan = attachPlanGenerationMeta(parsedPlan.plan, generationMeta);
      const existing = dailyRecipes.get(userId) ?? [];
      const withoutSameDate = existing.filter((entry) => entry.date !== date);
      dailyRecipes.set(userId, [recipePlan, ...withoutSameDate]);
      persistRecipePlan(recipePlan);

      return recipePlan;
    },

    getDailyRecipe(userId, date) {
      return findDailyRecipe(dailyRecipes, userId, date);
    },

    getTodayRecipe(userId) {
      const today = new Date().toISOString().slice(0, 10);
      return findDailyRecipe(dailyRecipes, userId, today);
    },

    listDailyRecipes(userId) {
      return dailyRecipes.get(userId) ?? [];
    },

    getRecipe(userId, recipeId) {
      const dailyPlans = dailyRecipes.get(userId) ?? [];

      for (const dailyPlan of dailyPlans) {
        const match = dailyPlan.meals.find((meal) => meal.id === recipeId);
        if (match) {
          return match;
        }
      }

      return null;
    },

    async generateRecipesFromIngredients(userId, ingredients, meals) {
      if (ingredients.length === 0) {
        throw new RecipeError(400, 'Ingredients are required');
      }

      const plan = planService.getCurrentPlan(userId);
      if (!plan) {
        throw new RecipeError(409, '请先生成饮食计划，再根据食材生成食谱');
      }

      const normalizedIngredients = ingredients
        .map((ingredient) => ingredient.trim())
        .filter(Boolean);
      const prompt = `Generate ${meals} Chinese recipes using these ingredients as much as possible: ${normalizedIngredients.join(', ')}. Goal calories: ${plan.daily_calorie_target}.`;
      await aiService.chatForUser(userId, [{ role: 'user', content: prompt }], {
        mockResponse: `Recipes from ingredients: ${normalizedIngredients.join(', ')}`,
      });

      return createRecipesFromIngredients(normalizedIngredients, meals, plan.daily_calorie_target);
    },

    favoriteRecipe(userId, recipeId) {
      const recipe = this.getRecipe(userId, recipeId);
      if (!recipe) {
        throw new RecipeError(404, 'Recipe not found');
      }

      recipe.is_favorite = true;
      persistRecipeFavorite(recipeId, true);
      return recipe;
    },

    unfavoriteRecipe(userId, recipeId) {
      const recipe = this.getRecipe(userId, recipeId);
      if (!recipe) {
        return;
      }

      recipe.is_favorite = false;
      persistRecipeFavorite(recipeId, false);
    },

    listFavorites(userId) {
      return (dailyRecipes.get(userId) ?? [])
        .flatMap((plan) => plan.meals)
        .filter((recipe) => recipe.is_favorite);
    },

    async swapRecipe(userId, recipeId) {
      const dailyPlans = dailyRecipes.get(userId) ?? [];
      const profile = userService.getProfile(userId);

      for (const dailyPlan of dailyPlans) {
        const index = dailyPlan.meals.findIndex((meal) => meal.id === recipeId);
        if (index === -1) {
          continue;
        }

        const existing = dailyPlan.meals[index];
        const plan =
          planService.getPlan(userId, dailyPlan.plan_id) ?? planService.getCurrentPlan(userId);
        const planContext = toRecipePlanContext(plan, dailyPlan.target_calories);
        const excludedTitles = dailyPlan.meals
          .filter((meal) => meal.meal_type === existing.meal_type)
          .map((meal) => meal.title);
        const fallbackReplacement = buildSwapRecipe(
          existing,
          planContext,
          profile,
          excludedTitles,
        );

        const aiResponse = await aiService.chatForUser(
          userId,
          [
            {
              role: 'user',
              content: buildSwapRecipePrompt(
                plan ?? toFallbackDietPlanRecord(dailyPlan.target_calories),
                profile,
                {
                  date: dailyPlan.date,
                  meal_type: existing.meal_type,
                  title: existing.title,
                  cuisine_type: existing.cuisine_type,
                  calories: existing.nutrition.calories,
                  ingredients: existing.ingredients.map((ingredient) => ingredient.name),
                },
                { excludedTitles },
              ),
            },
          ],
          {
            mockResponse: JSON.stringify({
              recipe: serializeMealForAI(fallbackReplacement),
            }),
          },
        );

        const parsedSwap = parseSwapRecipe(
          aiResponse.content,
          fallbackReplacement,
          existing,
          compileFoodPreferences(profile),
          excludedTitles,
        );
        const replacement = attachMealGenerationMeta(
          parsedSwap.recipe,
          createGenerationMeta(aiResponse, {
            usedFallback: parsedSwap.usedFallback,
            acceptedCount: parsedSwap.usedFallback ? 0 : 1,
            totalCount: 1,
          }),
        );

        replacement.date = dailyPlan.date;
        replacement.plan_id = dailyPlan.plan_id;
        replacement.user_id = userId;
        dailyPlan.meals[index] = replacement;
        dailyPlan.total_calories = dailyPlan.meals.reduce(
          (sum, meal) => sum + meal.nutrition.calories,
          0,
        );
        persistRecipeSwap(dailyPlan.plan_id, dailyPlan.date, recipeId, replacement);
        return replacement;
      }

      throw new RecipeError(404, 'Recipe not found');
    },
  };
}

function persistRecipePlan(recipePlan: DailyRecipePlan) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db
      .delete(recipes)
      .where(and(eq(recipes.plan_id, recipePlan.plan_id), eq(recipes.date, recipePlan.date)));
    await db.insert(recipes).values(
      recipePlan.meals.map((meal) => ({
        id: meal.id,
        plan_id: recipePlan.plan_id,
        date: recipePlan.date,
        meal_type: meal.meal_type,
        title: meal.title,
        cuisine_type: meal.cuisine_type,
        ingredients: meal.ingredients,
        steps: meal.steps,
        nutrition: meal.nutrition,
        cook_time_minutes: meal.cook_time_minutes,
        is_favorite: meal.is_favorite ?? false,
      })),
    );
  })();
}

function persistRecipeFavorite(recipeId: string, isFavorite: boolean) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void db.update(recipes).set({ is_favorite: isFavorite }).where(eq(recipes.id, recipeId));
}

function persistRecipeSwap(
  planId: string,
  date: string,
  recipeId: string,
  replacement: DailyRecipeItem,
) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db.delete(recipes).where(eq(recipes.id, recipeId));
    await db.insert(recipes).values({
      id: replacement.id,
      plan_id: planId,
      date,
      meal_type: replacement.meal_type,
      title: replacement.title,
      cuisine_type: replacement.cuisine_type,
      ingredients: replacement.ingredients,
      steps: replacement.steps,
      nutrition: replacement.nutrition,
      cook_time_minutes: replacement.cook_time_minutes,
      is_favorite: replacement.is_favorite ?? false,
    });
  })();
}

function mapRecipeRow(row: typeof recipes.$inferSelect): DailyRecipeItem {
  return {
    id: row.id,
    meal_type: row.meal_type as DailyRecipeItem['meal_type'],
    title: row.title,
    cuisine_type: row.cuisine_type as DailyRecipeItem['cuisine_type'],
    ingredients: row.ingredients as DailyRecipeItem['ingredients'],
    steps: row.steps as DailyRecipeItem['steps'],
    nutrition: row.nutrition as RecipeNutrition,
    cook_time_minutes: row.cook_time_minutes,
    date: row.date,
    plan_id: row.plan_id,
    is_favorite: row.is_favorite,
  };
}

function buildSwapRecipe(
  existing: DailyRecipeItem,
  planContext: RecipePlanContext,
  profile: ProfileResponse | null,
  excludedTitles: string[],
): DailyRecipeItem {
  const preferences = compileFoodPreferences(profile);
  const template = selectTemplate({
    mealType: existing.meal_type,
    goal: planContext.goal,
    preferences,
    excludedTitles,
    seed: hashString(
      `${existing.id}:${existing.meal_type}:${excludedTitles.join('|')}:${existing.title}`,
    ),
  });

  return createMealFromTemplate(template, existing.nutrition.calories, planContext.macro_ratio, {
    date: existing.date,
    planId: existing.plan_id,
    userId: existing.user_id,
  });
}

function createRecipesFromIngredients(
  ingredients: string[],
  meals: number,
  targetCalories: number,
): DailyRecipeItem[] {
  return Array.from({ length: meals }, (_, index) => {
    const selectedIngredients = ingredients.slice(0, Math.max(2, Math.ceil(ingredients.length / 2)));
    const calories = Math.round(targetCalories / Math.max(1, meals));

    return {
      id: randomUUID(),
      meal_type: index === 0 ? '午餐' : '晚餐',
      title: `现有食材快手餐 ${index + 1}`,
      cuisine_type: '家常菜',
      ingredients: selectedIngredients.map((ingredient) => ({
        name: ingredient,
        quantity: ingredient === '大蒜' ? '1' : '120',
        unit: ingredient === '大蒜' ? '勺' : '克',
      })),
      steps: [
        { order: 1, instruction: '将现有食材清洗切配备用。' },
        { order: 2, instruction: '按耐熟程度先后下锅翻炒或炖煮。' },
        { order: 3, instruction: '少油少盐调味后装盘即可。' },
      ],
      nutrition: calculateNutrition(calories, defaultMacroRatio('maintain')),
      cook_time_minutes: 20,
      is_favorite: false,
    };
  });
}

function buildRecipePlan(
  userId: string,
  plan: DietPlanRecord,
  date: string,
  profile: ProfileResponse | null,
  excludedTitlesByMeal: ExcludedTitlesByMeal = {},
): DailyRecipePlan {
  const planContext = toRecipePlanContext(plan, plan.daily_calorie_target);
  const preferences = compileFoodPreferences(profile);
  const mealCalories = getMealCalorieTargets(planContext.daily_calorie_target, planContext.goal);
  const meals = MEAL_ORDER.map((mealType) => {
    const template = selectTemplate({
      mealType,
      goal: planContext.goal,
      preferences,
      excludedTitles: excludedTitlesByMeal[mealType] ?? [],
      seed: hashString(
        `${userId}:${plan.id}:${date}:${mealType}:${(excludedTitlesByMeal[mealType] ?? []).join('|')}`,
      ),
    });

    return createMealFromTemplate(template, mealCalories[mealType], planContext.macro_ratio, {
      date,
      planId: plan.id,
      userId,
    });
  });
  const total_calories = meals.reduce((sum, meal) => sum + meal.nutrition.calories, 0);

  return {
    id: `${plan.id}:${date}`,
    user_id: userId,
    plan_id: plan.id,
    date,
    meals,
    total_calories,
    target_calories: planContext.daily_calorie_target,
  };
}

function parseDailyRecipePlan(
  content: string,
  fallbackPlan: DailyRecipePlan,
  preferences: CompiledFoodPreferences,
  excludedTitlesByMeal: ExcludedTitlesByMeal,
): { plan: DailyRecipePlan; usedFallback: boolean; acceptedCount: number; totalCount: number } {
  const parsed = parseJsonResponse(content);
  if (!parsed || !Array.isArray(parsed.meals)) {
    return { plan: fallbackPlan, usedFallback: true, acceptedCount: 0, totalCount: 4 };
  }

  const candidateByMeal = new Map<MealType, unknown>();
  for (const meal of parsed.meals) {
    const mealType = normalizeMealType(readString(meal, 'meal_type'));
    if (mealType && !candidateByMeal.has(mealType)) {
      candidateByMeal.set(mealType, meal);
    }
  }

  let usedFallback = false;
  let acceptedCount = 0;
  const meals = fallbackPlan.meals.map((fallbackMeal) => {
    const meal = sanitizeCandidateMeal(
      candidateByMeal.get(fallbackMeal.meal_type),
      fallbackMeal,
      preferences,
      excludedTitlesByMeal[fallbackMeal.meal_type] ?? [],
    );
    if (meal === fallbackMeal) {
      usedFallback = true;
    } else {
      acceptedCount += 1;
    }

    return meal;
  });

  return {
    plan: {
      ...fallbackPlan,
      meals,
      total_calories: meals.reduce((sum, meal) => sum + meal.nutrition.calories, 0),
    },
    usedFallback,
    acceptedCount,
    totalCount: fallbackPlan.meals.length,
  };
}

function parseSwapRecipe(
  content: string,
  fallbackRecipe: DailyRecipeItem,
  existingRecipe: DailyRecipeItem,
  preferences: CompiledFoodPreferences,
  excludedTitles: string[],
): { recipe: DailyRecipeItem; usedFallback: boolean } {
  const parsed = parseJsonResponse(content);
  const rawRecipe =
    parsed && typeof parsed === 'object' && 'recipe' in parsed ? parsed.recipe : parsed;
  const candidate = sanitizeCandidateMeal(rawRecipe, fallbackRecipe, preferences, excludedTitles);

  if (!areMealsMateriallyDifferent(candidate, existingRecipe)) {
    return { recipe: fallbackRecipe, usedFallback: true };
  }

  return { recipe: candidate, usedFallback: candidate === fallbackRecipe };
}

function sanitizeCandidateMeal(
  candidate: unknown,
  fallbackMeal: DailyRecipeItem,
  preferences: CompiledFoodPreferences,
  excludedTitles: string[],
): DailyRecipeItem {
  if (!candidate || typeof candidate !== 'object') {
    return fallbackMeal;
  }

  const title = readString(candidate, 'title')?.trim();
  const ingredients = parseIngredients((candidate as Record<string, unknown>).ingredients);
  const steps = parseSteps((candidate as Record<string, unknown>).steps);

  if (!title || !ingredients || !steps) {
    return fallbackMeal;
  }

  const normalizedTitle = normalizeText(title);
  const excludedTitleSet = new Set(excludedTitles.map(normalizeText));
  if (excludedTitleSet.has(normalizedTitle) && normalizedTitle !== normalizeText(fallbackMeal.title)) {
    return fallbackMeal;
  }

  const meal: DailyRecipeItem = {
    ...fallbackMeal,
    title,
    cuisine_type:
      normalizeCuisineType(readString(candidate, 'cuisine_type')) ?? fallbackMeal.cuisine_type,
    ingredients,
    steps,
    cook_time_minutes: parsePositiveInt(
      (candidate as Record<string, unknown>).cook_time_minutes,
      fallbackMeal.cook_time_minutes,
    ),
  };

  return mealViolatesPreferences(meal, preferences) ? fallbackMeal : meal;
}

function serializeMealForAI(meal: DailyRecipeItem) {
  return {
    meal_type: meal.meal_type,
    title: meal.title,
    cuisine_type: meal.cuisine_type,
    ingredients: meal.ingredients,
    steps: meal.steps.map((step) => step.instruction),
    cook_time_minutes: meal.cook_time_minutes,
  };
}

function createGenerationMeta(
  response: { provider: 'openai-compatible' | 'mock'; model: string },
  stats: { usedFallback: boolean; acceptedCount?: number; totalCount?: number },
): RecipeGenerationMeta {
  const acceptedCount = stats.acceptedCount ?? (stats.usedFallback ? 0 : 1);
  const totalCount = stats.totalCount ?? 1;
  const hasAcceptedAiContent = acceptedCount > 0;

  return {
    mode: hasAcceptedAiContent
      ? response.provider === 'openai-compatible'
        ? 'ai'
        : 'mock'
      : 'fallback',
    provider: response.provider,
    model: response.model,
    generated_at: new Date().toISOString(),
    reason:
      stats.usedFallback && acceptedCount < totalCount
        ? acceptedCount > 0
          ? 'ai-response-partially-filtered'
          : 'ai-response-invalid-or-filtered'
        : undefined,
  };
}

function attachPlanGenerationMeta(
  plan: DailyRecipePlan,
  generationMeta: RecipeGenerationMeta,
): DailyRecipePlan {
  return {
    ...plan,
    generation_meta: generationMeta,
    meals: plan.meals.map((meal) => attachMealGenerationMeta(meal, generationMeta)),
  };
}

function attachMealGenerationMeta(
  meal: DailyRecipeItem,
  generationMeta: RecipeGenerationMeta,
): DailyRecipeItem {
  return {
    ...meal,
    generation_meta: generationMeta,
  };
}

function toRecipePlanContext(
  plan: Pick<DietPlanRecord, 'goal' | 'macro_ratio'> | null,
  targetCalories: number,
): RecipePlanContext {
  const goal = normalizeGoal(plan?.goal);

  return {
    goal,
    macro_ratio: plan?.macro_ratio ?? defaultMacroRatio(goal),
    daily_calorie_target: targetCalories,
  };
}

function toFallbackDietPlanRecord(targetCalories: number): DietPlanRecord {
  return {
    id: 'fallback-plan',
    user_id: 'fallback-user',
    goal: 'maintain',
    duration_days: 30,
    status: 'active',
    daily_calorie_target: targetCalories,
    macro_ratio: defaultMacroRatio('maintain'),
    phase_descriptions: [],
    notes: '',
    created_at: new Date().toISOString(),
  };
}

function groupTitlesByMeal(meals: DailyRecipeItem[]): ExcludedTitlesByMeal {
  return meals.reduce<ExcludedTitlesByMeal>((accumulator, meal) => {
    const current = accumulator[meal.meal_type] ?? [];
    current.push(meal.title);
    accumulator[meal.meal_type] = current;
    return accumulator;
  }, {});
}

function findDailyRecipe(
  dailyRecipes: Map<string, DailyRecipePlan[]>,
  userId: string,
  date: string,
): DailyRecipePlan | null {
  return (dailyRecipes.get(userId) ?? []).find((entry) => entry.date === date) ?? null;
}

function selectTemplate(input: {
  mealType: MealType;
  goal: GoalType;
  preferences: CompiledFoodPreferences;
  excludedTitles: string[];
  seed: number;
}): RecipeTemplate {
  const templates = RECIPE_TEMPLATES.filter((template) => template.meal_type === input.mealType);
  const excludedTitleSet = new Set(input.excludedTitles.map(normalizeText));

  const pickFrom = (candidates: RecipeTemplate[]) => {
    if (candidates.length === 0) {
      return null;
    }

    return candidates[input.seed % candidates.length];
  };

  const preferred = templates.filter((template) => template.goals.includes(input.goal));
  const allowedPreferred = preferred.filter(
    (template) =>
      !templateViolatesPreferences(template, input.preferences) &&
      !excludedTitleSet.has(normalizeText(template.title)),
  );
  const allowedAll = templates.filter(
    (template) =>
      !templateViolatesPreferences(template, input.preferences) &&
      !excludedTitleSet.has(normalizeText(template.title)),
  );
  const relaxedPreferred = preferred.filter(
    (template) => !templateViolatesPreferences(template, input.preferences),
  );
  const relaxedAll = templates.filter(
    (template) => !templateViolatesPreferences(template, input.preferences),
  );

  return (
    pickFrom(allowedPreferred) ??
    pickFrom(allowedAll) ??
    pickFrom(relaxedPreferred) ??
    pickFrom(relaxedAll) ??
    templates[0]
  );
}

function createMealFromTemplate(
  template: RecipeTemplate,
  calories: number,
  macroRatio: MacroRatio,
  meta: {
    date?: string;
    planId?: string;
    userId?: string;
  },
): DailyRecipeItem {
  return {
    id: randomUUID(),
    meal_type: template.meal_type,
    title: template.title,
    cuisine_type: template.cuisine_type,
    ingredients: template.ingredients.map((ingredient) => ({ ...ingredient })),
    steps: template.steps.map((instruction, index) => ({ order: index + 1, instruction })),
    nutrition: calculateNutrition(calories, macroRatio),
    cook_time_minutes: template.cook_time_minutes,
    date: meta.date,
    plan_id: meta.planId,
    user_id: meta.userId,
    is_favorite: false,
  };
}

function getMealCalorieTargets(
  targetCalories: number,
  goal: GoalType,
): Record<MealType, number> {
  const ratios =
    goal === 'lose'
      ? { 早餐: 0.28, 午餐: 0.32, 晚餐: 0.28, 加餐: 0.12 }
      : goal === 'gain'
        ? { 早餐: 0.22, 午餐: 0.33, 晚餐: 0.3, 加餐: 0.15 }
        : { 早餐: 0.25, 午餐: 0.35, 晚餐: 0.3, 加餐: 0.1 };

  const breakfast = Math.round(targetCalories * ratios.早餐);
  const lunch = Math.round(targetCalories * ratios.午餐);
  const dinner = Math.round(targetCalories * ratios.晚餐);
  const snack = Math.max(1, targetCalories - breakfast - lunch - dinner);

  return {
    早餐: breakfast,
    午餐: lunch,
    晚餐: dinner,
    加餐: snack,
  };
}

function calculateNutrition(calories: number, macroRatio: MacroRatio): RecipeNutrition {
  const proteinCalories = Math.round(calories * (macroRatio.protein / 100));
  const carbCalories = Math.round(calories * (macroRatio.carbohydrate / 100));
  const fatCalories = Math.max(0, calories - proteinCalories - carbCalories);

  return {
    calories,
    protein: Math.max(1, Math.round(proteinCalories / 4)),
    carbohydrate: Math.max(1, Math.round(carbCalories / 4)),
    fat: Math.max(1, Math.round(fatCalories / 9)),
    fiber: Math.max(3, Math.round(calories / 120)),
  };
}

function defaultMacroRatio(goal: GoalType): MacroRatio {
  switch (goal) {
    case 'lose':
      return { protein: 35, carbohydrate: 35, fat: 30 };
    case 'gain':
      return { protein: 30, carbohydrate: 45, fat: 25 };
    default:
      return { protein: 30, carbohydrate: 40, fat: 30 };
  }
}

function normalizeGoal(goal: string | null | undefined): GoalType {
  if (goal === 'lose' || goal === 'gain') {
    return goal;
  }

  return 'maintain';
}

function parseJsonResponse(content: string): Record<string, unknown> | null {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (!extracted) {
      return null;
    }

    try {
      const parsed = JSON.parse(extracted);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
}

function extractFirstJsonObject(content: string): string | null {
  const startIndex = content.search(/[{[]/);
  if (startIndex === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{' || char === '[') {
      depth += 1;
    } else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(startIndex, index + 1);
      }
    }
  }

  return null;
}

function parseIngredients(value: unknown): RecipeIngredient[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const ingredients = value
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const name = readString(candidate, 'name')?.trim();
      const quantity = readString(candidate, 'quantity')?.trim() ?? stringifyValue(candidate.quantity);
      const unit = readString(candidate, 'unit')?.trim();

      if (!name || !quantity || !unit) {
        return null;
      }

      return { name, quantity, unit };
    })
    .filter((item): item is RecipeIngredient => Boolean(item));

  return ingredients.length >= 2 ? ingredients : null;
}

function parseSteps(value: unknown): RecipeStep[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const steps = value
    .map((item, index) => {
      if (typeof item === 'string') {
        const instruction = item.trim();
        return instruction ? { order: index + 1, instruction } : null;
      }

      if (!item || typeof item !== 'object') {
        return null;
      }

      const candidate = item as Record<string, unknown>;
      const instruction = readString(candidate, 'instruction')?.trim();
      if (!instruction) {
        return null;
      }

      return {
        order: parsePositiveInt(candidate.order, index + 1),
        instruction,
      };
    })
    .filter((item): item is RecipeStep => Boolean(item));

  return steps.length >= 2 ? steps : null;
}

function readString(record: unknown, key: string): string | null {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const value = (record as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }

  return fallback;
}

function stringifyValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  return '';
}

function normalizeMealType(value: string | null): MealType | null {
  if (!value) {
    return null;
  }

  const normalized = normalizeText(value);
  switch (normalized) {
    case '早餐':
    case 'breakfast':
      return '早餐';
    case '午餐':
    case 'lunch':
      return '午餐';
    case '晚餐':
    case 'dinner':
      return '晚餐';
    case '加餐':
    case 'snack':
      return '加餐';
    default:
      return null;
  }
}

function normalizeCuisineType(value: string | null): CuisineType | null {
  if (!value) {
    return null;
  }

  return CUISINE_TYPES.find((item) => item === value) ?? null;
}

function compileFoodPreferences(profile: ProfileResponse | null): CompiledFoodPreferences {
  const blockedTags = new Set<string>();
  const ingredientKeywords = new Set<string>();
  const textKeywords = new Set<string>();
  const terms = [
    ...(profile?.allergies ?? []),
    ...(profile?.dietary_restrictions ?? []),
  ].flatMap(splitPreferenceTerms);

  for (const rawTerm of terms) {
    const expandedTerms = expandPreferenceTerms(rawTerm);
    for (const term of expandedTerms) {
      const normalizedTerm = normalizeText(term);
      if (!normalizedTerm) {
        continue;
      }

      ingredientKeywords.add(normalizedTerm);
      if (normalizedTerm.length > 1) {
        textKeywords.add(normalizedTerm);
      }

      for (const rule of PREFERENCE_RULES) {
        if (rule.triggers.some((trigger) => normalizedTerm.includes(normalizeText(trigger)))) {
          rule.blockedTags.forEach((tag) => blockedTags.add(tag));
        }
      }
    }
  }

  for (const tag of blockedTags) {
    const keywords = TAG_KEYWORDS[tag];
    if (!keywords) {
      continue;
    }

    keywords.ingredientKeywords.forEach((keyword) => ingredientKeywords.add(normalizeText(keyword)));
    keywords.textKeywords.forEach((keyword) => textKeywords.add(normalizeText(keyword)));
  }

  return {
    blockedTags,
    ingredientKeywords: [...ingredientKeywords],
    textKeywords: [...textKeywords],
  };
}

function splitPreferenceTerms(value: string): string[] {
  return value
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function expandPreferenceTerms(value: string): string[] {
  const expanded = new Set<string>();

  for (const rawPart of value.split(/[/|｜&和与及]+/)) {
    const normalizedPart = normalizePreferenceTerm(rawPart);
    if (!normalizedPart) {
      continue;
    }

    expanded.add(normalizedPart);

    const directExpansions = TERM_EXPANSIONS[normalizedPart] ?? [];
    for (const direct of directExpansions) {
      expanded.add(direct);
    }

    for (const [group, aliases] of Object.entries(TERM_EXPANSIONS)) {
      if (normalizedPart !== group && normalizedPart.includes(group)) {
        aliases.forEach((alias) => expanded.add(alias));
      }
    }
  }

  return [...expanded];
}

function normalizePreferenceTerm(value: string): string {
  return value
    .trim()
    .replace(/^(不吃|不碰|不想吃|不能吃|不要|避免|忌口|过敏|对)/, '')
    .replace(/(过敏|忌口)$/g, '')
    .replace(/[（）()]/g, '')
    .trim();
}

function templateViolatesPreferences(
  template: RecipeTemplate,
  preferences: CompiledFoodPreferences,
): boolean {
  if (template.tags.some((tag) => preferences.blockedTags.has(tag))) {
    return true;
  }

  return mealViolatesPreferences(
    {
      title: template.title,
      ingredients: template.ingredients,
      steps: template.steps.map((instruction, index) => ({ order: index + 1, instruction })),
    },
    preferences,
  );
}

function mealViolatesPreferences(
  meal: Pick<DailyRecipeItem, 'title' | 'ingredients' | 'steps'>,
  preferences: CompiledFoodPreferences,
): boolean {
  const normalizedIngredientNames = meal.ingredients.map((ingredient) => normalizeText(ingredient.name));
  const normalizedNarrative = normalizeText(
    [meal.title, ...meal.steps.map((step) => step.instruction)].join(' '),
  );

  return (
    preferences.ingredientKeywords.some((keyword) =>
      normalizedIngredientNames.some((ingredient) => ingredient.includes(keyword)),
    ) || preferences.textKeywords.some((keyword) => normalizedNarrative.includes(keyword))
  );
}

function areMealsMateriallyDifferent(a: DailyRecipeItem, b: DailyRecipeItem): boolean {
  return normalizeText(a.title) !== normalizeText(b.title) || ingredientSignature(a) !== ingredientSignature(b);
}

function ingredientSignature(meal: Pick<DailyRecipeItem, 'ingredients'>): string {
  return meal.ingredients
    .map((ingredient) => normalizeText(ingredient.name))
    .sort()
    .join('|');
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, '');
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}
