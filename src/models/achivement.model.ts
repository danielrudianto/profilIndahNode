const achivements: IAchivement[] = [
  {
    name: "Ordinary sales",
    shortName: "OrdinarySales",
    description: "Sales value is more than 10.000.000 IDR",
    minimum: 10_000_000,
    field: "sales",
  },
  {
    name: "Extraordinary sales",
    shortName: "ExtraordinarySales",
    description: "Sales value is more than 100.000.000 IDR",
    minimum: 100_000_000,
    field: "sales",
  },
  {
    name: "Super sales",
    shortName: "SuperSales",
    description: "Sales value is more than 1.000.000.000 IDR",
    minimum: 1_000_000_000,
    field: "sales",
  },
  {
    name: "Mega sales",
    shortName: "MegaSales",
    description: "Sales value is more than 10.000.000.000 IDR",
    minimum: 10_000_000_000,
    field: "sales",
  },
  {
    name: "Junior customer hunter",
    shortName: "JuniorCustomerHunter",
    description: "Acquired new customer",
    minimum: 1,
    field: "customer",
  },
  {
    name: "Customer hunter",
    shortName: "CustomerHunter",
    description: "Acquired more than 50 new customer",
    minimum: 50,
    field: "customer",
  },
  {
    name: "Senior customer hunter",
    shortName: "SeniorCustomerHunter",
    description: "Acquired more than 150 new customer",
    minimum: 150,
    field: "customer",
  },
  {
    name: "Master customer hunter",
    shortName: "MasterCustomerHunter",
    description: "Acquired more than 500 new customer",
    minimum: 500,
    field: "customer",
  },
];

interface IAchivement {
  name: string;
  shortName: string;
  description: string;
  minimum: number;
  field: "customer" | "sales";
}

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
