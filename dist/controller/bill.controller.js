"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_validator_1 = require("express-validator");
const log_helper_1 = __importDefault(require("../helper/log.helper"));
const query_transaction_helper_1 = __importDefault(require("../helper/query.transaction.helper"));
const socket_helper_1 = __importDefault(require("../helper/socket.helper"));
const bill_model_1 = __importDefault(require("../model/bill.model"));
const bill_code_model_1 = __importDefault(require("../model/bill_code.model"));
const item_model_1 = require("../model/item.model");
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const pdfmake_1 = __importDefault(require("pdfmake"));
const path_1 = __importDefault(require("path"));
class BillController {
}
BillController.create = (req, res) => {
    const validation_result = (0, express_validator_1.validationResult)(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const customer_id = req.body.customer_id;
    const payment_method_id = req.body.payment_method_id;
    const discount = parseFloat(req.body.discount);
    const delivery = parseFloat(req.body.delivery);
    const service = parseFloat(req.body.service);
    const bill = req.body.bill;
    const date = !req.body.date || req.body.date == null
        ? new Date()
        : new Date(req.body.date);
    const bill_code = new bill_code_model_1.default(customer_id, req.body.userId, payment_method_id, discount, delivery, service, date);
    bill_code
        .create()
        .then((result) => {
        Promise.all([
            bill_model_1.default.create(bill.map((x) => {
                return {
                    item_id: x.item_id,
                    item_unit_id: x.item_unit_id,
                    price: x.price,
                    discount: x.discount,
                    quantity: x.quantity,
                    bill_code_id: result.id,
                };
            })),
            item_price_model_1.default.updateMany(bill.filter((x) => x.save), req.body.userId),
        ])
            .then(() => {
            log_helper_1.default.log(new Date(), "info", `${result.user_bill_code_created_byTouser.name} berhasil menambahkan faktur penjualan ${result.name} (ID: ${result.id})`, "Bill controller - Create", req.body.userId);
            return res.status(201).send(result);
        })
            .catch((error) => {
            console.error(error);
            log_helper_1.default.log(new Date(), "error", error, "Bill controller - Create", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        console.error(error);
        log_helper_1.default.log(new Date(), "error", error, "Bill controller - Create", req.body.userId);
        return res.status(500).send(error);
    });
};
BillController.createPrintoutDraft = (req, res) => {
    const items = req.body;
    item_model_1.ItemModel.fetchByItemUnitIds(items.map((x) => {
        return {
            item_id: x.id,
            item_unit_id: x.item_unit_id,
        };
    })).then((result) => {
        return res.status(200).send(result);
    });
};
BillController.createPrintout = (req, res) => {
    var formatter = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "IDR",
    });
    var numberFormatter = new Intl.NumberFormat();
    const bill_table = [];
    let i = 0;
    let totalBill = 0;
    let blackLinesIndex = [];
    let greyLinesIndex = [];
    req.body.items.forEach((x) => {
        if (i != 0) {
            greyLinesIndex.push(i.toString());
        }
        bill_table.push([
            {
                stack: [
                    {
                        text: x.reference,
                        bold: true,
                        fontSize: 10,
                        alignment: "left",
                    },
                    {
                        text: x.description,
                        bold: false,
                        fontSize: 12,
                        alignment: "left",
                        margins: [0, 0, 0, 10],
                    },
                ],
            },
            {},
        ]);
        i++;
        blackLinesIndex.push(i.toString());
        x.quantity.forEach((item) => {
            const price = parseFloat(item.price);
            const quantity = item.quantity;
            const unit = item.unit;
            const total = quantity * price;
            bill_table.push([
                {
                    text: `${numberFormatter.format(quantity)} ${unit} x ${formatter.format(price)}`,
                },
                {
                    text: formatter.format(total),
                },
            ]);
            totalBill += total;
            i++;
        });
    });
    blackLinesIndex.push(i.toString());
    bill_table.push([
        {
            text: "Total",
            bold: true,
            fontSize: 12,
        },
        {
            text: formatter.format(totalBill),
        },
    ]);
    const fontDescriptors = {
        Roboto: {
            normal: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-Regular.ttf"),
            bold: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-Medium.ttf"),
            italics: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-Italic.ttf"),
            bolditalics: path_1.default.join(__dirname, "..", "assets", "/fonts/Cairo-MediumItalic.ttf"),
        },
    };
    let documentDefinition = {
        pageSize: req.body.size,
        pageOrientation: "portrait",
        content: [
            {
                layout: {
                    hLineColor: function (i, node) {
                        return blackLinesIndex.includes(i.toString()) ||
                            i == node.table.body.length ||
                            i == 0
                            ? "black"
                            : "grey";
                    },
                    hLineWidth: function (i, node) {
                        return blackLinesIndex.includes(i.toString()) || i == 0 ? 1 : 0;
                    },
                    vLineWidth: function (i, node) {
                        return 0;
                    },
                },
                table: {
                    headerRows: 0,
                    widths: ["*", "auto"],
                    body: bill_table,
                },
                margin: [0, 0, 0, 15],
            },
            {
                text: "Price mentioned above does not include a discount. Discount value can be checked on register.",
                bold: true,
                color: "grey",
                fontSize: 10,
                alignment: "left",
                margin: [0, 0, 0, 5],
            },
        ],
    };
    const printer = new pdfmake_1.default(fontDescriptors);
    const pdfDocument = printer.createPdfKitDocument(documentDefinition);
    let chunks = [];
    var pdfResult;
    pdfDocument.on("data", function (chunk) {
        chunks.push(chunk);
    });
    pdfDocument.on("end", function () {
        pdfResult = Buffer.concat(chunks);
        return res.status(200).send({
            data: `data:application/pdf;base64,${pdfResult.toString("base64")}`,
        });
    });
    pdfDocument.end();
};
BillController.fetchCodeById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    bill_code_model_1.default.fetchCodeById(id)
        .then((result) => {
        return res.status(200).send(result === null || result === void 0 ? void 0 : result.bill_code);
    })
        .catch((error) => {
        log_helper_1.default.log(new Date(), "error", error, "Bill controller - Fetch code by ID", req.body.userId);
        return res.status(500).send(error);
    });
};
BillController.fetchById = (req, res) => {
    const id = parseInt(req.params.id);
    bill_code_model_1.default.fetchById(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
BillController.searchArchive = (req, res) => {
    const keyword = !req.query.keyword
        ? ""
        : decodeURIComponent(req.query.keyword.toString());
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const offset = (page - 1) * 10;
    Promise.all([
        bill_code_model_1.default.searchArchives(keyword, offset),
        bill_code_model_1.default.searchCountArchives(keyword),
    ])
        .then((result) => {
        return res.status(200).send({
            data: result[0],
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
BillController.fetchArchive = (req, res) => {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);
    if (!req.params.year && !req.params.month) {
        const archive_years = bill_code_model_1.default.fetchArchiveYears();
        const count_archive_years = bill_code_model_1.default.countArchiveByYear();
        const transaction = new query_transaction_helper_1.default();
        transaction
            .create([archive_years, count_archive_years])
            .then((result) => {
            const response = [];
            result[0].forEach((item) => {
                response.push({
                    year: item.year,
                    count: result[1].filter((x) => x.year == item.year)[0]
                        .count,
                });
            });
            return res.status(200).send(response);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (!req.params.month) {
        const count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        bill_code_model_1.default.countArchiveByMonth(year)
            .then((counts) => {
            counts.forEach((x) => {
                const month = x.month;
                const num = x.count;
                count[month - 1] = num;
            });
            return res.status(200).send(count);
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else if (req.params.year && req.params.month) {
        const page = !req.query.page
            ? 1
            : Math.max(parseInt(req.query.page.toString()), 1);
        const limit = parseInt(process.env.LIMIT.toString());
        const offset = (page - 1) * limit;
        const transaction = new query_transaction_helper_1.default();
        transaction
            .create([
            bill_code_model_1.default.fetchArchive(year, month, offset, limit),
            bill_code_model_1.default.countArchive(year, month),
        ])
            .then((result) => {
            return res.status(200).send({
                data: result[0],
                count: result[1],
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    }
    else {
        return res.status(400).send("Input tidak dikenal.");
    }
};
BillController.deleteById = (req, res) => {
    const id = parseInt(req.params.id.toString());
    bill_code_model_1.default.deleteById(id, req.body.userId)
        .then((result) => {
        const socket = new socket_helper_1.default("deleteBill", result);
        socket.create();
        return res.status(201).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
exports.default = BillController;
