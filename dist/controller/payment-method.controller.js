"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const escape_helper_1 = require("../helper/escape.helper");
class PaymentMethodController {
    constructor(paymentMethodRepository) {
        this.create = async (req, res) => {
            const name = req.body.name;
            const description = req.body.description;
            const userID = req.body.userId;
            try {
                const result = await this.paymentMethodRepository.create({
                    name: name,
                    description: description,
                    created_by: userID,
                });
                const socket = new socket_helper_1.default("createPaymentMethod", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on create payment method: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.update = async (req, res) => {
            const id = parseInt(req.body.id);
            const name = req.body.name;
            const description = req.body.description;
            const userID = req.body.userId;
            try {
                const paymentMethod = await this.paymentMethodRepository.fetchByID(id);
                if (!paymentMethod) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (paymentMethod.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const result = await this.paymentMethodRepository.update({
                    id: id,
                    name: name,
                    description: description,
                    created_by: userID,
                    created_at: new Date(),
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on update payment method: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            try {
                const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
                const page = (0, escape_helper_1.translatePage)(req.query.page);
                const pageSize = parseInt(process.env.LIMIT);
                const result = await this.paymentMethodRepository.fetch({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetch payment methods: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAutocomplete = async (req, res) => {
            const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
            try {
                const result = await this.paymentMethodRepository.fetchAutocomplete(keyword);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetch autocomplete payment methods: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.paymentMethodRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetch payment method: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAll = async (req, res) => {
            try {
                const result = await this.paymentMethodRepository.fetchAll();
                return res.status(200).send([
                    {
                        id: null,
                        name: "Cash",
                        description: "Cash payment",
                        can_delete: false,
                    },
                    ...result,
                ]);
            }
            catch (error) {
                console.error(`[error]: Error on fetch all payment methods: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            try {
                const paymentMethod = await this.paymentMethodRepository.fetchByID(id);
                if (!paymentMethod) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (paymentMethod.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const result = await this.paymentMethodRepository.delete(id, userID);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on delete payment method: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.paymentMethodRepository = paymentMethodRepository;
    }
}
exports.default = PaymentMethodController;
//# sourceMappingURL=payment-method.controller.js.map