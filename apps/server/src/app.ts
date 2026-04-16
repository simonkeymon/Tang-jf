import express from 'express';
import { getPersistenceInfo } from './db/connection.js';

import { createAuthRouter } from './modules/auth/auth.controller.js';
import { createAuthMiddleware } from './modules/auth/auth.middleware.js';
import { createAuthService } from './modules/auth/auth.service.js';
import {
  createAdminAIConfigRouter,
  createAIConfigRouter,
} from './modules/ai/ai-config.controller.js';
import { createAIConfigService } from './modules/ai/ai-config.service.js';
import { createAchievementRouter } from './modules/achievement/achievement.controller.js';
import { createAchievementService } from './modules/achievement/achievement.service.js';
import { createAdminGuard } from './modules/admin/admin.middleware.js';
import { createAdminUserRouter } from './modules/admin/admin-user.controller.js';
import { createFoodAnalysisRouter } from './modules/food-analysis/food-analysis.controller.js';
import { createFoodAnalysisService } from './modules/food-analysis/food-analysis.service.js';
import { createExportRouter } from './modules/export/export.controller.js';
import { createExportService } from './modules/export/export.service.js';
import { createPlanRouter } from './modules/plan/plan.controller.js';
import { createPlanService } from './modules/plan/plan.service.js';
import { createRecipeRouter } from './modules/recipe/recipe.controller.js';
import { createRecipeService } from './modules/recipe/recipe.service.js';
import { createReportRouter } from './modules/report/report.controller.js';
import { createReportService } from './modules/report/report.service.js';
import { createShoppingRouter } from './modules/shopping/shopping.controller.js';
import { createShoppingService } from './modules/shopping/shopping.service.js';
import { createSummaryRouter } from './modules/summary/summary.controller.js';
import { createSummaryService } from './modules/summary/summary.service.js';
import { createTrackingRouter } from './modules/tracking/tracking.controller.js';
import { createTrackingService } from './modules/tracking/tracking.service.js';
import { createUploadRouter } from './modules/upload/upload.controller.js';
import { createUploadService } from './modules/upload/upload.service.js';
import { createUserRouter } from './modules/user/user.controller.js';
import { createUserService } from './modules/user/user.service.js';
import { createAIService } from './modules/ai/ai.service.js';

const DEFAULT_JWT_SECRET = 'dev-auth-secret';
const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174'];

type HydratableService = {
  hydrate?: () => Promise<void>;
};

export async function createApp(): Promise<express.Express> {
  const { app, hydratables } = buildApp();
  for (const service of hydratables) {
    if (service.hydrate) {
      await service.hydrate();
    }
  }

  return app;
}

export function createAppSync(): express.Express {
  return buildApp().app;
}

function buildApp(): { app: express.Express; hydratables: HydratableService[] } {
  const app = express();
  const authService = createAuthService({
    jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  });
  const aiConfigService = createAIConfigService();
  const aiService = createAIService(aiConfigService);
  const uploadService = createUploadService();
  const userService = createUserService();
  const planService = createPlanService(userService, aiService);
  const foodAnalysisService = createFoodAnalysisService(aiService);
  const recipeService = createRecipeService(planService, aiService, userService);
  const trackingService = createTrackingService();
  const shoppingService = createShoppingService(recipeService);
  const achievementService = createAchievementService(trackingService, planService, recipeService);
  const exportService = createExportService(
    userService,
    trackingService,
    recipeService,
    achievementService,
  );
  const reportService = createReportService(aiService, planService, recipeService, trackingService);
  const summaryService = createSummaryService(
    aiService,
    planService,
    recipeService,
    trackingService,
    userService,
  );
  const requireAuth = createAuthMiddleware(authService);
  const requireAdmin = createAdminGuard(requireAuth);

  app.use((req, res, next) => {
    const allowedOrigins = (
      process.env.ALLOWED_ORIGINS?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean) ?? DEFAULT_ALLOWED_ORIGINS
    ).filter(Boolean);
    const requestOrigin = req.headers.origin;

    if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
      res.header('Access-Control-Allow-Origin', requestOrigin);
      res.header('Vary', 'Origin');
    }

    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  });

  app.use(express.json());
  app.use('/uploads', express.static(process.env.UPLOAD_ROOT ?? 'uploads'));

  app.get('/health', (_req, res) => {
    const persistence = getPersistenceInfo();
    res.json({
      ok: true,
      name: 'tang-server',
      persistence: persistence.persistence,
      engine: persistence.engine,
    });
  });

  app.use('/api/auth', createAuthRouter(authService));
  app.use(
    '/api/admin',
    createAdminUserRouter(authService, aiConfigService, planService, trackingService, requireAdmin),
  );
  app.use('/api/achievements', createAchievementRouter(achievementService, requireAuth));
  app.use('/api/ai', createAIConfigRouter(aiConfigService, aiService, requireAuth));
  app.use('/api/admin/ai', createAdminAIConfigRouter(aiConfigService, requireAuth));
  app.use('/api/food', createFoodAnalysisRouter(foodAnalysisService, requireAuth));
  app.use('/api/export', createExportRouter(exportService, requireAuth));
  app.use('/api/plan', createPlanRouter(planService, requireAuth));
  app.use('/api/recipe', createRecipeRouter(recipeService, requireAuth));
  app.use('/api/report', createReportRouter(reportService, requireAuth));
  app.use('/api/summary', createSummaryRouter(summaryService, requireAuth));
  app.use('/api/shopping', createShoppingRouter(shoppingService, requireAuth));
  app.use('/api/tracking', createTrackingRouter(trackingService, requireAuth));
  app.use('/api/upload', createUploadRouter(uploadService, requireAuth));
  app.use('/api/user', createUserRouter(userService, requireAuth));

  return {
    app,
    hydratables: [
      aiConfigService,
      userService,
      planService,
      recipeService,
      trackingService,
      achievementService,
      shoppingService,
      summaryService,
      reportService,
      foodAnalysisService,
    ],
  };
}
