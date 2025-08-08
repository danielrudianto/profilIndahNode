"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
class SupplierController {
    constructor(supplierRepository, goodReceiptRepository) {
        this.create = async (req, res) => {
            const name = req.body.name;
            const address = req.body.address;
            const npwp = req.body.npwp.toString().length == 15 ? req.body.npwp : null;
            const userID = req.body.userId;
            const supplier = await this.supplierRepository.create({
                name: name,
                address: address,
                npwp: npwp,
                created_by: userID,
                created_at: new Date(),
            });
            const socket = new socket_helper_1.default("createSupplier", supplier);
            socket.create();
            return res.status(201).send(supplier);
        };
        this.update = async (req, res) => {
            try {
                const id = Number(req.body.id);
                const name = req.body.name;
                const address = req.body.address;
                const npwp = (0, escape_helper_1.translateNPWP)(req.body.npwp);
                const userID = req.body.userId;
                const result = await this.supplierRepository.update({
                    id: id,
                    name: name,
                    address: address,
                    npwp: npwp,
                    created_by: userID,
                    created_at: new Date(),
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on updating supplier ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.delete = async (req, res) => {
            const id = Number(req.params.id);
            const userID = req.body.userId;
            try {
                const supplier = await this.supplierRepository.fetchByID(id);
                if (!supplier) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                if (supplier.is_delete) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const count = await this.goodReceiptRepository.countBySupplierID(id);
                if (count > 0) {
                    return res.status(400).send(error_list_1.default["Supplier has been used"]);
                }
                const result = await this.supplierRepository.delete(id, userID);
                const socket = new socket_helper_1.default("deleteSupplier", result);
                socket.create();
                return res.status(201).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on deleting supplier data ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetch = async (req, res) => {
            try {
                const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
                const page = (0, escape_helper_1.translatePage)(req.query.page);
                // const pageSize = parseInt(process.env.LIMIT!);
                const pageSize = (0, escape_helper_1.translatePageSize)(req.query.pageSize);
                const result = await this.supplierRepository.fetch({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching supplier data ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchAutocomplete = async (req, res) => {
            try {
                const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
                const result = await this.supplierRepository.fetchAutocomplete(keyword);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching autocomplete supplier data ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            try {
                const id = Number(req.params.id);
                const result = await this.supplierRepository.fetchByID(id);
                if (!result) {
                    return res.status(404).send(error_list_1.default["Not found"]);
                }
                const count = await this.goodReceiptRepository.countBySupplierID(id);
                result.can_delete = count == 0;
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching supplier ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.supplierRepository = supplierRepository;
        this.goodReceiptRepository = goodReceiptRepository;
    }
}
exports.default = SupplierController;
//# sourceMappingURL=supplier.controller.js.map