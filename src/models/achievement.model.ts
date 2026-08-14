import achievements from "../constants/achievement.constant";
import { IAchievement } from "../interfaces/achievement.interface";

export class AchievementModel {
  customer: number;
  sales: number;

  constructor(data: { customer: number; sales: number }) {
    this.customer = data.customer;
    this.sales = data.sales;
  }

  getAchievements(): IAchievement[] {
    const result: IAchievement[] = [];
    for (const achievement of achievements) {
      if (
        (achievement.field === "customer" &&
          this.customer >= achievement.minimum) ||
        (achievement.field === "sales" && this.sales >= achievement.minimum)
      ) {
        result.push(achievement);
      }
    }
    return result;
  }
}
