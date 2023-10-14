import e, { Request, Response } from "express";
import mongoose from "mongoose";
import { meili } from "../app";
import { fetchMode } from "../interface/fetch.interface";
import AdjustmentCaseCodeModel from "../model/adjustment-case.model";
import BillCodeModel from "../model/bill_code.model";
import CustomerModel from "../model/customer.model";
import { ItemModel } from "../model/item.model";
import { ProductPackageCodeModel } from "../model/product-package.model";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";
import SalesReturnModel from "../model/sales_return.model";
import { mongoOverflowModel } from "../mongo-model/mongo-overflow.model";
import { mongoProductModel } from "../mongo-model/mongo-product.model";
import { mongoStockInModel } from "../mongo-model/mongo-stock-in.model";

export enum syncMode {
  Product,
  Customer,
  Package,
  ProductNoSQL,
}

class SearchHelper {
  /**
   * Sync product, customer, or package data to meilisearch
   * @param req
   * @param res
   */
  static syncMasterData = async (req: Request, res: Response) => {
    const mode = req.body.mode as syncMode;
    switch (mode) {
      case syncMode.Product:
        await meili.index("item").deleteAllDocuments();
        await meili.index("item").updateSettings({
          searchableAttributes: ["reference", "description"],
          rankingRules: [
            "words",
            "typo",
            "proximity",
            "attribute",
            "exactness",
          ],
          distinctAttribute: "reference",
          synonyms: {
            "rel fe": ["Rel full extension"],
            shelf: ["rak"],
            knob: ["handle", "knop"],
            double: ["doble", "dobel", "dubel", "dobel", "dubbel", "dubbel"],
            "double bracket": [
              "doble bracket",
              "dobel bracket",
              "dubel bracket",
            ],
            bracket: ["breket"],
            profile: ["profil"],
            hinge: ["engsel"],
            hing: ["engsel"],
            lis: ["list"],
            "lubang angin": ["lubang udara", "lubang hawa"],
            tacosheet: ["sheet"],
            sss: ["stainless steel"],
            ss: ["stainless steel"],
            bb: ["ball bearing"],
            "ball bearing": ["bb"],
          },
          typoTolerance: {
            enabled: true,
          },
          pagination: {
            maxTotalHits: 20,
          },
        });
        ItemModel.fetchAll(new Date())
          .then(async (items) => {
            await meili.index("item").addDocumentsInBatches(
              items.map((x) => {
                return {
                  id: x.id,
                  reference: x.reference,
                  description: x.description,
                  brand: x.item_brand.name,
                  type: x.item_type.name,
                  itemmBrandID: x.item_brand_id,
                  itemTypeID: x.item_type_id,
                };
              })
            );
            console.log("[info]: Indexing search data completed.");
            return res.status(200).send({
              message: "Sync product success",
            });
          })
          .catch((error) => {
            console.log(`[error]: Error while indexing search data. ${error}`);
            return res.status(500).send(error);
          });
        break;
      case syncMode.Customer:
        await meili.index("customer").deleteAllDocuments();
        CustomerModel.fetch("", 0, 0, fetchMode.All)!
          .then(async (customers) => {
            await meili.index("customer").addDocumentsInBatches(
              (customers as any[]).map((x) => {
                return {
                  id: x.id,
                  name: x.name,
                  address: x.address,
                  phone: x.phone,
                  email: x.email,
                  pic: x.pic,
                };
              })
            );

            console.log("[info]: Indexing search data completed.");
            return res.status(200).send({
              message: "Sync customer success",
            });
          })
          .catch((error) => {
            console.log(`[error]: Error while fetching customer data ${error}`);
            return res.status(500).send(error);
          });
        break;
      case syncMode.Package:
        await meili.index("package").deleteAllDocuments();
        ProductPackageCodeModel.fetchAll()
          .then(async (packages) => {
            await meili.index("package").addDocumentsInBatches(
              packages.map((x) => {
                return {
                  id: x.id,
                  name: x.name,
                  description: x.description,
                  price: x.price,
                  product_content: x.package_content.map((y) => {
                    return {
                      quantity: y.quantity,
                      item: {
                        reference: y.item.reference,
                        description: y.item.description,
                        unit: y.item.unit,
                      },
                      item_unit:
                        y.item_unit == null
                          ? null
                          : {
                              unit: y.item_unit.unit,
                              conversion: y.item_unit.conversion,
                            },
                    };
                  }),
                };
              })
            );
            console.log("[info]: Indexing search data completed.");
            return res.status(200).send({
              message: "Sync package success",
            });
          })
          .catch((error) => {
            console.log(`[error]: Error while fetching package data ${error}`);
            return res.status(500).send(error);
          });
        break;
      case syncMode.ProductNoSQL:
        const url = "mongodb://127.0.0.1:27017";
        await mongoose.connect(url, {
          dbName: "ProfilIndah",
          autoCreate: true,
        });
        mongoProductModel
          .deleteMany({})
          .then(() => {
            ItemModel.fetchAll(new Date())
              .then(async (items) => {
                await mongoProductModel.insertMany(
                  items.map((x) => {
                    return {
                      reference: x.reference,
                      description: x.description,
                      itemID: x.id,
                      itemTypeID: x.item_type_id,
                      itemBrandID: x.item_brand_id,
                      currentStock: 0,
                      unit: x.unit,
                      stockCard: [],
                    };
                  })
                );

                console.log("[info]: Sync product NoSQL completed.");
                return res.status(200).send({
                  message: "Sync product NoSQL success",
                });
              })
              .catch((error) => {
                console.error(`[error]: Error on sync product NoSQL. ${error}`);
                return res.status(500).send(error);
              });
          })
          .catch((error) => {
            console.error(`[error]: Error on deleting product NoSQL. ${error}`);
            return res.status(500).send(error);
          });

        break;
    }
  };

