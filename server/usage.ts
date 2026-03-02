import { storage } from "./storage";

const DAILY_LIMIT_MINUTES = 120;
const USAGE_TRACKING_MAP = new Map<number, { startTime: number; sessionStarted: number }>();

/**
 * Usage Service - Manages daily app usage limits for teenage users
 * 
 * Features:
 * - Tracks total time spent on the app daily (in minutes)
 * - Locks account for the day if usage exceeds 120 minutes
 * - Automatically resets at midnight
 * - Provides middleware for tracking request duration
 */
export class UsageService {
  /**
   * Initialize tracking session for a user (called at login)
   */
  static startSession(userId: number): void {
    USAGE_TRACKING_MAP.set(userId, {
      startTime: Date.now(),
      sessionStarted: Date.now(),
    });
  }

  /**
   * End tracking session for a user (called at logout)
   */
  static endSession(userId: number): void {
    USAGE_TRACKING_MAP.delete(userId);
  }

  /**
   * Track API request - update usage time
   * Called after each API request completes
   */
  static async trackRequest(userId: number, requestDurationMs: number): Promise<void> {
    // Convert milliseconds to minutes (round to nearest minute)
    const minutes = Math.max(1, Math.round(requestDurationMs / 60000));
    
    try {
      await storage.updateUsageTime(userId, minutes);
    } catch (error) {
      console.error(`Failed to track usage for user ${userId}:`, error);
    }
  }

  /**
   * Check if user's daily limit has been exceeded
   */
  static async isUserLocked(userId: number): Promise<boolean> {
    try {
      return await storage.isUserLocked(userId);
    } catch (error) {
      console.error(`Failed to check lock status for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user's current daily usage (in minutes)
   */
  static async getUserDailyUsage(userId: number) {
    try {
      return await storage.getOrCreateDailyUsage(userId);
    } catch (error) {
      console.error(`Failed to get usage for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Reset usage at start of new day (or on login if day has changed)
   */
  static async resetIfNewDay(userId: number) {
    try {
      await storage.resetDailyUsageIfNeeded(userId);
    } catch (error) {
      console.error(`Failed to reset usage for user ${userId}:`, error);
    }
  }

  /**
   * Get remaining minutes for user before hitting daily limit
   */
  static async getRemainingMinutes(userId: number): Promise<number> {
    try {
      const usage = await storage.getOrCreateDailyUsage(userId);
      return Math.max(0, DAILY_LIMIT_MINUTES - usage.totalMinutes);
    } catch (error) {
      console.error(`Failed to get remaining minutes for user ${userId}:`, error);
      return 0;
    }
  }

  /**
   * Get time until account unlocks (in hours/minutes)
   * Returns null if not locked
   */
  static async getTimeUntilUnlock(userId: number): Promise<{ hours: number; minutes: number } | null> {
    try {
      const usage = await storage.getOrCreateDailyUsage(userId);
      if (!usage.isLocked) {
        return null;
      }

      // Calculate time until midnight
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const msUntilUnlock = tomorrow.getTime() - now.getTime();
      const hours = Math.floor(msUntilUnlock / (1000 * 60 * 60));
      const minutes = Math.floor((msUntilUnlock % (1000 * 60 * 60)) / (1000 * 60));

      return { hours, minutes };
    } catch (error) {
      console.error(`Failed to get unlock time for user ${userId}:`, error);
      return null;
    }
  }
}
