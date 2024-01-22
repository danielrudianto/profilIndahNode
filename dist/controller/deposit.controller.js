"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class DepositController {
}
DepositController.create = (req, res) => {
    const customer_id = req.body.customer_id;
    const items = req.body.items;
    const discount = req.body.discount;
    const delivery = req.body.delivery;
    const service = req.body.service;
    const uuid = req.body.uuid;
    const payments = req.body.payments;
};
DepositController.fetchByID = (req, res) => { };
DepositController.fetch = (req, res) => { };
DepositController.completeByID = (req, res) => { };
DepositController.deleteByID = (req, res) => { };
exports.default = DepositController;
//# sourceMappingURL=deposit.controller.js.map