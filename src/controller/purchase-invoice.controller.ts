import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import SocketHelper from "../helper/socket.helper";
import CompanyModel from "../model/company.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import ProductStockModel from "../model/product-stock.model";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";
import SupplierModel from "../model/supplier.model";

class PurchaseInvoiceController {
  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PurchaseInvoiceModel.fetchById(id)
      .then((result) => {
        if (result == null) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          let subTotal = 0;
          for (let item of result.good_receipt_code.good_receipt) {
            subTotal +=
              parseFloat(item.price.toString()) *
              parseFloat(item.quantity.toString());
          }
          return res.status(200).send({
            ...result,
            subTotal: subTotal,
            total:
              subTotal -
              (result.discount == null
                ? 0
                : parseFloat(result.discount.toString())),
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const id = req.body.id;
    PurchaseInvoiceModel.fetchById(id).then((purchase_invoice) => {
      if (!purchase_invoice || purchase_invoice.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      } else {
        const date = new Date(req.body.date);
        const name = req.body.name;
        const company_id = req.body.company_id;
        const supplier_id = req.body.supplier_id;
        const good_receipt_items = req.body.good_receipt as any[];

        const purchase_invoice = req.body.purchase_invoice as any;
        const discount = purchase_invoice.discount;
        const purchase_invoice_name = purchase_invoice.name;
        const faktur =
          !purchase_invoice.faktur || purchase_invoice.faktur?.length < 16
            ? null
            : purchase_invoice.faktur;
        const userID = req.body.userId;

        Promise.all([
          CompanyModel.fetchById(company_id),
          SupplierModel.fetchById(supplier_id),
        ])
          .then((validation) => {
            if (
              validation[0] == null ||
              validation[1] == null ||
              validation[0].length == 0 ||
              validation[1].length == 0 ||
              validation[0][0].is_delete ||
              validation[1][0].is_delete
            ) {
              return res.status(400).send(ErrorList["Not found"]);
            } else {
              GoodReceiptModel.fetchById(purchase_invoice.good_receipt_code_id)
                .then((document) => {
                  if (document == null) {
                    return res.status(404).send(ErrorList["Not found"]);
                  } else {
                    const good_receipt_code = new GoodReceiptModel(
                      name,
                      date,
                      userID,
                      supplier_id,
                      company_id,
                      purchase_invoice.good_receipt_code_id
                    );
                    good_receipt_code.update().then((good_receipt_result) => {
                      const good_receipt = [];
                      for (
                        let idx = 0;
                        idx < good_receipt_items.length;
                        idx++
                      ) {
                        good_receipt.push({
                          item_id: good_receipt_items[idx].item_id,
                          quantity: good_receipt_items[idx].quantity,
                          good_receipt_code_id: good_receipt_result.id,
                          price: good_receipt_items[idx].price,
                          item_unit_id: good_receipt_items[idx].item_unit_id,
                        });
                      }
                      const purchase_document = new PurchaseInvoiceModel(
                        purchase_invoice_name,
                        faktur,
                        date,
                        discount,
                        good_receipt_result.id,
                        req.body.userId,
                        req.body.userId
                      );
                      Promise.all([
                        ProductStockModel.updateStock(
                          document.good_receipt.map((x) => {
                            const quantity =
                              parseFloat(x.quantity.toString()) *
                              (x.item_unit == null
                                ? 1
                                : parseFloat(
                                    x.item_unit.conversion.toString()
                                  )) *
                              -1;
                            return {
                              item_id: x.item.id,
                              quantity: quantity,
                            };
                          })
                        ),
                        GoodReceiptModel.deleteItemsByGoodReceiptCodeId(
                          purchase_invoice.good_receipt_code_id
                        ),
                        GoodReceiptModel.insertItems(good_receipt),
                        purchase_document.update(),
                      ])
                        .then(() => {
                          GoodReceiptModel.fetchById(
                            purchase_invoice.good_receipt_code_id
                          )
                            .then((document) => {
                              if (document == null) {
                                return res
                                  .status(400)
                                  .send(ErrorList["Not found"]);
                              } else {
                                ProductStockModel.updateStock(
                                  document?.good_receipt.map((x) => {
                                    const quantity =
                                      parseFloat(x.quantity.toString()) *
                                      (x.item_unit == null
                                        ? 1
                                        : parseFloat(
                                            x.item_unit.conversion.toString()
                                          ));
                                    return {
                                      item_id: x.item.id,
                                      quantity: quantity,
                                    };
                                  })
                                ).then(() => {
                                  return res.status(201).send(purchase_invoice);
                                });
                              }
                            })
                            .catch(() => {
                              return res.status(201).send(purchase_invoice);
                            });
                        })
                        .catch((error) => {
                          return res.status(500).send(error);
                        });
                    });
                  }
                })
                .catch(() => {
                  return res.status(404).send(ErrorList["Not found"]);
                });
            }
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static create = (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur =
      !purchase_invoice.faktur || purchase_invoice.faktur?.length < 16
        ? null
        : purchase_invoice.faktur;
    const userID = req.body.userId;

    Promise.all([
      CompanyModel.fetchById(company_id),
      SupplierModel.fetchById(supplier_id),
    ])
      .then((validation) => {
        if (
          validation[0] == null ||
          validation[1] == null ||
          validation[0].length == 0 ||
          validation[1].length == 0 ||
          validation[0][0].is_delete ||
          validation[1][0].is_delete
        ) {
          return res.status(400).send(ErrorList["Not found"]);
        } else {
          const good_receipt_code = new GoodReceiptModel(
            name,
            date,
            userID,
            supplier_id,
            company_id
          );
          good_receipt_code.create().then((good_receipt_result) => {
            const good_receipt = [];
            const delete_price = [];
            const insert_price: Promise<any>[] = [];
            for (let idx = 0; idx < good_receipt_items.length; idx++) {
              good_receipt.push({
                item_id: good_receipt_items[idx].item_id,
                quantity: good_receipt_items[idx].quantity,
                good_receipt_code_id: good_receipt_result.id,
                price: good_receipt_items[idx].price,
                item_unit_id: good_receipt_items[idx].item_unit_id,
              });
              if (good_receipt_items[idx].save == true) {
                delete_price.push(
                  ItemPurchasePriceModel.delete(
                    good_receipt_items[idx].item_id,
                    good_receipt_items[idx].item_unit_id,
                    req.body.userId
                  )
                );
                const purchase_price = new ItemPurchasePriceModel(
                  parseFloat(good_receipt_items[idx].price),
                  good_receipt_items[idx].item_id,
                  req.body.userId,
                  good_receipt_items[idx].item_unit_id
                );
                insert_price.push(purchase_price.create());
              }
            }
            const purchase_document = new PurchaseInvoiceModel(
              purchase_invoice_name,
              faktur,
              date,
              discount,
              good_receipt_result.id,
              req.body.userId,
              req.body.userId
            );
            Promise.all([
              GoodReceiptModel.insertItems(good_receipt),
              delete_price,
              purchase_document.create(),
            ])
              .then(() => {
                Promise.all(insert_price)
                  .then(() => {
                    const socket = new SocketHelper("createGoodReceipt", {
                      supplier_id: good_receipt_result.supplier_id,
                      company_id: good_receipt_result.company_id,
                    });
                    socket.create();
                    GoodReceiptModel.fetchById(good_receipt_result.id)
                      .then((item) => {
                        if (item == null) {
                          return res.status(400).send(ErrorList["Not found"]);
                        } else {
                          ProductStockModel.updateStock(
                            item?.good_receipt.map((x) => {
                              const quantity =
                                parseFloat(x.quantity.toString()) *
                                (x.item_unit == null
                                  ? 1
                                  : parseFloat(
                                      x.item_unit.conversion.toString()
                                    ));
                              return {
                                item_id: x.item.id,
                                quantity: quantity,
                              };
                            })
                          )
                            .then(() => {
                              return res.status(201).send(item);
                            })
                            .catch(() => {
                              return res.status(201).send(item);
                            });
                        }
                      })
                      .catch((error) => {
                        return res.status(500).send(error);
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
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchUnconfirmed = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    PurchaseInvoiceModel.fetchUnconfirmed(offset, limit)
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

  static confirm = (req: Request, res: Response) => {
    const id = req.body.id;
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt as any[];
    const good_receipt_name = req.body.good_receipt_name;
    const purchase_invoice_name = req.body.name;
    const date = new Date(req.body.date);

    GoodReceiptModel.fetchById(id)
      .then((good_receipt_code) => {
        if (
          good_receipt_code == null ||
          good_receipt_code.purchase_invoice == null
        ) {
          return res.status(404).send(ErrorList["Not found"]);
        } else if (
          good_receipt_code.purchase_invoice.is_confirm ||
          good_receipt_code.purchase_invoice.is_delete
        ) {
          return res.status(400).send(ErrorList["Not found"]);
        } else {
          PurchaseInvoiceModel.confirmById(
            id,
            purchase_invoice_name,
            good_receipt_name,
            date,
            discount,
            good_receipt,
            req.body.userId
          )
            .then((result) => {
              const socket = new SocketHelper(
                "updatePurchaseDocumentStatus",
                result[0]
              );
              socket.create();

              if (good_receipt.filter((x) => x.save).length > 0) {
                // Search for saved items
                const filtered_good_receipt = good_receipt.filter(
                  (x) => x.save
                );

                GoodReceiptModel.fetchByIds(
                  filtered_good_receipt.map((y) => {
                    return y.id;
                  })
                )
                  .then((good_receipts) => {
                    if (filtered_good_receipt.length == 0) {
                      return res.status(200).send(result[0]);
                    } else {
                      const insert_transaction: Promise<any>[] = [];
                      const delete_transaction: Promise<any>[] = [];

                      for (let good_receipt_item of good_receipts) {
                        const priceIndex = filtered_good_receipt.findIndex(
                          (idx) => idx.id == good_receipt_item.id
                        );

                        if (priceIndex != -1) {
                          delete_transaction.push(
                            ItemPurchasePriceModel.delete(
                              good_receipt_item.item_id,
                              good_receipt_item.item_unit_id,
                              req.body.userId
                            )
                          );
                          const itemPurchasePrice = new ItemPurchasePriceModel(
                            parseFloat(good_receipt_item.price.toString()),
                            good_receipt_item.item_id,
                            req.body.userId,
                            good_receipt_item.item_unit_id
                          );

                          insert_transaction.push(itemPurchasePrice.create());
                        }
                      }

                      Promise.all(delete_transaction)
                        .then(() => {
                          Promise.all(insert_transaction)
                            .then(() => {
                              return res.status(200).send(result[0]);
                            })
                            .catch((error) => {
                              console.error(error);
                              return res.status(500).send(error);
                            });
                        })
                        .catch((error) => {
                          return res.status(500).send(error);
                        });
                    }
                  })
                  .catch((error) => {
                    return res.status(500).send(error);
                  });
              } else {
                return res.status(200).send(result[0]);
              }
            })
            .catch((error) => {
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static delete = (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    PurchaseInvoiceModel.fetchById(id).then((purchase_invoice) => {
      if (purchase_invoice == null || purchase_invoice.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      } else {
        PurchaseInvoiceModel.deleteById(id, req.body.userId)
          .then((result) => {
            GoodReceiptModel.fetchById(result[0].good_receipt_code_id).then(
              (document) => {
                if (document == null) {
                  return res.status(404).send(ErrorList["Not found"]);
                } else {
                  ProductStockModel.updateStock(
                    document.good_receipt.map((x) => {
                      const quantity =
                        parseFloat(x.quantity.toString()) *
                        -1 *
                        (x.item_unit == null
                          ? 1
                          : parseFloat(x.item_unit.conversion.toString()));
                      return {
                        item_id: x.item.id,
                        quantity: quantity,
                      };
                    })
                  );
                }
              }
            );
            const socket = new SocketHelper(
              "updatePurchaseDocumentStatus",
              result[0]
            );
            socket.create();

            return res.status(200).send(result[0]);
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static fetchArchive = (req: Request, res: Response) => {
    const mode =
      req.query.mode == undefined ? 0 : parseInt(req.query.mode.toString());
    if (req.query.year == undefined) {
      PurchaseInvoiceModel.fetchArchiveYears(mode)!
        .then((result) => {
          return res.status(200).send(result);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month == undefined) {
      const year = parseInt(req.query.year.toString());
      PurchaseInvoiceModel.fetchArchiveMonths(year, mode)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = x.count;
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    } else if (req.query.year != undefined && req.query.month != undefined) {
      const year = parseInt(req.query.year.toString());
      const month = parseInt(req.query.month.toString());
      const page =
        req.query.page == undefined ? 1 : parseInt(req.query.page.toString());

      PurchaseInvoiceModel.fetchArchive(year, month, page, mode)!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                supplier: {
                  id: x.supplier_id,
                  name: x.supplier_name,
                },
                company: {
                  id: x.company_id,
                  name: x.company_name,
                },
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : result[1][0].count,
          });
        })
        .catch((error) => {
          return res.status(500).send(error);
        });
    }
  };

  static searchArchive = (req: Request, res: Response) => {
    const suppliers = req.body.suppliers as number[];
    const items = req.body.items as number[];
    const companies = req.body.companies as number[];
    const date = req.body.date as any[];
    const page = req.body.page as number;
    const keyword = req.body.keyword as string;
    const status = req.body.status;

    const formattedDate_1 =
      date[0] == null
        ? null
        : `${new Date(date[0]).getFullYear()}}-${(
            new Date(date[0]).getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${new Date(date[0])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    const formattedDate_2 =
      date[1] == null
        ? null
        : `${new Date(date[1]).getFullYear()}}-${(
            new Date(date[1]).getMonth() + 1
          )
            .toString()
            .padStart(2, "0")}-${new Date(date[1])
            .getDate()
            .toString()
            .padStart(2, "0")}`;
    PurchaseInvoiceModel.search(
      suppliers,
      companies,
      items,
      [formattedDate_1, formattedDate_2],
      mysql_real_escape_string(keyword),
      page,
      status
    )
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: result[1][0].count,
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default PurchaseInvoiceController;
