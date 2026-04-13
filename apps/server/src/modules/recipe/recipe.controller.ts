import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import { RecipeError, type RecipeService } from './recipe.service.js';

const generateDailySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const fromIngredientsSchema = z.object({
  ingredients: z.array(z.string().min(1)).min(1),
  meals: z.number().int().min(1).max(3).default(2),
});

export function createRecipeRouter(
  recipeService: RecipeService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/generate-daily', requireAuth, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = generateDailySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    try {
      const recipePlan = await recipeService.generateDailyRecipe(req.user.id, parsed.data.date);
      res.status(201).json({ recipePlan });
    } catch (error) {
      sendRecipeError(res, error);
    }
  });

  router.post('/from-ingredients', requireAuth, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = fromIngredientsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    try {
      const recipes = await recipeService.generateRecipesFromIngredients(
        req.user.id,
        parsed.data.ingredients,
        parsed.data.meals,
      );
      res.json({ recipes });
    } catch (error) {
      sendRecipeError(res, error);
    }
  });

  router.get('/today', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const recipePlan = recipeService.getTodayRecipe(req.user.id);
    if (!recipePlan) {
      res.status(404).json({ message: 'Daily recipe not found' });
      return;
    }

    res.json({ recipePlan });
  });

  router.get('/:id', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const recipe = recipeService.getRecipe(req.user.id, req.params.id);
    if (!recipe) {
      res.status(404).json({ message: 'Recipe not found' });
      return;
    }

    res.json({ recipe });
  });

  router.post('/:id/favorite', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      const recipe = recipeService.favoriteRecipe(req.user.id, req.params.id);
      res.json({ recipe });
    } catch (error) {
      sendRecipeError(res, error);
    }
  });

  router.delete('/:id/favorite', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    recipeService.unfavoriteRecipe(req.user.id, req.params.id);
    res.json({ ok: true });
  });

  router.get('/favorites/list', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    res.json({ recipes: recipeService.listFavorites(req.user.id) });
  });

  router.post('/:id/swap', requireAuth, async (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      const recipe = await recipeService.swapRecipe(req.user.id, req.params.id);
      res.json({ recipe });
    } catch (error) {
      sendRecipeError(res, error);
    }
  });

  return router;
}

function sendRecipeError(res: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof RecipeError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
