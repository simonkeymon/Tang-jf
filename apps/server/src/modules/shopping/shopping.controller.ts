import { Router } from 'express';
import type { RequestHandler } from 'express';
import { z } from 'zod';

import { ShoppingError, type ShoppingService } from './shopping.service.js';

const generateSchema = z.object({
  days: z.number().int().min(1).max(14),
});

const updateItemSchema = z.object({
  purchased: z.boolean(),
});

export function createShoppingRouter(
  shoppingService: ShoppingService,
  requireAuth: RequestHandler,
): Router {
  const router = Router();

  router.post('/generate', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    try {
      const shoppingList = shoppingService.generate(req.user.id, parsed.data.days);
      res.status(201).json({ shoppingList });
    } catch (error) {
      sendShoppingError(res, error);
    }
  });

  router.get('/:id', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const shoppingList = shoppingService.getById(req.user.id, req.params.id);
    if (!shoppingList) {
      res.status(404).json({ message: 'Shopping list not found' });
      return;
    }

    res.json({ shoppingList });
  });

  router.patch('/:id/item/:itemId', requireAuth, (req, res) => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: 'Invalid request body' });
      return;
    }

    const item = shoppingService.updateItem(
      req.user.id,
      req.params.id,
      req.params.itemId,
      parsed.data.purchased,
    );

    if (!item) {
      res.status(404).json({ message: 'Shopping item not found' });
      return;
    }

    res.json({ item });
  });

  return router;
}

function sendShoppingError(res: Parameters<RequestHandler>[1], error: unknown): void {
  if (error instanceof ShoppingError) {
    res.status(error.statusCode).json({ message: error.message });
    return;
  }

  res.status(500).json({ message: 'Internal server error' });
}