  /**
   * Reset stock in data
   * @param req
   * @param res
   */
  static syncProductIn = async (req: Request, res: Response) => {
    const url = "mongodb://127.0.0.1:27017";
    await mongoose.connect(url, {
      dbName: "ProfilIndah",
      autoCreate: true,
    });

    Promise.all([
      PurchaseInvoiceModel.fetchAll(),
      AdjustmentCaseCodeModel.fetchAll(),
    ]).then(([purchaseInvoiceResult, adjustmentCaseCodeResult]) => {
      mongoStockInModel.deleteMany({}).then(() => {
        purchaseInvoiceResult.forEach((purchaseInvoice) => {
          // Insert all stock in
          const goodReceiptCreatedAt =
            purchaseInvoice.good_receipt_code.created_at;
          const companyID = purchaseInvoice.good_receipt_code.company_id;
          const goodReceiptCodeID = purchaseInvoice.good_receipt_code.id;
          const goodReceiptDate = purchaseInvoice.good_receipt_code.date;
          const goodReceiptName = purchaseInvoice.good_receipt_code.name;
          const goodReceiptSupplier =
            purchaseInvoice.good_receipt_code.supplier;
          const discount = purchaseInvoice.discount;
          const goodReceiptPrice =
            purchaseInvoice.good_receipt_code.good_receipt.reduce((a, b) => {
              return (
                a +
                parseFloat(b.price.toString()) *
                  parseFloat(b.quantity.toString())
              );
            }, 0);

          const goodReceiptNetPrice =
            goodReceiptPrice -
            (discount == null ? 0 : parseFloat(discount.toString()));

          purchaseInvoice.good_receipt_code.good_receipt.forEach(
            async (goodReceipt) => {
              const quantity = parseFloat(goodReceipt.quantity.toString());
              const conversion =
                goodReceipt.item_unit == null
                  ? 1
                  : parseFloat(goodReceipt.item_unit.conversion.toString());
              const unit =
                goodReceipt.item_unit == null
                  ? goodReceipt.item.unit
                  : goodReceipt.item_unit.unit;
              const finalUnitPrice =
                (parseFloat(goodReceipt.price.toString()) *
                  goodReceiptNetPrice) /
                (goodReceiptPrice *
                  (goodReceipt.item_unit == null
                    ? 1
                    : parseFloat(goodReceipt.item_unit.conversion.toString())));
              console.log(
                `[info]: Inserting stock in for ${goodReceipt.item.reference}`
              );

              await mongoProductModel.findOneAndUpdate(
                {
                  itemID: goodReceipt.item.id,
                },
                {
                  $inc: {
                    currentStock:
                      parseFloat(goodReceipt.quantity.toString()) *
                      (goodReceipt.item_unit == null
                        ? 1
                        : parseFloat(
                            goodReceipt.item_unit.conversion.toString()
                          )),
                  },
                  $push: {
                    stockCard: {
                      createdAt: goodReceiptCreatedAt,
                      date: goodReceiptDate,
                      document: goodReceiptName,
                      quantity: quantity * conversion,
                      displayQuantity: goodReceipt.quantity,
                      unit: unit,
                      billID: null,
                      billCodeID: null,
                      adjustmentCaseID: null,
                      adjustmentCaseCodeID: null,
                      goodReceiptCodeID: goodReceiptCodeID,
                      goodReceiptID: goodReceipt.id,
                      salesReturnID: null,
                      salesReturnCodeID: null,
                      opponent: goodReceiptSupplier.name,
                      supplierID: goodReceiptSupplier.id,
                      customerID: null,
                    },
                  },
                }
              );

              await mongoStockInModel.create({
                companyID: companyID,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                goodReceiptCodeID: goodReceiptCodeID,
                date: goodReceiptDate,
                price: finalUnitPrice,
                itemID: goodReceipt.item.id,
                residue:
                  parseFloat(goodReceipt.quantity.toString()) *
                  (goodReceipt.item_unit == null
                    ? 1
                    : parseFloat(goodReceipt.item_unit.conversion.toString())),
                quantity:
                  parseFloat(goodReceipt.quantity.toString()) *
                  (goodReceipt.item_unit == null
                    ? 1
                    : parseFloat(goodReceipt.item_unit.conversion.toString())),
              });
            }
          );
        });

        adjustmentCaseCodeResult.forEach((adjustmentCaseCode) => {
          const companyID = adjustmentCaseCode.company_id;
          const adjustmentCaseCodeID = adjustmentCaseCode.id;
          const adjustmentCaseCodeName = adjustmentCaseCode.name;
          const adjustmentCaseCodeDate = adjustmentCaseCode.date;
          const adjustmentCaseCreatedAt = adjustmentCaseCode.created_at;

          adjustmentCaseCode.adjustment_case.forEach(async (adjustmentCase) => {
            if (parseFloat(adjustmentCase.quantity.toString()) > 0) {
              const quantity = parseFloat(adjustmentCase.quantity.toString());
              const conversion =
                adjustmentCase.item_unit == null
                  ? 1
                  : parseFloat(adjustmentCase.item_unit.conversion.toString());
              const unit =
                adjustmentCase.item_unit == null
                  ? adjustmentCase.item.unit
                  : adjustmentCase.item_unit.unit;

              console.log(
                `[info]: Inserting stock in for ${adjustmentCase.item.reference}`
              );

              await mongoProductModel.findOneAndUpdate(
                {
                  itemID: adjustmentCase.item.id,
                },
                {
                  $inc: {
                    currentStock:
                      parseFloat(adjustmentCase.quantity.toString()) *
                      (adjustmentCase.item_unit == null
                        ? 1
                        : parseFloat(
                            adjustmentCase.item_unit.conversion.toString()
                          )),
                  },
                  $push: {
                    stockCard: {
                      createdAt: adjustmentCaseCreatedAt,
                      date: adjustmentCaseCodeDate,
                      opponent: "Internal",
                      document: adjustmentCaseCodeName,
                      quantity: quantity * conversion,
                      displayQuantity: quantity,
                      unit: unit,
                      billID: null,
                      billCodeID: null,
                      adjustmentCaseID: adjustmentCase.id,
                      adjustmentCaseCodeID: adjustmentCaseCodeID,
                      goodReceiptCodeID: null,
                      goodReceiptID: null,
                      salesReturnID: null,
                      salesReturnCodeID: null,
                    },
                  },
                }
              );

              console.log(
                `[info]: Inserting stock in for ${adjustmentCase.item.reference}`
              );

              await mongoStockInModel.create({
                companyID: companyID,
                adjustmentCaseID: adjustmentCase.id,
                adjustmentCaseCodeID: adjustmentCaseCodeID,
                goodReceiptCodeID: null,
                goodReceiptDate: null,
                date: adjustmentCaseCodeDate,
                itemID: adjustmentCase.item.id,
                price: 0,
                residue:
                  parseFloat(adjustmentCase.quantity.toString()) *
                  (adjustmentCase.item_unit == null
                    ? 1
                    : parseFloat(
                        adjustmentCase.item_unit.conversion.toString()
                      )),
                quantity:
                  parseFloat(adjustmentCase.quantity.toString()) *
                  (adjustmentCase.item_unit == null
                    ? 1
                    : parseFloat(
                        adjustmentCase.item_unit.conversion.toString()
                      )),
              });
            }
          });
        });

        return res.status(200).send({
          message: "Stock in sync success",
        });
      });
    });
  };

