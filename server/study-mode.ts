import { storage } from "./storage";

/**
 * Study Mode Service - Controls focus mode for teenage users
 * 
 * Features:
 * - Enable/disable study mode per user
 * - Filter feeds to only educational content when study mode is active
 * - Block entertainment-related posts
 * - Support for study groups and homework discussions
 */
export class StudyModeService {
  /**
   * Enable study mode for a user
   */
  static async enableStudyMode(userId: number): Promise<boolean> {
    try {
      await storage.updateUserStudyMode(userId, true);
      return true;
    } catch (error) {
      console.error(`Failed to enable study mode for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Disable study mode for a user
   */
  static async disableStudyMode(userId: number): Promise<boolean> {
    try {
      await storage.updateUserStudyMode(userId, false);
      return true;
    } catch (error) {
      console.error(`Failed to disable study mode for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user has study mode enabled
   */
  static async isStudyModeEnabled(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return user?.studyModeEnabled ?? false;
    } catch (error) {
      console.error(`Failed to check study mode status for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Allowed categories when study mode is active
   */
  static readonly STUDY_MODE_ALLOWED_CATEGORIES = ["education", "study-group", "homework"];

  /**
   * Check if post category is allowed in study mode
   */
  static isAllowedInStudyMode(postCategory: string | null): boolean {
    if (!postCategory) return false;
    return this.STUDY_MODE_ALLOWED_CATEGORIES.includes(postCategory.toLowerCase());
  }

  /**
   * Get filter function for posts based on study mode status
   * Returns a function that can be used to filter posts
   */
  static getPostFilter(studyModeEnabled: boolean): (postCategory: string | null) => boolean {
    if (!studyModeEnabled) {
      // No filtering - all posts allowed
      return () => true;
    }
    // Filter to only allowed categories
    return (postCategory) => this.isAllowedInStudyMode(postCategory);
  }

  /**
   * Get color/label for post category (for frontend UI)
   */
  static getCategoryLabel(category: string | null): string {
    if (!category) return "General";
    
    const categoryMap: Record<string, string> = {
      "education": "📚 Education",
      "study-group": "👥 Study Group",
      "homework": "📝 Homework",
      "general": "General",
      "entertainment": "🎮 Entertainment",
    };

    return categoryMap[category.toLowerCase()] || category;
  }
}
