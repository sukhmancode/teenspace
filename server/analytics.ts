import { storage } from "./storage";

/**
 * Analytics Service - Screen time and usage analytics for teenage users
 * 
 * Features:
 * - Daily usage tracking
 * - 7-day usage history
 * - Average daily usage calculation
 * - Monthly usage totals
 * - Trend analysis
 */
export class AnalyticsService {
  /**
   * Get comprehensive screen time analytics for a user
   */
  static async getScreenTimeAnalytics(userId: number) {
    try {
      const todayUsage = await storage.getTodayUsage(userId);
      const last7DaysUsage = await storage.getLast7DaysUsage(userId);
      const monthlyTotal = await storage.getMonthlyTotalUsage(userId);
      
      const average = last7DaysUsage.length > 0
        ? Math.round(last7DaysUsage.reduce((a, b) => a + b, 0) / last7DaysUsage.length)
        : 0;

      return {
        today: todayUsage,
        last_7_days: last7DaysUsage,
        average_daily: average,
        monthly_total: monthlyTotal,
      };
    } catch (error) {
      console.error(`Failed to get screen time analytics for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get detailed daily usage breakdown for a specific period
   */
  static async getDailyBreakdown(userId: number, days: number = 30) {
    try {
      const breakdown = await storage.getDailyBreakdown(userId, days);
      
      return {
        period_days: days,
        daily_data: breakdown,
        total_minutes: breakdown.reduce((sum, day) => sum + day.totalMinutes, 0),
        average_minutes: Math.round(
          breakdown.reduce((sum, day) => sum + day.totalMinutes, 0) / breakdown.length
        ),
      };
    } catch (error) {
      console.error(`Failed to get daily breakdown for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get usage trends - compare week-over-week or month-over-month
   */
  static async getUsageTrend(userId: number, period: 'week' | 'month' = 'week') {
    try {
      const currentPeriodTotal = await storage.getCurrentPeriodTotal(userId, period);
      const previousPeriodTotal = await storage.getPreviousPeriodTotal(userId, period);
      
      const percentChange = previousPeriodTotal > 0
        ? Math.round(((currentPeriodTotal - previousPeriodTotal) / previousPeriodTotal) * 100)
        : 0;

      return {
        period,
        current_total: currentPeriodTotal,
        previous_total: previousPeriodTotal,
        percent_change: percentChange,
        trend: percentChange > 0 ? 'increasing' : percentChange < 0 ? 'decreasing' : 'stable',
      };
    } catch (error) {
      console.error(`Failed to get usage trend for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get daily goals and progress
   */
  static async getGoalProgress(userId: number, dailyLimitMinutes: number = 120) {
    try {
      const todayUsage = await storage.getTodayUsage(userId);
      const last7DaysUsage = await storage.getLast7DaysUsage(userId);
      const usageDaysCount = last7DaysUsage.filter(m => m > 0).length;

      const goalComplianceDays = last7DaysUsage.filter(m => m <= dailyLimitMinutes).length;
      const complianceRate = Math.round((goalComplianceDays / 7) * 100);

      return {
        daily_limit: dailyLimitMinutes,
        today_used: todayUsage,
        today_remaining: Math.max(0, dailyLimitMinutes - todayUsage),
        today_exceeded: todayUsage > dailyLimitMinutes,
        last_7_days_compliance: goalComplianceDays,
        compliance_rate_percent: complianceRate,
        active_days_last_week: usageDaysCount,
      };
    } catch (error) {
      console.error(`Failed to get goal progress for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get peak usage hours (hours when user is most active)
   * Note: This would require storing time-of-day data in the future
   */
  static async getHealthScore(userId: number): Promise<number> {
    try {
      const trend = await this.getUsageTrend(userId, 'week');
      const goalProgress = await this.getGoalProgress(userId);

      let score = 100;

      // Penalize high usage
      if (trend.percent_change > 20) {
        score -= 15;
      } else if (trend.percent_change > 10) {
        score -= 10;
      }

      // Reward compliance
      score += Math.min(goalProgress.compliance_rate_percent / 2, 20);

      return Math.max(0, Math.min(100, score));
    } catch (error) {
      console.error(`Failed to calculate health score for user ${userId}:`, error);
      return 50; // Default score
    }
  }
}
