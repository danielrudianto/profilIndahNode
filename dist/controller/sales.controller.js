"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesmanController = void 0;
const escape_helper_1 = require("../helper/escape.helper");
class SalesmanController {
    constructor(redisClient) {
        this.createSalesman = async (req, res, next) => {
            try {
                const salesName = req.body.sales;
                if (salesName != null) {
                    await this.redisClient.sAdd("salesmanList", salesName);
                }
                next();
            }
            catch (error) {
                console.error(`[error]: Error during adding a salesman`);
                return res.status(500).send(error);
            }
        };
        this.deleteSalesman = async (req, res) => {
            const salesName = req.body.name;
            await this.redisClient.sRem("salesmanList", salesName);
            return res.status(200).send({ message: "Salesman deleted successfully" });
        };
        this.fetch = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const salesman = await this.redisClient.sMembers("salesmanList");
            const filtered = salesman
                .filter((x) => x.toLowerCase().includes(keyword.toLowerCase()))
                .slice(0, 5)
                .sort((a, b) => {
                return a.localeCompare(b);
            });
            return res.status(200).send(filtered);
        };
        this.fetchAll = async (req, res) => {
            const salesman = await this.redisClient.sMembers("salesmanList");
            return res.status(200).send(salesman.sort((a, b) => {
                return a.localeCompare(b);
            }));
        };
        this.redisClient = redisClient;
    }
}
exports.SalesmanController = SalesmanController;
//# sourceMappingURL=sales.controller.js.map