"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const escape_helper_1 = require("../helper/escape.helper");
const error_list_1 = __importDefault(require("../assets/error_list"));
class DepositController {
    constructor(salesDepositRepository) {
        this.create = async (req, res) => {
            const userID = req.body.userId;
            const customerID = req.body.customer_id;
            const discount = Number(req.body.discount);
            const delivery = Number(req.body.delivery);
            const service = Number(req.body.service);
            const deposit = req.body.deposit;
            const deposit_payment = req.body.deposit_payment;
            const date = (0, escape_helper_1.translateDate)(req.body.date);
            const isPaid = req.body.is_paid;
            const sales = (0, escape_helper_1.translateSalesName)(req.body.sales);
            const uuid = req.body.uuid;
            const type = req.body.type;
            try {
                const billResult = await this.salesDepositRepository.create({
                    name: this.salesDepositRepository.generateName(date),
                    uuid: uuid,
                    customerID: customerID,
                    discount: discount,
                    delivery: delivery,
                    service: service,
                    sales: sales,
                    date: date,
                    createdBy: userID,
                    createdAt: new Date(),
                    sales_deposit: deposit,
                    sales_deposit_payment: deposit_payment,
                    type: type,
                    isPaid: isPaid,
                    isConfirm: false,
                    isDelete: false,
                });
                return res.status(201).send(billResult);
            }
            catch (error) {
                console.error(`[error]: Error on creating bill ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.salesDepositRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching deposit by ID ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const pageSize = Number(process.env.LIMIT);
            try {
                const result = await this.salesDepositRepository.fetch({
                    page: page,
                    keyword: keyword,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching deposit ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const result = this.salesDepositRepository.fetchByID(id);
            if (!result) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
        };
        this.salesDepositRepository = salesDepositRepository;
    }
}
exports.default = DepositController;
//# sourceMappingURL=deposit.controller.js.map