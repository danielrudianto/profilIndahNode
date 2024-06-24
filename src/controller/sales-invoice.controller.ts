import { NextFunction, Request, Response } from "express";
import SocketHelper from "../helper/socket.helper";
import BillModel from "../model/bill.model";
import BillCodeModel from "../model/bill_code.model";
import ItemPriceModel from "../model/item_price.model";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { ProductPackageCodeModel } from "../model/product-package.model";
import { queue } from "../helper/queue.helper";
import SalesReturnModel from "../model/sales_return.model";
import {
  StockInInterface,
  StockOutDeleteInterface,
} from "../interface/stock-in.interface";
import ReceivableController from "./receivable.controller";
import DepositModel from "../model/deposit.model";
import { redisClient } from "../app";
// import DepositModel from "../model/deposit.model";

class SalesInvoiceController {
  /**
   * Add salesmen to set
   */
  static createSalesman = (req: Request, res: Response, next: NextFunction) => {
    const sales = req.body.sales == "" ? null : req.body.sales;
    if (sales == null) {
      next();
    } else {
      redisClient
        .sAdd("salesman_set", sales.toString().toUpperCase())
        .then(() => {
          next();
        })
        .catch((error) => {
          console.error(`[error]: Error on inserting sales to list ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };
  /**
   * Create sales invoice data
   * @param req
   * @param res
   */
  static create = (req: Request, res: Response) => {
    const uuid = req.body.uuid;
    const customer_id = req.body.customer_id;
    const discount = Number(req.body.discount);
    const delivery = Number(req.body.delivery);
    const service = Number(req.body.service);
    const bill = req.body.bill as any[];
    const payments = req.body.payments as any[];
    const payment_term = req.body.payment_term;
    const date =
      !req.body.date || req.body.date == null
        ? new Date()
        : new Date(req.body.date);
    const userID = req.body.userId;
    const is_paid = req.body.is_paid;
    const type = req.body.type;
    const sales =
      req.body.sales == "" || req.body.sales == null
        ? null
        : req.body.sales.toString().toUpperCase();

    if (type == "sales") {
      BillCodeModel.create({
        sales: sales,
        name: BillCodeModel.generateName(date),
        customer_id: customer_id,
        discount: discount,
        delivery: delivery,
        service: service,
        date: date,
        uuid: uuid,
        items: bill.map((x) => {
          if (x.package_code_id != undefined) {
            return {
              package_code_id: x.package_code_id,
              item_id: null,
              item_unit_id: null,
              quantity: x.quantity,
              price: x.price,
              discount: 0,
            };
          } else {
            return {
              package_code_id: null,
              item_id: x.item_id,
              item_unit_id: x.item_unit_id,
              quantity: x.quantity,
              price: x.price,
              discount: x.discount,
            };
          }
        }),
        payments: payments.map((x) => {
          return {
            date: date,
            value: x.value,
            payment_method_id: x.payment_method_id,
          };
        }),
        created_by: userID,
        payment_term: payment_term,
        is_paid: is_paid,
      }).then(async (result) => {
        if (!is_paid) {
          ReceivableController.receivable += result.bill.reduce((a, b) => {
            return (
              a + (Number(b.price) - Number(b.discount)) * Number(b.quantity)
            );
          }, 0) as number;

          ReceivableController.receivable -= discount + delivery + service;
          ReceivableController.receivable -= payments.reduce((a, b) => {
            return a + Number(b.value);
          }, 0);
        }

        const createSalesInvoiceTotal = result.bill.reduce((a, b) => {
          return (
            a + (Number(b.price) - Number(b.discount)) * Number(b.quantity)
          );
        }, 0);

        const createSalesInvoiceNetTotal =
          createSalesInvoiceTotal - discount + delivery + service;

        Promise.all([
          ItemPriceModel.updateMany(
            bill.filter((x) => x.save && x.item_id != null),
            req.body.userId
          ),
          ProductPackageCodeModel.updatePrice(
            bill.filter((x) => x.save && x.package_code_id != null)
          ),
        ])
          .then(async () => {
            for (let i = 0; i < result.bill.length; i++) {
              if (result.bill[i].package_code != null) {
                const packagePrice = Number(result.bill[i].price);
                const packageQuantity = Number(result.bill[i].quantity);
                const packageDiscount = Number(result.bill[i].discount);
                const packageFinalPrice =
                  ((packagePrice - packageDiscount) *
                    createSalesInvoiceNetTotal) /
                  createSalesInvoiceTotal;

                const packageContentValue = result.bill[
                  i
                ].package_code!.package_content.reduce((a, b) => {
                  return (
                    a +
                    Number(b.quantity) * (Number(b.price) - Number(b.discount))
                  );
                }, 0);

                for (
                  let n = 0;
                  n < result.bill[i].package_code!.package_content.length;
                  n++
                ) {
                  const createSalesInvoicePackageContentItem =
                    result.bill[i].package_code!.package_content[n];
                  const createSalesInvoiceItemItemID =
                    createSalesInvoicePackageContentItem.item_id;
                  const createSalesInvoiceItemQuantity = Number(
                    createSalesInvoicePackageContentItem.quantity
                  );
                  const createSalesInvoiceItemPrice = Number(
                    createSalesInvoicePackageContentItem.price
                  );
                  const createSalesInvoiceItemDiscount = Number(
                    createSalesInvoicePackageContentItem.discount
                  );
                  const createSalesInvoiceItemUnit =
                    createSalesInvoicePackageContentItem.item_unit == null
                      ? createSalesInvoicePackageContentItem.item.unit
                      : createSalesInvoicePackageContentItem.item_unit.unit;
                  const createSalesInvoiceItemConversion =
                    createSalesInvoicePackageContentItem.item_unit == null
                      ? 1
                      : Number(
                          createSalesInvoicePackageContentItem.item_unit
                            .conversion
                        );
                  const finalUnitPrice =
                    packageContentValue == 0
                      ? 0
                      : Number(
                          ((createSalesInvoiceItemPrice -
                            createSalesInvoiceItemDiscount) *
                            packageFinalPrice) /
                            (packageContentValue *
                              createSalesInvoiceItemConversion)
                        );

                  const stockOut: StockInInterface = {
                    itemID: createSalesInvoiceItemItemID,
                    createdAt: result.created_at,
                    date: date,
                    document: result.name,
                    opponent:
                      result.customer == null
                        ? "Retail customer"
                        : result.customer.name,
                    displayQuantity:
                      packageQuantity * createSalesInvoiceItemQuantity * -1,
                    quantity:
                      packageQuantity *
                      -1 *
                      createSalesInvoiceItemQuantity *
                      createSalesInvoiceItemConversion,
                    unit: createSalesInvoiceItemUnit,
                    billID: result.bill[i].id,
                    billCodeID: result.id,
                    adjustmentCaseID: null,
                    adjustmentCaseCodeID: null,
                    goodReceiptID: null,
                    goodReceiptCodeID: null,
                    salesReturnID: null,
                    salesReturnCodeID: null,
                    customerID: result.customer_id,
                    supplierID: null,
                    companyID: null,
                    price: finalUnitPrice,
                  };

                  await queue.add("insert-stock-out", stockOut);
                }
              } else if (result.bill[i].item != null) {
                const stockOut: StockInInterface = {
                  itemID: result.bill[i].item!.id,
                  createdAt: result.created_at,
                  date: date,
                  document: result.name,
                  opponent:
                    result.customer == null
                      ? "Retail customer"
                      : result.customer.name,
                  displayQuantity: bill[i].quantity * -1,
                  quantity:
                    Number(result.bill[i].quantity) *
                    -1 *
                    (result.bill[i].item_unit != null
                      ? Number(result.bill[i].item_unit!.conversion)
                      : 1),
                  unit:
                    result.bill[i].item_unit == null
                      ? result.bill[i].item!.unit
                      : result.bill[i].item_unit!.unit,
                  billID: result.bill[i].id,
                  billCodeID: result.id,
                  adjustmentCaseID: null,
                  adjustmentCaseCodeID: null,
                  goodReceiptID: null,
                  goodReceiptCodeID: null,
                  salesReturnID: null,
                  salesReturnCodeID: null,
                  customerID: result.customer_id,
                  supplierID: null,
                  companyID: null,
                  price:
                    ((Number(result.bill[i].price) -
                      Number(result.bill[i].discount)) *
                      createSalesInvoiceNetTotal) /
                    (createSalesInvoiceTotal *
                      (result.bill[i].item_unit == null
                        ? 1
                        : Number(result.bill[i].item_unit!.conversion))),
                };

                await queue.add("insert-stock-out", stockOut);
              }
            }
            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on updating stock ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      });
      // })
      // .catch((error) => {
      //   console.error(`[error]: Error on creating bill ${error}`);
      //   return res.status(500).send(error);
      // });
    } else if (type == "deposit") {
      DepositModel.create({
        sales: sales,
        name: DepositModel.generateName(date),
        customer_id: customer_id,
        discount: discount,
        delivery: delivery,
        service: service,
        date: date,
        uuid: uuid,
        items: bill.map((x) => {
          if (x.package_code_id != undefined) {
            return {
              package_code_id: x.package_code_id,
              item_id: null,
              item_unit_id: null,
              quantity: x.quantity,
              price: x.price,
              discount: x.discount,
            };
          } else {
            return {
              package_code_id: null,
              item_id: x.item_id,
              item_unit_id: x.item_unit_id,
              quantity: x.quantity,
              price: x.price,
              discount: x.discount,
            };
          }
        }),
        payments: payments.map((x) => {
          return {
            date: date,
            value: x.value,
            payment_method_id:
              x.payment_method_id == 0 ? null : x.payment_method_id,
          };
        }),
        created_by: userID,
        type: "EXTERNAL",
      })
        .then(async (result) => {
          return res.status(201).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on creating deposit ${error}`);
          return res.status(500).send(error);
        });
    } else if (type == "deposit-internal") {
      DepositModel.create({
        sales: sales,
        name: DepositModel.generateName(date),
        customer_id: null,
        discount: discount,
        delivery: delivery,
        service: service,
        date: date,
        uuid: uuid,
        items: bill.map((x) => {
          if (x.package_code_id != undefined) {
            return {
              package_code_id: x.package_code_id,
              item_id: null,
              item_unit_id: null,
              quantity: x.quantity,
              price: x.price,
              discount: x.discount,
            };
          } else {
            return {
              package_code_id: null,
              item_id: x.item_id,
              item_unit_id: x.item_unit_id,
              quantity: x.quantity,
              price: x.price,
              discount: x.discount,
            };
          }
        }),
        payments: payments.map((x) => {
          return {
            date: date,
            value: x.value,
            payment_method_id:
              x.payment_method_id == 0 ? null : x.payment_method_id,
          };
        }),
        created_by: userID,
        type: "INTERNAL",
      })
        .then(async (result) => {
          return res.status(201).send(result);
        })
        .catch((error) => {
          console.error(`[error]: Error on creating deposit ${error}`);
          return res.status(500).send(error);
        });
    }
  };

