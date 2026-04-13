import { Link, Route, Routes } from 'react-router-dom';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import PlanPage from './pages/plan/PlanPage';
import ProfilePage from './pages/profile/ProfilePage';
import FoodAnalysisPage from './pages/food-analysis/FoodAnalysisPage';
import TrackingPage from './pages/tracking/TrackingPage';
import ProgressPage from './pages/progress/ProgressPage';
import NutritionPage from './pages/nutrition/NutritionPage';
import DiningOutPage from './pages/dining-out/DiningOutPage';
import AIConfigPage from './pages/settings/AIConfigPage';
import DailySummaryPage from './pages/summary/DailySummaryPage';
import ShoppingListPage from './pages/shopping/ShoppingListPage';
import AchievementPage from './pages/achievement/AchievementPage';
import ReportPage from './pages/report/ReportPage';
import DailyRecipePage from './pages/recipe/DailyRecipePage';
import RecipeDetailPage from './pages/recipe/RecipeDetailPage';
import ProtectedRoute from './router/ProtectedRoute';
import ErrorPage from './components/ErrorPage';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <nav>
        <Link to="/">Home</Link> | <Link to="/login">Login</Link> |{' '}
        <Link to="/register">Register</Link>
      </nav>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<PlanPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/food-analysis" element={<FoodAnalysisPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/nutrition" element={<NutritionPage />} />
          <Route path="/dining-out" element={<DiningOutPage />} />
          <Route path="/settings/ai" element={<AIConfigPage />} />
          <Route path="/summary/today" element={<DailySummaryPage />} />
          <Route path="/summary/:date" element={<DailySummaryPage />} />
          <Route path="/shopping" element={<ShoppingListPage />} />
          <Route path="/achievements" element={<AchievementPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/recipe/today" element={<DailyRecipePage />} />
          <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </ErrorBoundary>
  );
}
