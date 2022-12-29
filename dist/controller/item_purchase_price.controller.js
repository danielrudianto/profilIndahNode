import { io } from "../app";
import { ItemModel } from "../model/item.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import LogHelper from "../helper/log.helper";
import ExcelJS from "exceljs";
import UserModel from "../model/user.model";
import { validationResult } from "express-validator";
class ItemPurchasePriceController {
}
ItemPurchasePriceController.fetchByReference = (req, res) => {
    const reference = decodeURIComponent(req.params.reference.toString());
    ItemPurchasePriceModel.fetchByReference(reference)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.fetchById = (req, res) => {
    const validation_result = validationResult(req);
    if (!validation_result.isEmpty()) {
        return res.status(400).send(validation_result.array()[0].msg);
    }
    const id = parseInt(req.params.id.toString());
    ItemPurchasePriceModel.fetchById(id)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.fetch = (req, res) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
        ? 1
        : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT);
    const offset = (page - 1) * limit;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);
    ItemPurchasePriceModel.fetch(keyword, offset, limit)
        .then((result) => {
        return res.status(200).send({
            data: result[0].map((x) => {
                return Object.assign(Object.assign({}, x), { price: x.item_price_purchase.filter((y) => y.item_unit_id == null)
                        .length == 0
                        ? 0
                        : x.item_price_purchase.filter((x) => x.item_unit_id == null)[0].price, item_price_purchase: x.item_price_purchase.filter((x) => x.item_unit != null) });
            }),
            count: result[1],
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Item purchase price controller - Fetch", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.create = (req, res) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const price = req.body.price;
    const created_by = req.body.userId;
    const item_purchase_price = new ItemPurchasePriceModel(price, item_id, created_by, item_unit_id);
    item_purchase_price
        .update()
        .then((result) => {
        ItemPurchasePriceModel.fetchById(result[1].id)
            .then((item_purchase) => {
            io.emit("updatePurchasingPrice", item_purchase);
            return res.status(201).send(item_purchase);
        })
            .catch((error) => {
            LogHelper.log(new Date(), "error", error, "Item purchase price controller - update", req.body.userId);
            return res.status(500).send(error);
        });
    })
        .catch((error) => {
        LogHelper.log(new Date(), "error", error, "Item purchase price controller - update", req.body.userId);
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.createBulk = (req, res) => {
    const transactions = [];
    const data = req.body.data;
    data.forEach((x, index) => {
        const price = x.price;
        const item_unit_id = x.item_unit_id;
        const item_id = x.id;
        const updated_price = data.filter((y) => y.id == x.id)[0].price;
        if (updated_price != price) {
            const itemPurchasePriceModel = new ItemPurchasePriceModel(updated_price, item_id, req.body.userId, item_unit_id);
            transactions.push(ItemPurchasePriceModel.delete(item_id, item_unit_id, req.body.userId));
            transactions.push(itemPurchasePriceModel.create());
        }
    });
    Promise.all(transactions)
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
ItemPurchasePriceController.getXlsx = (req, res) => {
    UserModel.fetchById(req.body.userId)
        .then((user) => {
        if (user == null) {
            return res.status(401).send("Pengguna tidak ditemukan.");
        }
        else {
            const brand_id = req.body.brand_id;
            const type_id = req.body.type_id;
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
                ],
            ];
            const columns_width = [];
            columns_width.push(rows[rows.length - 1].map((item) => {
                return item.toString().length;
            }));
            ItemModel.fetchItemPurchasePriceByBrandType(brand_id, type_id)
                .then((items) => {
                items.forEach((x) => {
                    var _a;
                    rows.push([
                        x.item_id,
                        x.item_unit_id == null ? 0 : x.item_unit_id,
                        x.item.reference,
                        x.item.description,
                        x.item.item_brand.name,
                        (_a = x.item.item_type) === null || _a === void 0 ? void 0 : _a.name,
                        x.item_unit == null ? x.item.unit : x.item_unit.unit,
                        x.item_unit == null
                            ? 1
                            : parseFloat(x.item_unit.conversion.toString()),
                        x.item.unit,
                        parseFloat(x.price.toString()),
                    ]);
                });
                const workbook = new ExcelJS.Workbook();
                // Setting up workbook properties
                workbook.creator = "Toko Profil Indah";
                workbook.lastModifiedBy = user === null || user === void 0 ? void 0 : user.name;
                workbook.created = new Date();
                const sheet = workbook.addWorksheet("Perubahan Harga Beli", {
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
                sheet.getColumn(9).protection = {
                    locked: false,
                };
                sheet.getColumn(9).numFmt = "#,###.00";
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
                console.error(error);
                LogHelper.log(new Date(), error, "error", "Item price controller - getXlsx", req.body.userId);
                return res.status(500).send(error);
            });
        }
    })
        .catch((error) => {
        return res.status(500).send(error);
    });
};
export default ItemPurchasePriceController;
