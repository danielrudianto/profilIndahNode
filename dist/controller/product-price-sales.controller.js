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
const item_model_1 = require("../model/item.model");
const item_price_model_1 = __importDefault(require("../model/item_price.model"));
const exceljs_1 = __importDefault(require("exceljs"));
const error_list_1 = __importDefault(require("../assets/error_list"));
class ItemPriceController {
}
_a = ItemPriceController;
// Basic controllers including CRUD operations (Create, Read, Update, and Delete)
ItemPriceController.fetchAll = (req, res) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);
    const result = [];
    item_model_1.ItemModel.fetchAll(date)
        .then((items) => {
        items.forEach((item) => {
            result.push({
                reference: item.reference,
                description: item.description,
                item_brand: item.item_brand,
                item_price: item.item_price,
            });
        });
        return res.status(200).send(items.map((x) => {
            return {
                reference: x.reference,
                description: x.description,
                item_brand: x.item_brand,
                price: x.item_price.filter((x) => x.item_unit == null)[0].price,
                discount: x.item_price.filter((x) => x.item_unit == null)[0]
                    .discount,
                item_price: x.item_price.filter((x) => x.item_unit != null),
            };
        }));
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPriceController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    item_price_model_1.default.fetch(keyword, date, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return {
                    id: x.id,
                    reference: x.reference,
                    description: x.description,
                    count: x.count,
                    price: x.price,
                    discount: x.discount,
                    effective_date: new Date(x.effective_date),
                };
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPriceController.update = (req, res) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const price = req.body.price;
    const discount = req.body.discount;
    const userID = req.body.userId;
    item_price_model_1.default.fetchByItemID(item_id, item_unit_id)
        .then((item) => {
        if (item == null || item.length == 0) {
            const itemPrice = new item_price_model_1.default(price, discount, item_id, item_unit_id, userID, new Date());
            itemPrice.create().then((result) => {
                return res.status(201).send(result);
            });
        }
        else {
            const latest_price = item[0].price;
            const latest_discount = item[0].discount;
            if (latest_price == price && latest_discount == discount) {
                return res.status(201).send(item[0]);
            }
            else {
                const itemPrice = new item_price_model_1.default(price, discount, item_id, item_unit_id, userID, new Date());
                itemPrice
                    .update()
                    .then((result) => {
                    return res.status(201).send(result);
                })
                    .catch((error) => {
                    return res.status(500).send(error);
                });
            }
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPriceController.createBulk = (req, res) => {
    const effective_date = new Date();
    const items = req.body;
    const transactions = [];
    items.forEach((x) => {
        const id = x.id;
        const item_unit_id = x.item_unit_id;
        const price = x.price;
        const discount = x.discount;
        const item_price = new item_price_model_1.default(price, discount, id, item_unit_id, req.body.userId, effective_date);
        transactions.push(item_price_model_1.default.delete(id, item_unit_id, req.body.userId));
        transactions.push(item_price.create());
    });
    Promise.all(transactions)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(error);
        return res.status(500).send(error);
    });
};
ItemPriceController.fetchByItemID = (req, res) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    item_price_model_1.default.fetchByItemID(item_id, item_unit_id)
        .then((result) => {
        if (!result || result.length == 0) {
            return res.status(404).send(error_list_1.default["Not found"]);
        }
        else {
            return res.status(200).send(result[0]);
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPriceController.fetchFormat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const brand_id = req.body.brand_id;
    const type_id = req.body.type_id;
    const setting = 0;
    const rows = [
        [
            "ID",
            "Item_unit_id",
            "Referensi",
            "Deskripsi",
            "Merek",
            "Tipe",
            "Satuan",
            "Konversi",
            "Satuan dasar",
            "Harga",
            "Potongan harga",
        ],
    ];
    const columns_width = [];
    columns_width.push(rows[rows.length - 1].map((item) => {
        return item.toString().length;
    }));
    item_model_1.ItemModel.fetchItemPriceByBrandType(brand_id, type_id, setting)
        .then((items) => {
        items.forEach((x) => {
            var _b;
            rows.push([
                x.item_id,
                x.item_unit == null ? 0 : x.item_unit.id,
                x.item.reference,
                x.item.description,
                x.item.item_brand.name,
                (_b = x.item.item_type) === null || _b === void 0 ? void 0 : _b.name,
                x.item_unit == null ? x.item.unit : x.item_unit.unit,
                x.item_unit == null
                    ? 1
                    : parseFloat(x.item_unit.conversion.toString()),
                x.item.unit,
                parseFloat(x.price.toString()),
                parseFloat(x.discount.toString()),
            ]);
            // Adjusting column width
            columns_width.push(rows[rows.length - 1].map((item) => {
                return item.toString().length;
            }));
        });
        const workbook = new exceljs_1.default.Workbook();
        // Setting up workbook properties
        workbook.creator = "Toko Profil Indah";
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.lastModifiedBy = "Toko Profil Indah";
        const sheet = workbook.addWorksheet("Perubahan Harga Jual", {
            state: "visible",
            views: [
                {
                    state: "frozen",
                    xSplit: 9,
                    ySplit: 1,
                },
            ],
        });
        sheet.state = "visible";
        rows.forEach((data) => {
            sheet.addRow(data);
        });
        sheet.getRow(1).font = {
            name: "Calibri",
            color: {
                argb: "FF000000",
            },
            family: 2,
            size: 12,
            italic: false,
            bold: true,
        };
        for (let i = 0; i < items.length; i++) {
            sheet.getRow(i + 2).font = {
                name: "Calibri",
                color: {
                    argb: "FF000000",
                },
                family: 2,
                size: 11,
                italic: false,
                bold: false,
            };
            sheet.getRow(i + 2).alignment = {
                vertical: "middle",
                horizontal: "center",
                wrapText: true,
            };
            sheet.getCell(`I${i + 1}`).dataValidation = {
                type: "whole",
                operator: "greaterThan",
                showErrorMessage: true,
                allowBlank: false,
                formulae: [0],
                promptTitle: "Zero value validation",
                prompt: "Nilai harga harus lebih besar atau sama dengan 0.",
            };
            sheet.getCell(`J${i + 1}`).dataValidation = {
                type: "whole",
                operator: "greaterThan",
                showErrorMessage: true,
                allowBlank: false,
                formulae: [0],
                promptTitle: "Zero value validation",
                prompt: "Nilai potongan harga harus lebih besar atau sama dengan 0.",
            };
        }
        sheet.getColumn(1).hidden = true;
        sheet.getColumn(2).hidden = true;
        sheet.getColumn(3).width = 18;
        sheet.getColumn(4).width = 60;
        sheet.getColumn(5).width = 12;
        sheet.getColumn(6).width = 12;
        sheet.getColumn(7).width = 12;
        sheet.getColumn(8).width = 18;
        sheet.getColumn(9).numFmt = "#,###.00";
        sheet.getColumn(10).numFmt = "#,###.00";
        sheet.getColumn(11).numFmt = "#,###.00";
        workbook.xlsx
            .writeBuffer()
            .then((buffer) => {
            return res.status(200).send({
                data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(buffer).toString("base64")}`,
            });
        })
            .catch((error) => {
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
});
exports.default = ItemPriceController;
