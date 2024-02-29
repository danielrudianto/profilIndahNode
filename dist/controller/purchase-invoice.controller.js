"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
const queue_helper_1 = require("../helper/queue.helper");
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const good_receipt_model_1 = __importDefault(require("../model/good_receipt.model"));
const item_purchase_price_model_1 = __importDefault(require("../model/item_purchase_price.model"));
const purchase_invoice_model_1 = __importDefault(require("../model/purchase-invoice.model"));
class PurchaseInvoiceController {
}
_a = PurchaseInvoiceController;
/**
 * Create a new purchase invoice
 * @param req
 * @param res
 */
PurchaseInvoiceController.create = (req, res) => {
    var _b;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const purchase_invoice = req.body.purchase_invoice;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur = !purchase_invoice.faktur || ((_b = purchase_invoice.faktur) === null || _b === void 0 ? void 0 : _b.length) < 16
        ? null
        : purchase_invoice.faktur;
    const userID = req.body.userId;
    const uuid = req.body.uuid;
    purchase_invoice_model_1.default.create({
        uuid: uuid,
        name: name,
        date: date,
        supplier_id: supplier_id,
        company_id: company_id,
        created_by: userID,
        purchase_invoice: {
            date: date,
            name: purchase_invoice_name,
            faktur: faktur,
            discount: discount,
            created_by: userID,
        },
        good_receipt: good_receipt_items.map((x) => {
            return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                quantity: x.quantity,
                price: x.price,
                discount: x.discount,
            };
        }),
        purchase_invoice_name: purchase_invoice_name,
    })
        .then((good_receipt_result) => __awaiter(void 0, void 0, void 0, function* () {
        yield item_purchase_price_model_1.default.delete(good_receipt_items
            .filter((x) => x.save)
            .map((x) => {
            return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                deleted_by: userID,
            };
        }));
        yield item_purchase_price_model_1.default.create(good_receipt_items
            .filter((x) => x.save)
            .map((x) => {
            return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                created_by: userID,
                price: x.price,
                discount: x.discount,
            };
        }));
        const socket = new socket_helper_1.default("createGoodReceipt", {
            supplier_id: good_receipt_result.supplier_id,
            company_id: good_receipt_result.company_id,
        });
        socket.create();
        const createPurchaseInvoiceTotalValue = good_receipt_result.good_receipt.reduce((a, b) => {
            return (a + (Number(b.price) - Number(b.discount)) * Number(b.quantity));
        }, 0);
        const createPurchaseInvoiceDiscount = good_receipt_result.purchase_invoice == null
            ? 0
            : Number(good_receipt_result.purchase_invoice.discount || 0);
        const createPurchaseInvoiceNetValue = createPurchaseInvoiceTotalValue - createPurchaseInvoiceDiscount;
        for (let i = 0; i < good_receipt_result.good_receipt.length; i++) {
            const goodReceiptItem = good_receipt_result.good_receipt[i];
            const stockIn = {
                itemID: goodReceiptItem.item.id,
                createdAt: good_receipt_result.created_at,
                date: good_receipt_result.date,
                document: good_receipt_result.name,
                opponent: good_receipt_result.supplier.name,
                displayQuantity: Number(goodReceiptItem.quantity),
                unit: goodReceiptItem.item_unit == null
                    ? goodReceiptItem.item.unit
                    : goodReceiptItem.item_unit.unit,
                quantity: Number(goodReceiptItem.quantity) *
                    (goodReceiptItem.item_unit == null
                        ? 1
                        : Number(goodReceiptItem.item_unit.conversion)),
                billID: null,
                billCodeID: null,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                goodReceiptID: goodReceiptItem.id,
                goodReceiptCodeID: good_receipt_result.id,
                salesReturnID: null,
                salesReturnCodeID: null,
                customerID: null,
                supplierID: good_receipt_result.supplier_id,
                companyID: good_receipt_result.company_id,
                price: createPurchaseInvoiceTotalValue == 0
                    ? 0
                    : ((Number(goodReceiptItem.price) -
                        Number(goodReceiptItem.discount)) *
                        createPurchaseInvoiceNetValue) /
                        createPurchaseInvoiceTotalValue,
            };
            yield queue_helper_1.queue.add("insert-stock-in", stockIn);
        }
        return res.status(201).send(good_receipt_result);
    }))
        .catch((error) => {
        console.error(`[error]: Error on creating purchase invoice ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Fetch purchase invoice by ID
 * @param req
 * @param res
 */
PurchaseInvoiceController.fetchByID = (req, res) => {
    const id = parseInt(req.params.id);
    purchase_invoice_model_1.default.fetchByID(id)
        .then((result) => {
        if (!result) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        let subTotal = 0;
        for (let item of result.good_receipt_code.good_receipt) {
            subTotal += Number(item.price) * Number(item.quantity);
        }
        return res.status(200).send(Object.assign(Object.assign({}, result), { subTotal: subTotal, total: subTotal - (result.discount == null ? 0 : Number(result.discount)) }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
/**
 * Update purchase invoice
 * @param req
 * @param res
 */
PurchaseInvoiceController.update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt;
    const updatePurchaseInvoice = req.body.purchase_invoice;
    const faktur = updatePurchaseInvoice.faktur == null
        ? null
        : updatePurchaseInvoice.faktur.toString().length < 16
            ? null
            : updatePurchaseInvoice.faktur;
    const discount = updatePurchaseInvoice.discount;
    const purchase_invoice_name = updatePurchaseInvoice.name;
    const purchaseInvoice = yield purchase_invoice_model_1.default.fetchByID(id);
    if (!purchaseInvoice) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    if (purchaseInvoice.is_delete) {
        return res
            .status(400)
            .send(error_list_1.default["Purchase invoice already deleted"]);
    }
    const goodReceipt = yield good_receipt_model_1.default.fetchByID(purchaseInvoice.good_receipt_code_id);
    if (!goodReceipt) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    if (goodReceipt.is_delete) {
        return res.status(400).send(error_list_1.default["Good receipt already deleted"]);
    }
    purchase_invoice_model_1.default.update({
        id: id,
        name: purchase_invoice_name,
        date: date,
        faktur: faktur,
        discount: discount,
        good_receipt_code: {
            supplier_id: supplier_id,
            company_id: company_id,
            name: name,
            date: date,
            good_receipt: good_receipt_items.map((x) => {
                return {
                    item_id: x.item_id,
                    item_unit_id: x.item_unit_id,
                    quantity: x.quantity,
                    price: x.price,
                    discount: x.discount,
                };
            }),
        },
    })
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < goodReceipt.good_receipt.length; i++) {
            yield queue_helper_1.queue.add("delete-stock-in", {
                goodReceiptID: goodReceipt.good_receipt[i].id,
                adjustmentCaseID: null,
                itemID: goodReceipt.good_receipt[i].item.id,
                quantity: Number(goodReceipt.good_receipt[i].quantity) *
                    (goodReceipt.good_receipt[i].item_unit == null
                        ? 1
                        : Number(goodReceipt.good_receipt[i].item_unit.conversion)),
            });
        }
        const createPurchaseInvoiceTotalValue = result.good_receipt_code.good_receipt.reduce((a, b) => {
            return (a + (Number(b.price) - Number(b.discount)) * Number(b.quantity));
        }, 0);
        const createPurchaseInvoiceDiscount = result.discount == null ? 0 : Number(result.discount || 0);
        const createPurchaseInvoiceNetValue = createPurchaseInvoiceTotalValue - createPurchaseInvoiceDiscount;
        for (let n = 0; n < result.good_receipt_code.good_receipt.length; n++) {
            const stockIn = {
                itemID: result.good_receipt_code.good_receipt[n].item.id,
                createdAt: result.created_at,
                date: result.good_receipt_code.date,
                document: result.good_receipt_code.name,
                opponent: result.good_receipt_code.supplier.name,
                displayQuantity: Number(result.good_receipt_code.good_receipt[n].quantity),
                unit: result.good_receipt_code.good_receipt[n].item_unit == null
                    ? result.good_receipt_code.good_receipt[n].item.unit
                    : result.good_receipt_code.good_receipt[n].item_unit.unit,
                quantity: Number(result.good_receipt_code.good_receipt[n].quantity) *
                    (result.good_receipt_code.good_receipt[n].item_unit == null
                        ? 1
                        : Number(result.good_receipt_code.good_receipt[n].item_unit
                            .conversion)),
                billID: null,
                billCodeID: null,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                goodReceiptID: result.good_receipt_code.good_receipt[n].id,
                goodReceiptCodeID: result.good_receipt_code.id,
                salesReturnID: null,
                salesReturnCodeID: null,
                customerID: null,
                supplierID: result.good_receipt_code.supplier_id,
                companyID: result.good_receipt_code.company_id,
                price: createPurchaseInvoiceTotalValue == 0
                    ? 0
                    : ((Number(result.good_receipt_code.good_receipt[n].price) -
                        Number(result.good_receipt_code.good_receipt[n].discount)) *
                        createPurchaseInvoiceNetValue) /
                        createPurchaseInvoiceTotalValue,
            };
            yield queue_helper_1.queue.add("insert-stock-in", stockIn);
        }
        return res.status(201).send(result);
    }))
        .catch((error) => {
        console.error(`[error]: Error on updating good receipt ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
/**
 * Fetch unconfirmed purchase invoice
 * @param req
 * @param res
 */
PurchaseInvoiceController.fetchUnconfirmed = (req, res) => {
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    purchase_invoice_model_1.default.fetchUnconfirmed(offset, limit)
        .then(([purchaseInvoiceResult, purchaseInvoiceCount]) => {
        return res.status(200).send({
            data: purchaseInvoiceResult,
            count: purchaseInvoiceCount,
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching unconfirmed purchase invoice ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Update purchase invoice status
 * Either confirm or delete
 * @param req
 * @param res
 * @returns
 */
PurchaseInvoiceController.updateStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const id = parseInt(req.body.id);
    const is_confirm = req.body.is_confirm;
    const is_delete = req.body.is_delete;
    const userID = req.body.userId;
    const purchaseInvoice = yield purchase_invoice_model_1.default.fetchByID(id);
    if (!purchaseInvoice) {
        return res.status(404).send(error_list_1.default["Invoice not found"]);
    }
    if (purchaseInvoice.is_confirm) {
        return res.status(400).send(error_list_1.default["Invoice already confirmed"]);
    }
    if (purchaseInvoice.is_delete) {
        return res.status(400).send(error_list_1.default["Invoice already deleted"]);
    }
    const goodReceiptCodeID = purchaseInvoice.good_receipt_code_id;
    const goodReceipt = (yield good_receipt_model_1.default.fetchByID(goodReceiptCodeID));
    if (!goodReceipt) {
        return res.status(404).send(error_list_1.default["Good receipt not found"]);
    }
    if (is_confirm) {
        const discount = req.body.discount;
        const good_receipt = req.body.good_receipt;
        const good_receipt_name = req.body.good_receipt_name;
        const purchase_invoice_name = req.body.name;
        const date = new Date(req.body.date);
        if (goodReceipt.purchase_invoice == null) {
            return res.status(404).send(error_list_1.default["Purchase invoice not found"]);
        }
        if (goodReceipt.purchase_invoice.is_confirm) {
            return res
                .status(400)
                .send(error_list_1.default["Purchase invoice already confirmed"]);
        }
        if (goodReceipt.purchase_invoice.is_delete) {
            return res
                .status(400)
                .send(error_list_1.default["Purchase invoice already deleted"]);
        }
        purchase_invoice_model_1.default.confirmByID({
            id: id,
            discount: discount,
            good_receipt: good_receipt.map((x) => {
                return {
                    id: x.id,
                    price: x.price,
                    discount: x.discount,
                };
            }),
            good_receipt_name: good_receipt_name,
            purchase_invoice_name: purchase_invoice_name,
            date: date,
            confirmed_by: userID,
        }).then((updatePurchaseInvoiceResult) => __awaiter(void 0, void 0, void 0, function* () {
            const socket = new socket_helper_1.default("updatePurchaseDocumentStatus", updatePurchaseInvoiceResult[0]);
            socket.create();
            const updatedPurchaseInvoice = yield purchase_invoice_model_1.default.fetchByID(id);
            if (!updatedPurchaseInvoice) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            const createPurchaseInvoiceTotalValue = updatedPurchaseInvoice.good_receipt_code.good_receipt.reduce((a, b) => {
                return (a + (Number(b.price) - Number(b.discount)) * Number(b.quantity));
            }, 0);
            const createPurchaseInvoiceDiscount = Number(updatePurchaseInvoiceResult[0].discount);
            for (let i = 0; i < updatedPurchaseInvoice.good_receipt_code.good_receipt.length; i++) {
                const itemID = updatedPurchaseInvoice.good_receipt_code.good_receipt[i].item.id;
                const goodReceiptID = updatedPurchaseInvoice.good_receipt_code.good_receipt[i].id;
                const price = createPurchaseInvoiceTotalValue == 0
                    ? 0
                    : ((Number(updatedPurchaseInvoice.good_receipt_code.good_receipt[i].price) -
                        Number(updatedPurchaseInvoice.good_receipt_code.good_receipt[i]
                            .discount)) *
                        (createPurchaseInvoiceTotalValue -
                            createPurchaseInvoiceDiscount)) /
                        createPurchaseInvoiceTotalValue;
                yield queue_helper_1.queue.add("update-stock-in", {
                    itemID: itemID,
                    goodReceiptID: goodReceiptID,
                    goodReceiptCodeID: goodReceiptCodeID,
                    price: price,
                });
            }
            if (good_receipt.filter((x) => x.save).length > 0) {
                // Search for saved items
                yield item_purchase_price_model_1.default.delete(good_receipt
                    .filter((x) => x.save)
                    .map((x) => {
                    const itemIndex = updatePurchaseInvoiceResult[0].good_receipt_code.good_receipt.findIndex((y) => y.id == x.id);
                    const itemID = updatePurchaseInvoiceResult[0].good_receipt_code.good_receipt[itemIndex].item.id;
                    const itemUnitID = updatePurchaseInvoiceResult[0].good_receipt_code.good_receipt[itemIndex].item_unit == null
                        ? null
                        : updatePurchaseInvoiceResult[0].good_receipt_code
                            .good_receipt[itemIndex].item_unit.id;
                    return {
                        item_id: itemID,
                        item_unit_id: itemUnitID,
                        deleted_by: userID,
                    };
                }));
                // Then save the price
                yield item_purchase_price_model_1.default.create(good_receipt
                    .filter((x) => x.save)
                    .map((x) => {
                    const itemIndex = updatePurchaseInvoiceResult[0].good_receipt_code.good_receipt.findIndex((y) => y.id == x.id);
                    const itemID = updatePurchaseInvoiceResult[0].good_receipt_code.good_receipt[itemIndex].item.id;
                    const itemUnitID = updatePurchaseInvoiceResult[0].good_receipt_code.good_receipt[itemIndex].item_unit == null
                        ? null
                        : updatePurchaseInvoiceResult[0].good_receipt_code
                            .good_receipt[itemIndex].item_unit.id;
                    return {
                        item_id: itemID,
                        item_unit_id: itemUnitID,
                        price: x.price,
                        discount: x.discount,
                        created_by: userID,
                    };
                }));
            }
            return res.status(200).send(updatePurchaseInvoiceResult);
        }));
    }
    else if (is_delete) {
        const [purchaseInvoiceUpdate, _] = yield purchase_invoice_model_1.default.deleteByID({
            id: id,
            deleted_by: userID,
        });
        // Create delete good receipt
        for (let i = 0; i < purchaseInvoiceUpdate.good_receipt_code.good_receipt.length; i++) {
            yield queue_helper_1.queue.add("delete-stock-in", {
                itemID: purchaseInvoiceUpdate.good_receipt_code.good_receipt[i].item_id,
                goodReceiptID: purchaseInvoiceUpdate.good_receipt_code.good_receipt[i].id,
                adjustmentCaseID: null,
                quantity: Number(purchaseInvoiceUpdate.good_receipt_code.good_receipt[i].quantity) *
                    (purchaseInvoiceUpdate.good_receipt_code.good_receipt[i]
                        .item_unit == null
                        ? 1
                        : Number((_b = purchaseInvoiceUpdate.good_receipt_code.good_receipt[i]
                            .item_unit) === null || _b === void 0 ? void 0 : _b.conversion)),
            });
        }
        const socket = new socket_helper_1.default("updatePurchaseDocumentStatus", purchaseInvoiceUpdate);
        socket.create();
        return res.status(200).send(purchaseInvoiceUpdate);
    }
});
/**
 * Fetch purchase invoice archive
 * @param req
 * @param res
 */
PurchaseInvoiceController.fetchArchive = (req, res) => {
    const mode = req.body.mode;
    const year = req.body.year;
    const month = req.body.month;
    if (year == null) {
        purchase_invoice_model_1.default.fetchArchiveYears()
            .then((result) => {
            return res.status(200).send(result
                .map((x) => {
                return {
                    year: x.year,
                    count: parseInt(x.count.toString()),
                };
            })
                .sort((a, b) => {
                return a.year - b.year;
            }));
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching purchase invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else if (year != null && month == null) {
        purchase_invoice_model_1.default.fetchArchiveMonths(year)
            .then((result) => {
            const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            result.forEach((x) => {
                response[x.month - 1] = parseInt(x.count.toString());
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching purchase invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
    else {
        const page = req.body.limit.page;
        const keyword = req.body.search.keyword;
        purchase_invoice_model_1.default.fetchArchive({
            year: year,
            month: month,
            mode: mode,
            limit: 10,
            offset: (page - 1) * 10,
            keyword: (0, escape_helper_1.mysql_real_escape_string)(keyword),
        })
            .then((result) => {
            return res.status(200).send({
                data: result[0].map((x) => {
                    return {
                        id: x.id,
                        name: x.name,
                        date: x.date,
                        is_delete: x.is_delete == 1,
                        is_confirm: x.is_confirm == 1,
                        supplier_name: x.supplier_name,
                        company_name: x.company_name,
                    };
                }),
                count: result[1] == null || result[1].length == 0
                    ? 0
                    : parseInt(result[1][0].count.toString()),
            });
        })
            .catch((error) => {
            console.error(`[error]: Error on fetching purchase invoice archive ${error}`);
            return res.status(500).send(error_list_1.default["Internal server error"]);
        });
    }
};
/**
 * Search purchase invoices
 * @param req
 * @param res
 */
PurchaseInvoiceController.search = (req, res) => {
    const suppliers = req.body.suppliers;
    const items = req.body.items;
    const companies = req.body.companies;
    const date = req.body.date;
    const page = req.body.page;
    const search = req.body.keyword;
    const status = req.body.status;
    const formattedDate_1 = date[0] == null
        ? null
        : `${new Date(date[0]).getFullYear()}}-${(new Date(date[0]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[0])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    const formattedDate_2 = date[1] == null
        ? null
        : `${new Date(date[1]).getFullYear()}}-${(new Date(date[1]).getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${new Date(date[1])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    purchase_invoice_model_1.default.search(suppliers, companies, items, [formattedDate_1, formattedDate_2], (0, escape_helper_1.mysql_real_escape_string)(search !== null && search !== void 0 ? search : ""), page, status)
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: parseInt(result[1][0].count.toString()),
        });
    })
        .catch((error) => {
        console.error(`[error]: Error while searching purchase invoices ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
};
/**
 * Delete purchase invoice by ID
 * @param req
 * @param res
 * @returns
 */
PurchaseInvoiceController.deleteByID = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = parseInt(req.params.id);
    const userID = req.body.userID;
    const purchaseInvoice = yield purchase_invoice_model_1.default.fetchByID(id);
    if (!purchaseInvoice) {
        return res.status(404).send(error_list_1.default["Not found"]);
    }
    if (purchaseInvoice.is_delete) {
        return res
            .status(400)
            .send(error_list_1.default["Purchase invoice already deleted"]);
    }
    const goodReceiptCodeID = purchaseInvoice.good_receipt_code_id;
    const goodReceipt = (yield good_receipt_model_1.default.fetchByID(goodReceiptCodeID));
    purchase_invoice_model_1.default.deleteByID({
        id: id,
        deleted_by: userID,
    })
        .then((result) => __awaiter(void 0, void 0, void 0, function* () {
        for (let i = 0; i < goodReceipt.good_receipt.length; i++) {
            yield queue_helper_1.queue.add("delete-stock-in", {
                itemID: goodReceipt.good_receipt[i].item.id,
                goodReceiptID: goodReceipt.good_receipt[i].id,
                adjustmentCaseID: null,
                quantity: Number(goodReceipt.good_receipt[i].quantity) *
                    (goodReceipt.good_receipt[i].item_unit == null
                        ? 1
                        : Number(goodReceipt.good_receipt[i].item_unit.conversion)),
            });
        }
        return res.status(201).send(result);
    }))
        .catch((error) => {
        console.error(`[error]: Error while deleting purchase invoice ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
/**
 * Fetch purchase invoice dashboard
 * @param req
 * @param res
 */
PurchaseInvoiceController.fetchDashboard = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // 1 Fetch today's sales
    // 2 Fetch this month's sales
    // 3 Fetch yesterday's sales
    // 4 Fetch last month's sales
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    Promise.all([
        purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate()),
        purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, today.getDate() - 1),
        purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), today.getMonth() + 1, null),
        purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), today.getMonth(), null),
        purchase_invoice_model_1.default.fetchByDate(today.getFullYear(), today.getMonth(), -today.getDate()),
    ])
        .then(([purchase1, purchase2, purchase3, purchase4, purchase5]) => {
        return res.status(200).send({
            today: purchase1[0].value == null ? 0 : Number(purchase1[0].value),
            yesterday: purchase2[0].value == null ? 0 : Number(purchase2[0].value),
            thisMonth: purchase3[0].value == null ? 0 : Number(purchase3[0].value),
            lastMonth: purchase4[0].value == null ? 0 : Number(purchase4[0].value),
            monthOnMonth: purchase5[0].value == null ? 0 : Number(purchase5[0].value),
        });
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching sales data. ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
exports.default = PurchaseInvoiceController;
//# sourceMappingURL=purchase-invoice.controller.js.map