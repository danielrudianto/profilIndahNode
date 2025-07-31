"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AchivementModel = void 0;
const achivements = [
    {
        name: "Ordinary sales",
        shortName: "OrdinarySales",
        description: "Sales value is more than 10.000.000 IDR",
        minimum: 10000000,
        field: "sales",
    },
    {
        name: "Extraordinary sales",
        shortName: "ExtraordinarySales",
        description: "Sales value is more than 100.000.000 IDR",
        minimum: 100000000,
        field: "sales",
    },
    {
        name: "Super sales",
        shortName: "SuperSales",
        description: "Sales value is more than 1.000.000.000 IDR",
        minimum: 1000000000,
        field: "sales",
    },
    {
        name: "Mega sales",
        shortName: "MegaSales",
        description: "Sales value is more than 10.000.000.000 IDR",
        minimum: 10000000000,
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
class AchivementModel {
    constructor(data) {
        this.customer = data.customer;
        this.sales = data.sales;
    }
    getAchivements() {
        const result = [];
        for (const achivement of achivements) {
            if ((achivement.field === "customer" &&
                this.customer >= achivement.minimum) ||
                (achivement.field === "sales" && this.sales >= achivement.minimum)) {
                result.push(achivement);
            }
        }
        return result;
    }
}
exports.AchivementModel = AchivementModel;
//# sourceMappingURL=achivement.model.js.map