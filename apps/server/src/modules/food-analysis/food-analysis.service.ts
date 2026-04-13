import { randomUUID } from 'node:crypto';

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
  analyze(imageUrl: string, note?: string): Promise<FoodAnalysisResult>;
  getAnalysis(id: string): FoodAnalysisResult | null;
}

export class FoodAnalysisError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'FoodAnalysisError';
  }
}

export function createFoodAnalysisService(aiService: AIServerService): FoodAnalysisService {
  const results = new Map<string, FoodAnalysisResult>();

  return {
    async analyze(imageUrl, note) {
      if (!imageUrl) {
        throw new FoodAnalysisError(400, 'image_url is required');
      }

      const prompt = buildFoodAnalysisPrompt({ imageUrl, note });
      await aiService.chatWithVision([{ role: 'user', content: prompt }], [{ url: imageUrl }], {
        provider: 'mock',
        mockResponse: 'food-analysis',
      });

      const result = buildAnalysis(imageUrl, note);
      results.set(result.id, result);
      return result;
    },

    getAnalysis(id) {
      return results.get(id) ?? null;
    },
  };
}

function buildAnalysis(imageUrl: string, note?: string): FoodAnalysisResult {
  const foods: FoodAnalysisItem[] = [
    {
      id: randomUUID(),
      name: '米饭',
      estimated_portion: '1碗',
      estimated_calories: 230,
    },
    {
      id: randomUUID(),
      name: '清炒西兰花',
      estimated_portion: '1盘',
      estimated_calories: 90,
    },
    {
      id: randomUUID(),
      name: '鸡胸肉',
      estimated_portion: '150克',
      estimated_calories: 250,
    },
  ];

  return {
    id: randomUUID(),
    image_url: imageUrl,
    foods,
    total_calories: foods.reduce((sum, item) => sum + item.estimated_calories, 0),
    confidence: note?.includes('not-food') ? 'low' : 'medium',
    note,
  };
}
