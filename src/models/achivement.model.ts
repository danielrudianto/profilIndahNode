import achivements from "../constants/achivement";
import { IAchivement } from "../interfaces/achivement.interface";

export class AchivementModel {
  customer: number;
  sales: number;

  constructor(data: { customer: number; sales: number }) {
    this.customer = data.customer;
    this.sales = data.sales;
  }

  getAchivements(): IAchivement[] {
    const result: IAchivement[] = [];
    for (const achivement of achivements) {
      if (
        (achivement.field === "customer" &&
          this.customer >= achivement.minimum) ||
        (achivement.field === "sales" && this.sales >= achivement.minimum)
      ) {
        result.push(achivement);
      }
    }
    return result;
  }
}
