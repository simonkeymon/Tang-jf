import { create } from 'zustand';

import { api } from '../lib/api';
import { getErrorMessage } from '../utils/error-handler';

type GenerationTask = {
  pending: boolean;
  lastCompletedAt: number | null;
  lastError: string | null;
};

type RecipeGenerationTask = GenerationTask & {
  date: string | null;
};

interface GenerationState {
  plan: GenerationTask;
  recipe: RecipeGenerationTask;
  startPlan: () => void;
  finishPlan: (error?: string) => void;
  clearPlanError: () => void;
  startRecipe: (date: string) => void;
  finishRecipe: (date: string, error?: string) => void;
  clearRecipeError: () => void;
}

const EMPTY_TASK: GenerationTask = {
  pending: false,
  lastCompletedAt: null,
  lastError: null,
};

const EMPTY_RECIPE_TASK: RecipeGenerationTask = {
  ...EMPTY_TASK,
  date: null,
};

export const generationStore = create<GenerationState>((set) => ({
  plan: EMPTY_TASK,
  recipe: EMPTY_RECIPE_TASK,

  startPlan() {
    set({
      plan: {
        pending: true,
        lastCompletedAt: null,
        lastError: null,
      },
    });
  },

  finishPlan(error) {
    set({
      plan: {
        pending: false,
        lastCompletedAt: error ? null : Date.now(),
        lastError: error ?? null,
      },
    });
  },

  clearPlanError() {
    set((state) => ({
      plan: {
        ...state.plan,
        lastError: null,
      },
    }));
  },

  startRecipe(date) {
    set({
      recipe: {
        pending: true,
        date,
        lastCompletedAt: null,
        lastError: null,
      },
    });
  },

  finishRecipe(date, error) {
    set({
      recipe: {
        pending: false,
        date,
        lastCompletedAt: error ? null : Date.now(),
        lastError: error ?? null,
      },
    });
  },

  clearRecipeError() {
    set((state) => ({
      recipe: {
        ...state.recipe,
        lastError: null,
      },
    }));
  },
}));

let activePlanRequest: Promise<unknown> | null = null;
const activeRecipeRequests = new Map<string, Promise<unknown>>();

export function useGenerationStore() {
  return generationStore();
}

export async function triggerPlanGeneration() {
  if (activePlanRequest) {
    return activePlanRequest;
  }

  generationStore.getState().startPlan();
  activePlanRequest = api
    .post('/plan/generate')
    .then((response) => {
      generationStore.getState().finishPlan();
      return response.data.plan;
    })
    .catch((error) => {
      generationStore.getState().finishPlan(getErrorMessage(error));
      throw error;
    })
    .finally(() => {
      activePlanRequest = null;
    });

  return activePlanRequest;
}

export async function triggerRecipeGeneration(date: string) {
  const existing = activeRecipeRequests.get(date);
  if (existing) {
    return existing;
  }

  generationStore.getState().startRecipe(date);
  const request = api
    .post('/recipe/generate-daily', { date })
    .then((response) => {
      generationStore.getState().finishRecipe(date);
      return response.data.recipePlan;
    })
    .catch((error) => {
      generationStore.getState().finishRecipe(date, getErrorMessage(error));
      throw error;
    })
    .finally(() => {
      activeRecipeRequests.delete(date);
    });

  activeRecipeRequests.set(date, request);
  return request;
}
