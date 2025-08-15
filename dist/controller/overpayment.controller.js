"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OverpaymentController = void 0;
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
class OverpaymentController {
    constructor(overpaymentRepository) {
        this.create = async (req, res) => {
            const date = new Date(req.body.date);
            const customer_id = req.body.customer_id;
            const sales_deposit_code_id = req.body.sales_deposit_code_id;
            const userID = req.body.userId;
            const return_payment_date = new Date(req.body.return_payment_date);
            const return_payment_method = req.body.return_payment_method;
            const return_payment_number = req.body.return_payment_number;
            const return_payment_name = req.body.return_payment_name;
            const return_payment_bank = req.body.return_payment_bank;
            const value = req.body.value;
            const payment_method_id = req.body.payment_method_id;
            try {
                const result = await this.overpaymentRepository.create({
                    date: date,
                    customer_id: customer_id,
                    sales_deposit_code_id: sales_deposit_code_id,
                    payment_method_id: payment_method_id,
                    return_payment_date: return_payment_date,
                    return_payment_method: return_payment_method,
                    return_payment_name: return_payment_name,
                    return_payment_bank: return_payment_bank,
                    return_payment_number: return_payment_number,
                    created_at: new Date(),
                    created_by: userID,
                    value: value,
                });
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating overpayment ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            const page = (0, escape_helper_1.translatePage)(req.query.page);
            const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
            const sortBy = req.query.sortBy;
            const sortDirection = req.query.sortDirection;
            try {
                const result = await this.overpaymentRepository.fetch({
                    page: page,
                    pageSize: pageSize,
                    sortBy: sortBy,
                    sortDirection: sortDirection,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching overpayment data ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.overpaymentRepository.fetchByID(id);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching overpayment data ${error}`);
                return res.status(500).send(error);
            }
        };
        this.overpaymentRepository = overpaymentRepository;
    }
}
exports.OverpaymentController = OverpaymentController;
//# sourceMappingURL=overpayment.controller.js.map