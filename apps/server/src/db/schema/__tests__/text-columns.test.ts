import { food_analyses } from '../food_analysis.js';
import { plans } from '../plans.js';
import { reports } from '../reports.js';
import { summaries } from '../summaries.js';

describe('AI long-text persistence columns', () => {
  it('stores plan and summary/report text in unrestricted text columns', () => {
    expect(plans.notes.getSQLType()).toBe('text');
    expect(reports.ai_summary.getSQLType()).toBe('text');
    expect(summaries.ai_feedback.getSQLType()).toBe('text');
    expect(summaries.tomorrow_preview.getSQLType()).toBe('text');
    expect(food_analyses.note.getSQLType()).toBe('text');
  });
});