  /**
   * Reset stock out data
   * @param req
   * @param res
   */
  static syncProductOut = async (req: Request, res: Response) => {
    const url = "mongodb://127.0.0.1:27017";
    await mongoose.connect(url, {
      dbName: "ProfilIndah",
      autoCreate: true,
    });

    Promise.all([
      BillCodeModel.fetchAll(),
      SalesReturnModel.fetchAll(),
      AdjustmentCaseCodeModel.fetchAll(),
    ])
      .then(
        ([salesInvoiceResult, salesReturnResult, adjustmentCaseCodeResult]) => {
          console.log(`[info]: Syncing stock out data`);
          const stockOut: any[] = [];
          salesInvoiceResult.forEach((x) => {
            const invoiceValue = x.bill.reduce((a, b) => {
              return (
                a +
                parseFloat(b.price.toString()) *
                  parseFloat(b.quantity.toString())
              );
            }, 0);
            const invoiceNetValue =
              invoiceValue +
              parseFloat(x.delivery.toString()) +
              parseFloat(x.service.toString()) -
              parseFloat(x.discount.toString());

            for (let i = 0; i < x.bill.length; i++) {
              if (x.bill[i].package_code != null) {
                const billPrice = parseFloat(x.bill[i].price.toString());
                const billQuantity = parseFloat(x.bill[i].quantity.toString());
                const billDiscount = parseFloat(x.bill[i].discount.toString());
                const packageNetValue =
                  ((billPrice - billDiscount) * invoiceNetValue) / invoiceValue;
                const packageTotalValue = x.bill[
                  i
                ].package_code!.package_content.reduce((a, b) => {
                  return (
                    a +
                    (parseFloat(b.price.toString()) -
                      parseFloat(b.discount.toString())) *
                      parseFloat(b.quantity.toString())
                  );
                }, 0);

                for (
                  let n = 0;
                  n < x.bill[i].package_code!.package_content.length;
                  n++
                ) {
                  const itemID =
                    x.bill[i].package_code?.package_content[n].item.id;
                  const quantity = parseFloat(
                    x.bill[i].package_code!.package_content[
                      n
                    ].quantity.toString()
                  );
                  const conversion =
                    x.bill[i].package_code?.package_content[n].item_unit == null
                      ? 1
                      : parseFloat(
                          x.bill[i].package_code!.package_content[
                            n
                          ].item_unit!.conversion.toString()
                        );

                  const itemPrice = parseFloat(
                    x.bill[i].package_code!.package_content[n].price.toString()
                  );

                  const itemDiscount = parseFloat(
                    x.bill[i].package_code!.package_content[
                      n
                    ].discount.toString()
                  );

                  const itemNetPrice =
                    packageTotalValue == 0
                      ? 0
                      : ((itemPrice - itemDiscount) * packageNetValue) /
                        (packageTotalValue * conversion);

                  stockOut.push({
                    itemID: itemID,
                    createdAt: x.created_at,
                    date: x.date,
                    document: x.name,
                    opponent:
                      x.customer == null ? "Retail customer" : x.customer.name,
                    displayQuantity: billQuantity * quantity,
                    quantity: billQuantity * quantity * conversion,
                    unit:
                      x.bill[i].package_code!.package_content[n].item_unit ==
                      null
                        ? x.bill[i].package_code!.package_content[n].item.unit
                        : x.bill[i].package_code!.package_content[n].item_unit!
                            .unit,
                    billID: x.bill[i].id,
                    billCodeID: x.id,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    goodReceiptID: null,
                    goodReceiptCodeID: null,
                    salesReturnID: null,
                    salesReturnCodeID: null,
                    value: itemNetPrice,
                    supplierID: null,
                    customerID: x.customer == null ? null : x.customer.id,
                  });
                }
              } else if (x.bill[i].item != null) {
                const itemID = x.bill[i].item!.id;
                const billPrice = parseFloat(x.bill[i].price.toString());
                const billQuantity = parseFloat(x.bill[i].quantity.toString());
                const billDiscount = parseFloat(x.bill[i].discount.toString());
                const billConversion =
                  x.bill[i].item_unit == null
                    ? 1
                    : parseFloat(x.bill[i].item_unit!.conversion.toString());
                const billNetPrice =
                  ((billPrice - billDiscount) * invoiceNetValue) /
                  (invoiceValue * billConversion);
                stockOut.push({
                  itemID: itemID,
                  createdAt: x.created_at,
                  date: x.date,
                  document: x.name,
                  opponent:
                    x.customer == null ? "Retail customer" : x.customer.name,
                  displayQuantity: billQuantity,
                  quantity: billQuantity * billConversion,
                  unit:
                    x.bill[i].item_unit == null
                      ? x.bill[i].item!.unit
                      : x.bill[i].item_unit!.unit,
                  billID: x.bill[i].id,
                  billCodeID: x.id,
                  adjustmentCaseID: null,
                  adjustmentCaseCodeID: null,
                  goodReceiptID: null,
                  goodReceiptCodeID: null,
                  salesReturnID: null,
                  salesReturnCodeID: null,
                  value: billNetPrice,
                  supplierID: null,
                  customerID: x.customer == null ? null : x.customer.id,
                });
              }
            }
          });

          salesReturnResult.forEach((salesReturn) => {
            const salesReturnCreatedAt = salesReturn.created_at;
            const salesReturnName = salesReturn.name;
            const salesReturnDate = salesReturn.date;
            const salesReturnID = salesReturn.id;
            const salesReturnCustomer =
              salesReturn.sales_return[0].bill.bill_code.customer == null
                ? "Retail customer"
                : salesReturn.sales_return[0].bill.bill_code.customer.name;
            salesReturn.sales_return.forEach((x) => {
              const quantity = parseFloat(x.quantity.toString());
              if (x.bill.item != null) {
                const unit =
                  x.bill.item_unit == null
                    ? x.bill.item.unit
                    : x.bill.item_unit.unit;
                const conversion =
                  x.bill.item_unit == null
                    ? 1
                    : parseFloat(x.bill.item_unit.conversion.toString());

                stockOut.push({
                  createdAt: salesReturnCreatedAt,
                  date: salesReturnDate,
                  document: salesReturnName,
                  opponent: salesReturnCustomer,
                  displayQuantity: quantity,
                  quantity: quantity * conversion,
                  unit: unit,
                  billID: x.bill.id,
                  billCodeID: x.bill.bill_code_id,
                  adjustmentCaseID: null,
                  adjustmentCaseCodeID: null,
                  goodReceiptID: null,
                  goodReceiptCodeID: null,
                  salesReturnID: x.id,
                  salesReturnCodeID: salesReturnID,
                  value: 0,
                  itemID: x.bill.item.id,
                  supplierID: null,
                  customerID:
                    x.bill.bill_code.customer == null
                      ? null
                      : x.bill.bill_code.customer.id,
                });
              } else if (x.bill.package_code != null) {
                for (
                  let n = 0;
                  n < x.bill.package_code.package_content.length;
                  n++
                ) {
                  const unit =
                    x.bill.package_code.package_content[n].item_unit == null
                      ? x.bill.package_code.package_content[n].item.unit
                      : x.bill.package_code.package_content[n].item_unit!.unit;
                  const conversion =
                    x.bill.package_code.package_content[n].item_unit == null
                      ? 1
                      : parseFloat(
                          x.bill.package_code.package_content[
                            n
                          ].item_unit!.conversion.toString()
                        );

                  stockOut.push({
                    createdAt: salesReturnCreatedAt,
                    date: salesReturnDate,
                    document: salesReturnName,
                    opponent: salesReturnCustomer,
                    displayQuantity: quantity,
                    quantity: quantity * conversion,
                    unit: unit,
                    billID: x.bill.id,
                    billCodeID: x.bill.bill_code_id,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    goodReceiptID: null,
                    goodReceiptCodeID: null,
                    salesReturnID: x.id,
                    salesReturnCodeID: salesReturnID,
                    value: 0,
                    itemID: x.bill.package_code.package_content[n].item.id,
                    supplierID: null,
                    customerID:
                      x.bill.bill_code.customer == null
                        ? null
                        : x.bill.bill_code.customer.id,
                  });
                }
              }
            });
          });

          adjustmentCaseCodeResult.forEach((adjustmentCase) => {
            adjustmentCase.adjustment_case.forEach(async (x) => {
              if (parseFloat(x.quantity.toString()) < 0) {
                const quantity = parseFloat(x.quantity.toString()) * -1;
                const conversion =
                  x.item_unit == null
                    ? 1
                    : parseFloat(x.item_unit!.conversion.toString());
                const unit =
                  x.item_unit == null ? x.item.unit : x.item_unit.unit;

                stockOut.push({
                  createdAt: adjustmentCase.created_at,
                  date: adjustmentCase.date,
                  document: adjustmentCase.name,
                  opponent: "Internal",
                  displayQuantity: quantity,
                  quantity: quantity * conversion,
                  unit: unit,
                  billID: null,
                  billCodeID: null,
                  adjustmentCaseID: x.id,
                  adjustmentCaseCodeID: adjustmentCase.id,
                  goodReceiptID: null,
                  goodReceiptCodeID: null,
                  salesReturnID: null,
                  salesReturnCodeID: null,
                  value: 0,
                  itemID: x.item.id,
                  supplierID: null,
                  customerID: null,
                });
              }
            });
          });

          console.log(`[info]: Stock out array generated`);

          stockOut.forEach(async (x) => {
            console.log(`[info]: Updating stock card for ${x.itemID}`);
            await mongoProductModel.findOneAndUpdate(
              {
                itemID: x.itemID,
              },
              {
                $inc: {
                  currentStock: x.quantity * -1,
                },
                $push: {
                  stockCard: {
                    createdAt: x.createdAt,
                    date: x.date,
                    document: x.document,
                    opponent: x.opponent,
                    displayQuantity: x.displayQuantity * -1,
                    quantity: x.quantity * -1,
                    unit: x.unit,
                    billID: x.billID,
                    billCodeID: x.billCodeID,
                    adjustmentCaseID: x.adjustmentCaseID,
                    adjustmentCaseCodeID: x.adjustmentCaseCodeID,
                    goodReceiptID: x.goodReceiptID,
                    goodReceiptCodeID: x.goodReceiptCodeID,
                    salesReturnID: x.salesReturnID,
                    salesReturnCodeID: x.salesReturnCodeID,
                    value: x.value,
                    customerID: x.customerID,
                    supplierID: x.supplierID,
                  },
                },
              }
            );

            console.log(`[info]: Stock card updated for ${x.itemID}`);
          });

          return res.status(200).send({
            message: "Sync stock card successfully!",
          });
        }
      )
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static syncProductOutCalculation = async (req: Request, res: Response) => {
    const url = "mongodb://127.0.0.1:27017";
    await mongoose.connect(url, {
      dbName: "ProfilIndah",
      autoCreate: true,
    });

    Promise.all([
      BillCodeModel.fetchAll(),
      SalesReturnModel.fetchAll(),
      AdjustmentCaseCodeModel.fetchAll(),
    ]).then(
      async ([
        salesInvoiceResult,
        salesReturnResult,
        adjustmentCaseCodeResult,
      ]) => {
        console.log(`[info]: Syncing stock out data`);
        const stockOut: any[] = [];
        salesInvoiceResult.forEach((x) => {
          const invoiceValue = x.bill.reduce((a, b) => {
            return (
              a +
              parseFloat(b.price.toString()) * parseFloat(b.quantity.toString())
            );
          }, 0);
          const invoiceNetValue =
            invoiceValue +
            parseFloat(x.delivery.toString()) +
            parseFloat(x.service.toString()) -
            parseFloat(x.discount.toString());

          for (let i = 0; i < x.bill.length; i++) {
            if (x.bill[i].package_code != null) {
              const billPrice = parseFloat(x.bill[i].price.toString());
              const billQuantity = parseFloat(x.bill[i].quantity.toString());
              const billDiscount = parseFloat(x.bill[i].discount.toString());
              const packageNetValue =
                ((billPrice - billDiscount) * invoiceNetValue) / invoiceValue;
              const packageTotalValue = x.bill[
                i
              ].package_code!.package_content.reduce((a, b) => {
                return (
                  a +
                  (parseFloat(b.price.toString()) -
                    parseFloat(b.discount.toString())) *
                    parseFloat(b.quantity.toString())
                );
              }, 0);

              for (
                let n = 0;
                n < x.bill[i].package_code!.package_content.length;
                n++
              ) {
                const itemID =
                  x.bill[i].package_code?.package_content[n].item.id;
                const quantity = parseFloat(
                  x.bill[i].package_code!.package_content[n].quantity.toString()
                );
                const conversion =
                  x.bill[i].package_code?.package_content[n].item_unit == null
                    ? 1
                    : parseFloat(
                        x.bill[i].package_code!.package_content[
                          n
                        ].item_unit!.conversion.toString()
                      );

                const itemPrice = parseFloat(
                  x.bill[i].package_code!.package_content[n].price.toString()
                );

                const itemDiscount = parseFloat(
                  x.bill[i].package_code!.package_content[n].discount.toString()
                );

                const itemNetPrice =
                  packageTotalValue == 0
                    ? 0
                    : ((itemPrice - itemDiscount) * packageNetValue) /
                      (packageTotalValue * conversion);

                stockOut.push({
                  itemID: itemID,
                  createdAt: x.created_at,
                  date: x.date,
                  document: x.name,
                  opponent:
                    x.customer == null ? "Retail customer" : x.customer.name,
                  displayQuantity: billQuantity * quantity,
                  quantity: billQuantity * quantity * conversion,
                  unit:
                    x.bill[i].package_code!.package_content[n].item_unit == null
                      ? x.bill[i].package_code!.package_content[n].item.unit
                      : x.bill[i].package_code!.package_content[n].item_unit!
                          .unit,
                  billID: x.bill[i].id,
                  billCodeID: x.id,
                  adjustmentCaseID: null,
                  adjustmentCaseCodeID: null,
                  goodReceiptID: null,
                  goodReceiptCodeID: null,
                  salesReturnID: null,
                  salesReturnCodeID: null,
                  value: itemNetPrice,
                });
              }
            } else if (x.bill[i].item != null) {
              const itemID = x.bill[i].item!.id;
              const billPrice = parseFloat(x.bill[i].price.toString());
              const billQuantity = parseFloat(x.bill[i].quantity.toString());
              const billDiscount = parseFloat(x.bill[i].discount.toString());
              const billConversion =
                x.bill[i].item_unit == null
                  ? 1
                  : parseFloat(x.bill[i].item_unit!.conversion.toString());
              const billNetPrice =
                invoiceValue == 0
                  ? 0
                  : ((billPrice - billDiscount) * invoiceNetValue) /
                    (invoiceValue * billConversion);
              stockOut.push({
                itemID: itemID,
                createdAt: x.created_at,
                date: x.date,
                document: x.name,
                opponent:
                  x.customer == null ? "Retail customer" : x.customer.name,
                displayQuantity: billQuantity,
                quantity: billQuantity * billConversion,
                unit:
                  x.bill[i].item_unit == null
                    ? x.bill[i].item!.unit
                    : x.bill[i].item_unit!.unit,
                billID: x.bill[i].id,
                billCodeID: x.id,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                goodReceiptID: null,
                goodReceiptCodeID: null,
                salesReturnID: null,
                salesReturnCodeID: null,
                value: billNetPrice,
              });
            }
          }
        });

        salesReturnResult.forEach((salesReturn) => {
          const salesReturnCreatedAt = salesReturn.created_at;
          const salesReturnName = salesReturn.name;
          const salesReturnDate = salesReturn.date;
          const salesReturnID = salesReturn.id;
          const salesReturnCustomer =
            salesReturn.sales_return[0].bill.bill_code.customer == null
              ? "Retail customer"
              : salesReturn.sales_return[0].bill.bill_code.customer.name;
          salesReturn.sales_return.forEach((x) => {
            const quantity = parseFloat(x.quantity.toString());
            if (x.bill.item != null) {
              const unit =
                x.bill.item_unit == null
                  ? x.bill.item.unit
                  : x.bill.item_unit.unit;
              const conversion =
                x.bill.item_unit == null
                  ? 1
                  : parseFloat(x.bill.item_unit.conversion.toString());

              stockOut.push({
                createdAt: salesReturnCreatedAt,
                date: salesReturnDate,
                document: salesReturnName,
                opponent: salesReturnCustomer,
                displayQuantity: quantity,
                quantity: quantity * conversion,
                unit: unit,
                billID: x.bill.id,
                billCodeID: x.bill.bill_code_id,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                goodReceiptID: null,
                goodReceiptCodeID: null,
                salesReturnID: x.id,
                salesReturnCodeID: salesReturnID,
                value: 0,
                itemID: x.bill.item.id,
              });
            } else if (x.bill.package_code != null) {
              for (
                let n = 0;
                n < x.bill.package_code.package_content.length;
                n++
              ) {
                const unit =
                  x.bill.package_code.package_content[n].item_unit == null
                    ? x.bill.package_code.package_content[n].item.unit
                    : x.bill.package_code.package_content[n].item_unit!.unit;
                const conversion =
                  x.bill.package_code.package_content[n].item_unit == null
                    ? 1
                    : parseFloat(
                        x.bill.package_code.package_content[
                          n
                        ].item_unit!.conversion.toString()
                      );

                stockOut.push({
                  createdAt: salesReturnCreatedAt,
                  date: salesReturnDate,
                  document: salesReturnName,
                  opponent: salesReturnCustomer,
                  displayQuantity: quantity,
                  quantity: quantity * conversion,
                  unit: unit,
                  billID: x.bill.id,
                  billCodeID: x.bill.bill_code_id,
                  adjustmentCaseID: null,
                  adjustmentCaseCodeID: null,
                  goodReceiptID: null,
                  goodReceiptCodeID: null,
                  salesReturnID: x.id,
                  salesReturnCodeID: salesReturnID,
                  value: 0,
                  itemID: x.bill.package_code.package_content[n].item.id,
                });
              }
            }
          });
        });

        adjustmentCaseCodeResult.forEach((adjustmentCase) => {
          adjustmentCase.adjustment_case.forEach(async (x) => {
            if (parseFloat(x.quantity.toString()) < 0) {
              const quantity = parseFloat(x.quantity.toString()) * -1;
              const conversion =
                x.item_unit == null
                  ? 1
                  : parseFloat(x.item_unit!.conversion.toString());
              const unit = x.item_unit == null ? x.item.unit : x.item_unit.unit;

              stockOut.push({
                createdAt: adjustmentCase.created_at,
                date: adjustmentCase.date,
                document: adjustmentCase.name,
                opponent: "Internal",
                displayQuantity: quantity,
                quantity: quantity * conversion,
                unit: unit,
                billID: null,
                billCodeID: null,
                adjustmentCaseID: x.id,
                adjustmentCaseCodeID: adjustmentCase.id,
                goodReceiptID: null,
                goodReceiptCodeID: null,
                salesReturnID: null,
                salesReturnCodeID: null,
                value: 0,
                itemID: x.item.id,
              });
            }
          });
        });

        console.log(`[info]: Stock out array generated`);

        // Decrease quantity on bill when there is a sales return
        const salesReturnsArray = stockOut.filter((x) => {
          return x.salesReturnID != null;
        });

        // Remove sales return from stock out
        const filteredStockOut = stockOut.filter((x) => {
          return x.salesReturnID == null;
        });

        filteredStockOut.forEach((x) => {
          if (x.billID != null) {
            // Find the sales return from salesReturnArray
            const filtered = salesReturnsArray
              .filter((y) => {
                return y.billID === x.billID;
              })
              .reduce((a, b) => {
                return a + b.quantity;
              }, 0);

            x.quantity = x.quantity - filtered;
          }
        });

        console.log(
          `[info]: Filtered stock out from ${stockOut.length} to ${filteredStockOut.length}`
        );

        for (let i = 0; i < filteredStockOut.length; i++) {
          let quantity = filteredStockOut[i].quantity;
          while (quantity > 0) {
            console.log(
              `[info]: Looking for stock in for ${filteredStockOut[i].itemID}`
            );
            if (quantity == 0) {
              break;
            }
            mongoStockInModel
              .findOne({
                itemID: filteredStockOut[i].itemID,
                residue: { $gt: 0 },
              })
              .sort({
                date: 1,
              })
              .then(async (stockIn) => {
                if (stockIn != null) {
                  console.log(
                    `[info]: Found stock in for ${filteredStockOut[i].itemID}`
                  );
                  if (stockIn.residue > quantity) {
                    stockIn.stockOut.push({
                      billID: filteredStockOut[i].billID,
                      billCodeID: filteredStockOut[i].billCodeID,
                      adjustmentCaseID: filteredStockOut[i].adjustmentCaseID,
                      adjustmentCaseCodeID:
                        filteredStockOut[i].adjustmentCaseCodeID,
                      date: filteredStockOut[i].date,
                      createdAt: filteredStockOut[i].createdAt,
                      quantity: quantity,
                      value: filteredStockOut[i].value,
                    });

                    stockIn.residue -= quantity;
                    quantity = 0;

                    await stockIn.save();
                    console.log(`[info]: Saved stock in`);
                  } else {
                    stockIn.stockOut.push({
                      billID: filteredStockOut[i].billID,
                      billCodeID: filteredStockOut[i].billCodeID,
                      adjustmentCaseID: filteredStockOut[i].adjustmentCaseID,
                      adjustmentCaseCodeID:
                        filteredStockOut[i].adjustmentCaseCodeID,
                      date: filteredStockOut[i].date,
                      createdAt: filteredStockOut[i].createdAt,
                      quantity: stockIn.residue,
                      value: filteredStockOut[i].value,
                    });

                    stockIn.residue = 0;
                    quantity -= stockIn.residue;

                    await stockIn.save();
                    console.log(`[info]: Saved stock in`);
                  }
                } else if (stockIn == null && quantity > 0) {
                  // Store in Overflows
                  await mongoOverflowModel.create({
                    itemID: filteredStockOut[i].itemID,
                    date: filteredStockOut[i].date,
                    document: filteredStockOut[i].document,
                    quantity: quantity,
                    billID: filteredStockOut[i].billID,
                    billCodeID: filteredStockOut[i].billCodeID,
                    adjustmentCaseID: filteredStockOut[i].adjustmentCaseID,
                    adjustmentCaseCodeID:
                      filteredStockOut[i].adjustmentCaseCodeID,
                    value: filteredStockOut[i].value,
                  });

                  quantity = 0;
                }
              });
          }
          console.log(`Completed ${i} out of ${filteredStockOut.length}`);
        }

        return res.status(200).send({
          message: "Sync stock out successfully!",
        });
      }
    );
  };
}

export default SearchHelper;