  /**
   * Search sales invoice data
   * Can be narrowed down by customer, item, date, page, keyword
   * @param req
   * @param res
   */
  static fetchSearch = (req: Request, res: Response) => {
    const customers = req.body.customers as number[];
    const items = req.body.items as number[];
    const date = req.body.date as any[];
    const page = req.body.page as number;
    const keyword = req.body.keyword as string;
    const status = req.body.status;
    // status 0 => active
    // status 1 => deleted
    // status 2 => all

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
    BillCodeModel.search(
      customers,
      items,
      [formattedDate_1, formattedDate_2],
      mysql_real_escape_string(keyword),
      page,
      status
    )
      .then((result) => {
        return res.status(200).send({
          data: result[0],
          count: parseInt(result[1][0].count.toString()),
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  /**
   * Search sales invoice data archive
   * @param req
   * @param res
   */
  static fetchArchive = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null && month == null) {
      BillCodeModel.fetchArchiveYears()!
        .then((result) => {
          return res.status(200).send(
            result
              .map((x) => {
                return {
                  year: x.year,
                  count: parseInt(x.count.toString().replace("n", "")),
                };
              })
              .sort((a, b) => {
                return a.year - b.year;
              })
          );
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (year != null && month == null) {
      const year = req.body.year;
      BillCodeModel.fetchArchiveMonths(year)
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(
              x.count.toString().replace("n", "")
            );
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const mode = req.body.mode;
      const page = req.body.limit.page;
      const keyword = req.body.search.keyword;
      BillCodeModel.fetchArchive({
        year: year,
        month: month,
        mode: mode,
        limit: 10,
        offset: (page - 1) * 10,
        keyword: mysql_real_escape_string(keyword),
      })!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                customer_name: x.customer_name,
                sales: x.sales,
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString().replace("n", "")),
          });
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };

  static fetchArchiveV2 = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    if (year == null && month == null) {
      BillCodeModel.fetchArchiveYearsV2()!
        .then((result) => {
          return res.status(200).send(
            result.map((x) => {
              return {
                year: x.year,
                month: x.month,
                count: Number(x.count.toString().replace("n", "")),
              };
            })
          );
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const keyword = req.body.keyword;
      const page = req.body.page ?? 1;
      const status = req.body.status;
      const paymentStatus = req.body.paymentStatus;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;

      BillCodeModel.fetchArchiveV2({
        year: Number(year),
        month: Number(month),
        mode: status,
        status: status,
        paymentStatus: paymentStatus,
        limit: 20,
        offset: (page - 1) * 20,
        keyword: mysql_real_escape_string(keyword ?? ""),
        startDate: startDate,
        endDate: endDate,
      })!
        .then((result) => {
          return res.status(200).send({
            data: result[0].map((x) => {
              return {
                id: x.id,
                name: x.name,
                date: x.date,
                is_delete: x.is_delete == 1,
                is_confirm: x.is_confirm == 1,
                customer_name: x.customer_name,
                sales: x.sales,
                is_paid: x.is_paid == 1,
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString().replace("n", "")),
          });
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching sales invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };

  /**
   * Fetch bill by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BillCodeModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        let subTotal = 0;
        for (let item of result.bill) {
          subTotal += Number(item.price) * Number(item.quantity);
        }
        return res.status(200).send({
          ...result,
          subTotal: subTotal,
          discount: Number(result.discount),
          delivery: Number(result.delivery),
          service: Number(result.service),
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching sales invoice by ID ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  static fetchPaymentsByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BillCodeModel.fetchPaymentsByID(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching payments by ID ${error}`);
        return res.status(500).send(error);
      });
  };

  static deletePaymentByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    BillCodeModel.deletePaymentByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        BillCodeModel.evaluateBill(result.bill_code_id)
          .then(() => {
            return res.status(201).send(result);
          })
          .catch((error) => {
            console.error(`[error]: Error on evaluating bill value ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting payment by ID ${error}`);
        return res.status(500).send(error);
      });
  };

  /**
   * Fetch bill code by ID
   * @param req
   * @param res
   */
  static fetchCodeByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    BillModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching bill code ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete bill by ID
   * @param req
   * @param res
   * @returns
   */
  static deleteByID = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id.toString());
    const userID = req.body.userId;

    const result = await BillCodeModel.fetchByID(id);
    if (!result) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (result.is_delete) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    // Check if there is any sales return on this bill
    const salesReturn = await SalesReturnModel.fetchByBillIDs(
      result.bill.map((x) => {
        return x.id;
      })
    );

    if (salesReturn.length > 0) {
      return res
        .status(400)
        .send(ErrorList["Delete bill sales return constraint"]);
    }

    const socket = new SocketHelper("deleteBill", result);
    socket.create();

    BillCodeModel.deleteByID(id, userID)
      .then(async (updateBill) => {
        for (let i = 0; i < updateBill.bill.length; i++) {
          if (updateBill.bill[i].item != null) {
            const stockOut: StockOutDeleteInterface = {
              itemID: updateBill.bill[i].item!.id,
              billID: updateBill.bill[i].id,
              quantity:
                Number(updateBill.bill[i].quantity) *
                -1 *
                Number(
                  updateBill.bill[i].item_unit != null
                    ? updateBill.bill[i].item_unit!.conversion
                    : 1
                ),
              adjustmentCaseID: null,
            };
            await queue.add("delete-stock-out", stockOut);
          } else if (updateBill.bill[i].package_code != null) {
            for (
              let n = 0;
              n < updateBill.bill[i].package_code!.package_content.length;
              n++
            ) {
              const packageContent =
                updateBill.bill[i].package_code!.package_content[n];
              const stockOut: StockOutDeleteInterface = {
                itemID: packageContent.item_id,
                billID: updateBill.bill[i].id,
                quantity:
                  Number(updateBill.bill[i].quantity) *
                  -1 *
                  Number(packageContent.quantity) *
                  Number(
                    packageContent.item_unit != null
                      ? packageContent.item_unit.conversion
                      : 1
                  ),
                adjustmentCaseID: null,
              };
              await queue.add("delete-stock-out", stockOut);
            }
          }
        }
        return res.status(201).send(updateBill);
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting bill ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch salesmen
   */
  static fetchSalesmen = (req: Request, res: Response) => {
    const keyword = req.query.keyword;
    redisClient
      .sMembers("salesman_set")
      .then((result) => {
        // Filter by keyword
        if (keyword == "" || keyword == null) {
          return res.status(200).send(
            result
              .sort((a, b) => {
                return a.localeCompare(b);
              })
              .map((x) => x.toUpperCase())
              .splice(0, 5)
          );
        } else {
          return res.status(200).send(
            result
              .filter((x) => {
                return x.includes(keyword.toString().toUpperCase());
              })
              .sort((a, b) => {
                return a.localeCompare(b);
              })
              .map((x) => x.toUpperCase())
              .splice(0, 5)
          );
        }
      })
      .catch((error) => {
        console.error(`[error]: Error on fetching salesmen ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch salesmen pagination
   */
  static fetchSalesmenPagination = (req: Request, res: Response) => {
    const keyword = req.query.keyword;
    const page = !req.query.page ? 1 : parseInt(req.query.page.toString());
    redisClient.sMembers("salesman_set").then((result) => {
      if (keyword == "" || keyword == null) {
        return res.status(200).send({
          data: result
            .sort((a, b) => {
              return a.localeCompare(b);
            })
            .map((x) => x.toUpperCase())
            .splice((page - 1) * 10, 10),
          count: result.length,
        });
      } else {
        return res.status(200).send({
          data: result
            .map((x) => x.toUpperCase())
            .filter((x) => {
              return x.includes(keyword.toString().toUpperCase());
            })
            .sort((a, b) => {
              return a.localeCompare(b);
            })
            .map((x) => x.toUpperCase())
            .splice((page - 1) * 10, 10),
          count: result.length,
        });
      }
    });
  };

  /**
   * Delete salesman
   */
  static deleteSalesman = (req: Request, res: Response) => {
    const name = req.body.name;

    redisClient.sMembers("salesman_set").then((result) => {
      const index = result.findIndex(
        (x) => x.toUpperCase() == name.toUpperCase()
      );

      if (index == -1) {
        return res.status(400).send("Salesman not found");
      } else {
        redisClient
          .sRem("salesman_set", name.toUpperCase())
          .then(() => {
            return res.status(200).send({
              name: name,
            });
          })
          .catch((error) => {
            console.error(`[error]: Error on deleting salesman ${error}`);
            return res.status(500).send(ErrorList["Internal server error"]);
          });
      }
    });
  };
}

export default SalesInvoiceController;
