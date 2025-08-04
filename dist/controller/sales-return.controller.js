"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
class SalesReturnController {
    constructor(salesReturnRepository, salesInvoiceRepository, stockRepository, stockOutRepository, stockCardRepository) {
        this.create = async (req, res) => {
            try {
                const date = new Date(req.body.date);
                const payment_method_id = req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
                const items = req.body.sales_return;
                const userID = req.body.userId;
                const sales_return = req.body.sales_return;
                const name = this.generateName(date);
                const sales_invoice_code_id = req.body.sales_invoice_code_id;
                // first need to check if the quantity satisfies
                const validation = await this.salesInvoiceRepository.validateSalesReturn(sales_return);
                if (!validation) {
                    return res.status(400).send(error_list_1.default["Sales return insufficient"]);
                }
                const result = await this.salesReturnRepository.create({
                    date: date,
                    payment_method_id: payment_method_id,
                    name: name,
                    created_by: userID,
                    created_at: new Date(),
                    confirmed_by: userID,
                    confirmed_at: new Date(),
                    is_confirm: true,
                    is_delete: false,
                    sales_return: items.map((x) => {
                        return {
                            sales_invoice_id: x.sales_invoice_id,
                            quantity: x.quantity,
                            sales_return_code_id: 0,
                        };
                    }),
                    sales_invoice_code_id: sales_invoice_code_id,
                });
                if (!result) {
                    return res.status(400).send(error_list_1.default["Sales return creation failed"]);
                }
                await this.stockRepository.updateMany(result.sales_return.map((x) => {
                    var _a;
                    return {
                        quantity: x.quantity *
                            (((_a = x.sales_invoice) === null || _a === void 0 ? void 0 : _a.product_unit) == null
                                ? 1
                                : x.sales_invoice.product_unit.conversion),
                        productID: x.sales_invoice.product_id,
                    };
                }));
                await this.stockCardRepository.createMany(result.sales_return.map((x) => {
                    var _a;
                    return {
                        date: result.date,
                        quantity: x.quantity *
                            (((_a = x.sales_invoice) === null || _a === void 0 ? void 0 : _a.product_unit) == null
                                ? 1
                                : x.sales_invoice.product_unit.conversion),
                        display_quantity: x.quantity,
                        product_id: x.sales_invoice.product_id,
                        product_unit_id: x.sales_invoice.product_unit_id,
                        supplier_id: null,
                        customer_id: result.sales_invoice_code.customerID,
                        stock: null,
                        document_name: result.name,
                        adjustment_case_code_id: null,
                        adjustment_case_id: null,
                        sales_return_id: x.id,
                        sales_return_code_id: result.id,
                        good_receipt_code_id: null,
                        good_receipt_id: null,
                        sales_invoice_id: x.sales_invoice_id,
                        sales_invoice_code_id: result.sales_invoice_code_id,
                        created_at: new Date(),
                    };
                }));
                await this.stockOutRepository.decreaseMany(result.sales_return.map((x) => {
                    var _a;
                    return {
                        sales_invoice_id: x.sales_invoice_id,
                        quantity: x.quantity *
                            (((_a = x.sales_invoice) === null || _a === void 0 ? void 0 : _a.product_unit) == null
                                ? 1
                                : x.sales_invoice.product_unit.conversion),
                    };
                }));
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on creating sales return: ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const result = await this.salesReturnRepository.fetchByID(id);
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error during fetching sales invoice ${error}`);
                return res.status(500).send(error);
            }
        };
        this.fetchAnnualArchives = async (req, res) => {
            try {
                const result = await this.salesReturnRepository.fetchAnnualArchives();
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching annual good receipt archives ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.fetchArchives = async (req, res) => {
            const year = Number(req.body.year);
            const month = Number(req.body.month);
            const page = (0, escape_helper_1.translatePage)(req.body.page);
            const pageSize = Number(process.env.LIMIT);
            const keyword = (0, escape_helper_1.translateKeyword)(req.body.keyword);
            const isDelete = req.body.isDelete;
            const isActive = req.body.isActive;
            try {
                const result = await this.salesReturnRepository.fetchArchives({
                    month: month,
                    year: year,
                    page: page,
                    pageSize: pageSize,
                    keyword: keyword,
                    isDelete: isDelete,
                    isActive: isActive,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetching good receipt archives ${error}`);
                return res.status(500).send(error_list_1.default["Internal server error"]);
            }
        };
        this.salesReturnRepository = salesReturnRepository;
        this.salesInvoiceRepository = salesInvoiceRepository;
        this.stockRepository = stockRepository;
        this.stockOutRepository = stockOutRepository;
        this.stockCardRepository = stockCardRepository;
    }
    generateName(date) {
        const name = `RJ-${date.getFullYear()}-${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`;
        return name;
    }
}
SalesReturnController.deleteByID = (req, res) => {
    // const id = parseInt(req.params.id.toString());
    // const userID = req.body.userId;
    // SalesReturnModel.fetchByID(id).then((salesReturn) => {
    //   if (!salesReturn) {
    //     return res.status(404).send(ErrorList["Not found"]);
    //   }
    //   if (salesReturn.is_delete) {
    //     return res.status(404).send(ErrorList["Not found"]);
    //   }
    //   SalesReturnModel.deleteByID(id, userID)
    //     .then(async (result) => {
    //       for (let i = 0; i < result.sales_return.length; i++) {
    //         await queue.add("delete-stock-return", {
    //           salesReturnID: result.sales_return[i].id,
    //         });
    //         if (result.sales_return[i].bill.item != null) {
    //           const overflowBill = await mongoOverflowModel.findOne({
    //             billID: result.sales_return[i].bill_id,
    //             itemID: result.sales_return[i].bill.item!.id,
    //           });
    //           if (overflowBill) {
    //             const itemUnit = result.sales_return[i].bill.item_unit;
    //             const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
    //             await queue.add("insert-stock-out-plain", {
    //               itemID: overflowBill.itemID,
    //               billID: result.sales_return[i].bill_id,
    //               billCodeID: result.sales_return[i].bill.bill_code.id,
    //               adjustmentCaseID: null,
    //               adjustmentCaseCodeID: null,
    //               date: result.date,
    //               quantity:
    //                 Number(result.sales_return[i].quantity) * conversion,
    //               value: overflowBill.value,
    //             });
    //           } else {
    //             const bill = await mongoStockOutModel.findOne({
    //               billID: result.sales_return[i].bill_id,
    //               itemID: result.sales_return[i].bill.item!.id,
    //             });
    //             if (!bill) {
    //               console.error(`[error]: Bill not found`);
    //             } else {
    //               const itemUnit = result.sales_return[i].bill.item_unit;
    //               const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
    //               await queue.add("insert-stock-out-plain", {
    //                 itemID: bill.itemID,
    //                 billID: result.sales_return[i].bill_id,
    //                 billCodeID: result.sales_return[i].bill.bill_code.id,
    //                 adjustmentCaseID: null,
    //                 adjustmentCaseCodeID: null,
    //                 date: result.date,
    //                 quantity:
    //                   Number(result.sales_return[i].quantity) * conversion,
    //                 value: bill.value,
    //               });
    //             }
    //           }
    //         } else if (result.sales_return[i].bill.package_code != null) {
    //           for (
    //             let n = 0;
    //             n <
    //             result.sales_return[i].bill.package_code!.package_content
    //               .length;
    //             n++
    //           ) {
    //             const bill = await mongoStockOutModel.findOne({
    //               billID: result.sales_return[i].bill_id,
    //               itemID:
    //                 result.sales_return[i].bill.package_code!.package_content[n]
    //                   .item.id,
    //             });
    //             if (!bill) {
    //               console.error(`[error]: Bill not found`);
    //             } else {
    //               const itemUnit =
    //                 result.sales_return[i].bill.package_code!.package_content[n]
    //                   .item_unit;
    //               const conversion = itemUnit ? Number(itemUnit.conversion) : 1;
    //               await queue.add("insert-stock-out", {
    //                 itemID: bill.itemID,
    //                 billID: result.sales_return[i].bill_id,
    //                 billCodeID: result.sales_return[i].bill.bill_code.id,
    //                 adjustmentCaseID: null,
    //                 adjustmentCaseCodeID: null,
    //                 date: result.date,
    //                 quantity:
    //                   Number(result.sales_return[i].quantity) *
    //                   Number(
    //                     result.sales_return[i].bill.package_code!
    //                       .package_content[n].quantity
    //                   ) *
    //                   conversion,
    //                 value: bill.value,
    //               });
    //             }
    //           }
    //         }
    //       }
    //       return res.status(201).send(result);
    //     })
    //     .catch((error) => {
    //       return res.status(500).send(error);
    //     });
    // });
};
exports.default = SalesReturnController;
//# sourceMappingURL=sales-return.controller.js.map