import { randomUUID } from 'node:crypto';

import { desc } from 'drizzle-orm';

import { getDb, isDatabaseEnabled } from '../../db/connection.js';
import { food_analyses, food_analysis_items } from '../../db/schema/index.js';
import type { AIServerService } from '../ai/ai.service.js';
import { buildFoodAnalysisPrompt } from './food-analysis.prompts.js';

export interface FoodAnalysisItem {
  id: string;
  name: string;
  estimated_portion: string;
  estimated_calories: number;
}

export interface FoodAnalysisResult {
  id: string;
  image_url: string;
  foods: FoodAnalysisItem[];
  total_calories: number;
  confidence: 'high' | 'medium' | 'low';
  note?: string;
}

export interface FoodAnalysisService {
  analyze(userId: string, imageUrl: string, note?: string): Promise<FoodAnalysisResult>;
  getAnalysis(id: string): FoodAnalysisResult | null;
}

type ParsedFoodAnalysis = {
  is_food: boolean;
  confidence: 'high' | 'medium' | 'low';
  foods: Array<{
    name: string;
    estimated_portion: string;
    estimated_calories: number;
  }>;
  total_calories: number;
  note?: string;
};

export class FoodAnalysisError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'FoodAnalysisError';
  }
}

export function createFoodAnalysisService(
  aiService: AIServerService,
): FoodAnalysisService & { hydrate?: () => Promise<void> } {
  const results = new Map<string, FoodAnalysisResult>();

  return {
    async hydrate() {
      const db = getDb();
      if (!db || !isDatabaseEnabled()) {
        return;
      }

      results.clear();
      const [analysisRows, itemRows] = await Promise.all([
        db.select().from(food_analyses).orderBy(desc(food_analyses.created_at)),
        db.select().from(food_analysis_items),
      ]);

      const itemsByAnalysisId = new Map<string, FoodAnalysisItem[]>();
      for (const row of itemRows) {
        const current = itemsByAnalysisId.get(row.analysis_id) ?? [];
        current.push({
          id: row.id,
          name: row.name,
          estimated_portion: row.estimated_portion,
          estimated_calories: row.estimated_calories,
        });
        itemsByAnalysisId.set(row.analysis_id, current);
      }

      for (const row of analysisRows) {
        results.set(row.id, {
          id: row.id,
          image_url: row.image_url,
          foods: itemsByAnalysisId.get(row.id) ?? [],
          total_calories: row.total_calories,
          confidence: row.confidence as FoodAnalysisResult['confidence'],
          note: row.note ?? undefined,
        });
      }
    },

    async analyze(userId, imageUrl, note) {
      if (!imageUrl) {
        throw new FoodAnalysisError(400, 'image_url is required');
      }

      const prompt = buildFoodAnalysisPrompt({ imageUrl, note });
      const aiResponse = await aiService.chatWithVisionForUser(
        userId,
        [{ role: 'user', content: prompt }],
        [{ url: imageUrl }],
        {
          mockResponse: buildMockVisionResponse(imageUrl, note),
        },
      );

      const parsed = parseFoodAnalysis(aiResponse.content);
      const result = toFoodAnalysisResult(parsed, imageUrl, note);
      results.set(result.id, result);
      persistAnalysis(userId, result);
      return result;
    },

    getAnalysis(id) {
      return results.get(id) ?? null;
    },
  };
}

function toFoodAnalysisResult(
  parsed: ParsedFoodAnalysis,
  imageUrl: string,
  note?: string,
): FoodAnalysisResult {
  const foods = parsed.is_food
    ? parsed.foods
        .filter((food) => food.name && food.estimated_portion)
        .map((food) => ({
          id: randomUUID(),
          name: food.name,
          estimated_portion: food.estimated_portion,
          estimated_calories: Math.max(0, Math.round(food.estimated_calories)),
        }))
    : [];

  const totalCalories =
    foods.length > 0
      ? foods.reduce((sum, item) => sum + item.estimated_calories, 0)
      : Math.max(0, Math.round(parsed.total_calories ?? 0));

  return {
    id: randomUUID(),
    image_url: imageUrl,
    foods,
    total_calories: totalCalories,
    confidence: parsed.confidence,
    note: parsed.note ?? note,
  };
}

function parseFoodAnalysis(content: string): ParsedFoodAnalysis {
  const cleaned = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new FoodAnalysisError(502, 'AI response format is invalid');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new FoodAnalysisError(502, 'AI response format is invalid');
  }

  const candidate = parsed as Partial<ParsedFoodAnalysis>;
  const confidence =
    candidate.confidence === 'high' ||
    candidate.confidence === 'medium' ||
    candidate.confidence === 'low'
      ? candidate.confidence
      : 'low';

  return {
    is_food: Boolean(candidate.is_food),
    confidence,
    foods: Array.isArray(candidate.foods)
      ? candidate.foods.filter((item): item is ParsedFoodAnalysis['foods'][number] =>
          Boolean(
            item &&
            typeof item === 'object' &&
            typeof item.name === 'string' &&
            typeof item.estimated_portion === 'string' &&
            typeof item.estimated_calories === 'number',
          ),
        )
      : [],
    total_calories: typeof candidate.total_calories === 'number' ? candidate.total_calories : 0,
    note: typeof candidate.note === 'string' ? candidate.note : undefined,
  };
}

function persistAnalysis(userId: string, result: FoodAnalysisResult) {
  const db = getDb();
  if (!db || !isDatabaseEnabled()) {
    return;
  }

  void (async () => {
    await db.insert(food_analyses).values({
      id: result.id,
      user_id: userId,
      image_url: result.image_url,
      total_calories: result.total_calories,
      confidence: result.confidence,
      note: result.note,
      created_at: new Date(),
    });

    if (result.foods.length > 0) {
      await db.insert(food_analysis_items).values(
        result.foods.map((item) => ({
          id: item.id,
          analysis_id: result.id,
          name: item.name,
          estimated_portion: item.estimated_portion,
          estimated_calories: item.estimated_calories,
        })),
      );
    }
  })();
}

function buildMockVisionResponse(imageUrl: string, note?: string): string {
  const lowerHint = `${imageUrl} ${note ?? ''}`.toLowerCase();
  const looksLikeNonFood = ['dog', 'puppy', 'cat', 'pet', 'landscape', 'not-food'].some((keyword) =>
    lowerHint.includes(keyword),
  );

  if (looksLikeNonFood) {
    return JSON.stringify({
      is_food: false,
      confidence: 'low',
      foods: [],
      total_calories: 0,
      note: '这张图片看起来不是食物，无法进行热量估算。',
    });
  }

  return JSON.stringify({
    is_food: true,
    confidence: 'medium',
    foods: [
      {
        name: '米饭',
        estimated_portion: '1碗',
        estimated_calories: 230,
      },
      {
        name: '清炒西兰花',
        estimated_portion: '1盘',
        estimated_calories: 90,
      },
      {
        name: '鸡胸肉',
        estimated_portion: '150克',
        estimated_calories: 250,
      },
    ],
    total_calories: 570,
    note: '这是基于图片内容的粗略热量估算。',
  });
}
