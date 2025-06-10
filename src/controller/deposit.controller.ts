import { Request, response, Response } from "express";
import DepositModel from "../model/deposit.model";
import {
  mysql_real_escape_string,
  translateKeyword,
  translatePage,
} from "../helper/escape.helper";
import ErrorList from "../assets/error_list";
import { v4 } from "uuid";
import { StockInInterface } from "../interface/stock-in.interface";
import { queue } from "../helper/queue.helper";
import { DepositRepository } from "../repositories/deposit.repository";

class DepositController {
  private depositRepository: DepositRepository;

  constructor(depositRepository: DepositRepository) {
    this.depositRepository = depositRepository;
  }

  create = async (req: Request, res: Response) => {};

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.depositRepository.fetchByID(id);
      if (!result) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching deposit by ID ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetch = async (req: Request, res: Response) => {
    const keyword = translateKeyword(req.query.keyword);
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT!);
    try {
      const result = await this.depositRepository.fetch({
        page: page,
        keyword: keyword,
        pageSize: pageSize,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching deposit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Fetch deposit
   * @param req
   * @param res
   */
  static fetchV2 = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page ? 1 : Number(req.query.page);

    DepositModel.fetchIdsV2(keyword).then((ids) => {
      DepositModel.fetchV2(
        ids.map((x) => {
          return x.id;
        }),
        page
      )
        .then((result) => {
          return res.status(200).send({
            data: result,
            count: ids.length,
          });
        })
        .catch((error) => {
          console.error(`[error]: Error on fetching deposit ${error}`);
          return res.status(500).send(error);
        });
    });
  };

  /**
   * Delete deposit by ID
   * @param req
   * @param res
   * @returns
   */
  static deleteByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await DepositModel.fetchByID(id);
    if (!result) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (result.is_delete) {
      return res.status(400).send(ErrorList["Not found"]);
    }

    DepositModel.deleteByID(id)
      .then((result) => {
        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on deleting deposit ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  static fetchArchive = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    const mode = req.body.mode;
    if (year == null && month == null) {
      DepositModel.fetchArchiveYears(mode)!
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
          console.error(`[error]: Error on fetching deposit archive ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (year != null && month == null) {
      const year = req.body.year;
      DepositModel.fetchArchiveMonths(year, mode)
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
          console.error(`[error]: Error on fetching deposit archive ${error}`);
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const page = req.body.limit.page;
      const keyword = req.body.search.keyword;
      DepositModel.fetchArchive({
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
                customer_name: x.customer_name,
                value: x.value,
                payment: x.payment,
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
   * Confirm by ID
   * @param req
   * @param res
   */
  // static confirmByID = (req: Request, res: Response) => {
  //   const id = req.body.id;
  //   const date = new Date(req.body.date);
  //   const deposit = req.body.deposit as any[];
  //   const deposit_payment = req.body.deposit_payment as any[];
  //   const deposit_bill_payment = req.body.deposit_bill_payment as any[];
  //   const userID = req.body.userId;
  //   const is_paid = req.body.is_paid;
  //   const paymentTerm = req.body.payment_term;
  //   DepositModel.fetchByID(id)
  //     .then(async (result) => {
  //       if (!result) {
  //         return res.status(404).send(ErrorList["Not found"]);
  //       }

  //       if (result.is_delete) {
  //         return res.status(400).send(ErrorList["Not found"]);
  //       }

  //       // First we need to do some validation
  //       // Check if checked items is more than 1
  //       if (deposit.filter((x) => x.checked).length == 0) {
  //         return res.status(400).send(ErrorList["Item is required"]);
  //       }

  //       if (deposit.filter((x) => !x.checked).length > 0) {
  //         // Create a new deposit with the new unchecked items
  //         await DepositModel.confirmByID({
  //           id: id,
  //         });

  //         await DepositModel.create({
  //           sales: result.sales,
  //           name: DepositModel.generateName(date),
  //           customer_id: result.customer_id,
  //           date: date,
  //           uuid: v4(),
  //           created_by: userID,
  //           discount: 0,
  //           delivery: 0,
  //           service: 0,
  //           items: deposit
  //             .filter((y) => !y.checked)
  //             .map((x) => {
  //               const depositIndex = result.deposit.findIndex(
  //                 (y) => y.id == x.id
  //               );
  //               const depositObject = result.deposit[depositIndex];
  //               return {
  //                 item_id: depositObject.item_id,
  //                 item_unit_id: depositObject.item_unit_id,
  //                 package_code_id: depositObject.package_code_id,
  //                 quantity: Number(depositObject.quantity),
  //                 price: Number(depositObject.price),
  //                 discount: Number(depositObject.discount),
  //               };
  //             }),
  //           payments: [
  //             // Create from deposit payment where unusedAmount > 0
  //             ...deposit_payment
  //               .filter((x) => x.unused_value > 0)
  //               .map((x) => {
  //                 return {
  //                   date: new Date(x.date),
  //                   value: x.unused_value,
  //                   payment_method_id: x.payment_method_id,
  //                 };
  //               }),
  //           ],
  //           type: result.type,
  //         });

  //         // Create a new bill code
  //         BillCodeModel.create({
  //           sales: result.sales,
  //           uuid: v4(),
  //           name: BillCodeModel.generateName(date),
  //           date: date,
  //           customer_id: result.customer_id,
  //           created_by: userID,
  //           discount: Number(result.discount),
  //           delivery: Number(result.delivery),
  //           service: Number(result.service),
  //           items: deposit
  //             .filter((y) => y.checked)
  //             .map((x) => {
  //               const depositIndex = result.deposit.findIndex(
  //                 (y) => y.id == x.id
  //               );
  //               const depositObject = result.deposit[depositIndex];
  //               return {
  //                 item_id: depositObject.item_id,
  //                 item_unit_id: depositObject.item_unit_id,
  //                 package_code_id: depositObject.package_code_id,
  //                 quantity: Number(depositObject.quantity),
  //                 price: Number(depositObject.price),
  //                 discount: Number(depositObject.discount),
  //               };
  //             }),
  //           is_paid: is_paid,
  //           payments: [
  //             ...deposit_payment
  //               .filter((x) => x.value > 0)
  //               .map((x) => {
  //                 return {
  //                   date: new Date(x.date),
  //                   value: x.value,
  //                   payment_method_id: x.payment_method_id,
  //                 };
  //               }),
  //             ...deposit_bill_payment.map((x) => {
  //               return {
  //                 date: new Date(x.date),
  //                 value: x.value,
  //                 payment_method_id: x.payment_method_id,
  //               };
  //             }),
  //           ],
  //           payment_term: paymentTerm,
  //         }).then(async (result) => {
  //           const delivery = Number(result.delivery);
  //           const discount = Number(result.discount);
  //           const service = Number(result.service);

  //           const createSalesInvoiceTotal = result.bill.reduce((a, b) => {
  //             return (
  //               a + (Number(b.price) - Number(b.discount)) * Number(b.quantity)
  //             );
  //           }, 0);

  //           const createSalesInvoiceNetTotal =
  //             createSalesInvoiceTotal - discount + delivery + service;

  //           for (let i = 0; i < result.bill.length; i++) {
  //             if (result.bill[i].package_code != null) {
  //               const packagePrice = Number(result.bill[i].price);
  //               const packageQuantity = Number(result.bill[i].quantity);
  //               const packageDiscount = Number(result.bill[i].discount);
  //               const packageFinalPrice =
  //                 ((packagePrice - packageDiscount) *
  //                   createSalesInvoiceNetTotal) /
  //                 createSalesInvoiceTotal;

  //               const packageContentValue = result.bill[
  //                 i
  //               ].package_code!.package_content.reduce((a, b) => {
  //                 return (
  //                   a +
  //                   Number(b.quantity) * (Number(b.price) - Number(b.discount))
  //                 );
  //               }, 0);

  //               for (
  //                 let n = 0;
  //                 n < result.bill[i].package_code!.package_content.length;
  //                 n++
  //               ) {
  //                 const createSalesInvoicePackageContentItem =
  //                   result.bill[i].package_code!.package_content[n];
  //                 const createSalesInvoiceItemItemID =
  //                   createSalesInvoicePackageContentItem.item_id;
  //                 const createSalesInvoiceItemQuantity = Number(
  //                   createSalesInvoicePackageContentItem.quantity
  //                 );
  //                 const createSalesInvoiceItemPrice = Number(
  //                   createSalesInvoicePackageContentItem.price
  //                 );
  //                 const createSalesInvoiceItemDiscount = Number(
  //                   createSalesInvoicePackageContentItem.discount
  //                 );
  //                 const createSalesInvoiceItemUnit =
  //                   createSalesInvoicePackageContentItem.item_unit == null
  //                     ? createSalesInvoicePackageContentItem.item.unit
  //                     : createSalesInvoicePackageContentItem.item_unit.unit;
  //                 const createSalesInvoiceItemConversion =
  //                   createSalesInvoicePackageContentItem.item_unit == null
  //                     ? 1
  //                     : Number(
  //                         createSalesInvoicePackageContentItem.item_unit
  //                           .conversion
  //                       );
  //                 const finalUnitPrice =
  //                   packageContentValue == 0
  //                     ? 0
  //                     : Number(
  //                         ((createSalesInvoiceItemPrice -
  //                           createSalesInvoiceItemDiscount) *
  //                           packageFinalPrice) /
  //                           (packageContentValue *
  //                             createSalesInvoiceItemConversion)
  //                       );

  //                 const stockOut: StockInInterface = {
  //                   itemID: createSalesInvoiceItemItemID,
  //                   createdAt: result.created_at,
  //                   date: date,
  //                   document: result.name,
  //                   opponent:
  //                     result.customer == null
  //                       ? "Retail customer"
  //                       : result.customer.name,
  //                   displayQuantity:
  //                     packageQuantity * createSalesInvoiceItemQuantity * -1,
  //                   quantity:
  //                     packageQuantity *
  //                     -1 *
  //                     createSalesInvoiceItemQuantity *
  //                     createSalesInvoiceItemConversion,
  //                   unit: createSalesInvoiceItemUnit,
  //                   billID: result.bill[i].id,
  //                   billCodeID: result.id,
  //                   adjustmentCaseID: null,
  //                   adjustmentCaseCodeID: null,
  //                   goodReceiptID: null,
  //                   goodReceiptCodeID: null,
  //                   salesReturnID: null,
  //                   salesReturnCodeID: null,
  //                   customerID: result.customer_id,
  //                   supplierID: null,
  //                   companyID: null,
  //                   price: finalUnitPrice,
  //                 };
  //                 await queue.add("insert-stock-out", stockOut);
  //               }
  //             } else if (result.bill[i].item != null) {
  //               const stockOut: StockInInterface = {
  //                 itemID: result.bill[i].item!.id,
  //                 createdAt: result.created_at,
  //                 date: date,
  //                 document: result.name,
  //                 opponent:
  //                   result.customer == null
  //                     ? "Retail customer"
  //                     : result.customer.name,
  //                 displayQuantity: Number(result.bill[i].quantity) * -1,
  //                 quantity:
  //                   Number(result.bill[i].quantity) *
  //                   -1 *
  //                   (result.bill[i].item_unit != null
  //                     ? Number(result.bill[i].item_unit!.conversion)
  //                     : 1),
  //                 unit:
  //                   result.bill[i].item_unit == null
  //                     ? result.bill[i].item!.unit
  //                     : result.bill[i].item_unit!.unit,
  //                 billID: result.bill[i].id,
  //                 billCodeID: result.id,
  //                 adjustmentCaseID: null,
  //                 adjustmentCaseCodeID: null,
  //                 goodReceiptID: null,
  //                 goodReceiptCodeID: null,
  //                 salesReturnID: null,
  //                 salesReturnCodeID: null,
  //                 customerID: result.customer_id,
  //                 supplierID: null,
  //                 companyID: null,
  //                 price:
  //                   ((Number(result.bill[i].price) -
  //                     Number(result.bill[i].discount)) *
  //                     createSalesInvoiceNetTotal) /
  //                   (createSalesInvoiceTotal *
  //                     (result.bill[i].item_unit == null
  //                       ? 1
  //                       : Number(result.bill[i].item_unit!.conversion))),
  //               };
  //               await queue.add("insert-stock-out", stockOut);
  //             }
  //           }
  //           return res.status(201).send(result);
  //         });
  //       } else {
  //         // Every thing is checked, just update the deposit
  //         await DepositModel.confirmByID({
  //           id: id,
  //         });

  //         BillCodeModel.create({
  //           sales: result.sales,
  //           uuid: v4(),
  //           name: BillCodeModel.generateName(date),
  //           date: date,
  //           customer_id: result.customer_id,
  //           created_by: userID,
  //           discount: Number(result.discount),
  //           delivery: Number(result.delivery),
  //           service: Number(result.service),
  //           items: deposit.map((x) => {
  //             const depositIndex = result.deposit.findIndex(
  //               (y) => y.id == x.id
  //             );
  //             const depositObject = result.deposit[depositIndex];
  //             return {
  //               item_id: depositObject.item_id,
  //               item_unit_id: depositObject.item_unit_id,
  //               package_code_id: depositObject.package_code_id,
  //               quantity: Number(depositObject.quantity),
  //               price: Number(depositObject.price),
  //               discount: Number(depositObject.discount),
  //             };
  //           }),
  //           is_paid: is_paid,
  //           payments: [
  //             ...deposit_payment
  //               .filter((x) => x.value > 0)
  //               .map((x) => {
  //                 return {
  //                   date: new Date(x.date),
  //                   value: x.value,
  //                   payment_method_id: x.payment_method_id,
  //                 };
  //               }),
  //             ...deposit_bill_payment.map((x) => {
  //               return {
  //                 date: new Date(x.date),
  //                 value: x.value,
  //                 payment_method_id: x.payment_method_id,
  //               };
  //             }),
  //           ],
  //           payment_term: paymentTerm,
  //         }).then(async (result) => {
  //           const delivery = Number(result.delivery);
  //           const discount = Number(result.discount);
  //           const service = Number(result.service);

  //           const createSalesInvoiceTotal = result.bill.reduce((a, b) => {
  //             return (
  //               a + (Number(b.price) - Number(b.discount)) * Number(b.quantity)
  //             );
  //           }, 0);

  //           const createSalesInvoiceNetTotal =
  //             createSalesInvoiceTotal - discount + delivery + service;

  //           for (let i = 0; i < result.bill.length; i++) {
  //             if (result.bill[i].package_code != null) {
  //               const packagePrice = Number(result.bill[i].price);
  //               const packageQuantity = Number(result.bill[i].quantity);
  //               const packageDiscount = Number(result.bill[i].discount);
  //               const packageFinalPrice =
  //                 ((packagePrice - packageDiscount) *
  //                   createSalesInvoiceNetTotal) /
  //                 createSalesInvoiceTotal;

  //               const packageContentValue = result.bill[
  //                 i
  //               ].package_code!.package_content.reduce((a, b) => {
  //                 return (
  //                   a +
  //                   Number(b.quantity) * (Number(b.price) - Number(b.discount))
  //                 );
  //               }, 0);

  //               for (
  //                 let n = 0;
  //                 n < result.bill[i].package_code!.package_content.length;
  //                 n++
  //               ) {
  //                 const createSalesInvoicePackageContentItem =
  //                   result.bill[i].package_code!.package_content[n];
  //                 const createSalesInvoiceItemItemID =
  //                   createSalesInvoicePackageContentItem.item_id;
  //                 const createSalesInvoiceItemQuantity = Number(
  //                   createSalesInvoicePackageContentItem.quantity
  //                 );
  //                 const createSalesInvoiceItemPrice = Number(
  //                   createSalesInvoicePackageContentItem.price
  //                 );
  //                 const createSalesInvoiceItemDiscount = Number(
  //                   createSalesInvoicePackageContentItem.discount
  //                 );
  //                 const createSalesInvoiceItemUnit =
  //                   createSalesInvoicePackageContentItem.item_unit == null
  //                     ? createSalesInvoicePackageContentItem.item.unit
  //                     : createSalesInvoicePackageContentItem.item_unit.unit;
  //                 const createSalesInvoiceItemConversion =
  //                   createSalesInvoicePackageContentItem.item_unit == null
  //                     ? 1
  //                     : Number(
  //                         createSalesInvoicePackageContentItem.item_unit
  //                           .conversion
  //                       );
  //                 const finalUnitPrice =
  //                   packageContentValue == 0
  //                     ? 0
  //                     : Number(
  //                         ((createSalesInvoiceItemPrice -
  //                           createSalesInvoiceItemDiscount) *
  //                           packageFinalPrice) /
  //                           (packageContentValue *
  //                             createSalesInvoiceItemConversion)
  //                       );

  //                 const stockOut: StockInInterface = {
  //                   itemID: createSalesInvoiceItemItemID,
  //                   createdAt: result.created_at,
  //                   date: date,
  //                   document: result.name,
  //                   opponent:
  //                     result.customer == null
  //                       ? "Retail customer"
  //                       : result.customer.name,
  //                   displayQuantity:
  //                     packageQuantity * createSalesInvoiceItemQuantity * -1,
  //                   quantity:
  //                     packageQuantity *
  //                     -1 *
  //                     createSalesInvoiceItemQuantity *
  //                     createSalesInvoiceItemConversion,
  //                   unit: createSalesInvoiceItemUnit,
  //                   billID: result.bill[i].id,
  //                   billCodeID: result.id,
  //                   adjustmentCaseID: null,
  //                   adjustmentCaseCodeID: null,
  //                   goodReceiptID: null,
  //                   goodReceiptCodeID: null,
  //                   salesReturnID: null,
  //                   salesReturnCodeID: null,
  //                   customerID: result.customer_id,
  //                   supplierID: null,
  //                   companyID: null,
  //                   price: finalUnitPrice,
  //                 };

  //                 await queue.add("insert-stock-out", stockOut);
  //               }
  //             } else if (result.bill[i].item != null) {
  //               const stockOut: StockInInterface = {
  //                 itemID: result.bill[i].item!.id,
  //                 createdAt: result.created_at,
  //                 date: date,
  //                 document: result.name,
  //                 opponent:
  //                   result.customer == null
  //                     ? "Retail customer"
  //                     : result.customer.name,
  //                 displayQuantity: Number(result.bill[i].quantity) * -1,
  //                 quantity:
  //                   Number(result.bill[i].quantity) *
  //                   -1 *
  //                   (result.bill[i].item_unit != null
  //                     ? Number(result.bill[i].item_unit!.conversion)
  //                     : 1),
  //                 unit:
  //                   result.bill[i].item_unit == null
  //                     ? result.bill[i].item!.unit
  //                     : result.bill[i].item_unit!.unit,
  //                 billID: result.bill[i].id,
  //                 billCodeID: result.id,
  //                 adjustmentCaseID: null,
  //                 adjustmentCaseCodeID: null,
  //                 goodReceiptID: null,
  //                 goodReceiptCodeID: null,
  //                 salesReturnID: null,
  //                 salesReturnCodeID: null,
  //                 customerID: result.customer_id,
  //                 supplierID: null,
  //                 companyID: null,
  //                 price:
  //                   ((Number(result.bill[i].price) -
  //                     Number(result.bill[i].discount)) *
  //                     createSalesInvoiceNetTotal) /
  //                   (createSalesInvoiceTotal *
  //                     (result.bill[i].item_unit == null
  //                       ? 1
  //                       : Number(result.bill[i].item_unit!.conversion))),
  //               };

  //               await queue.add("insert-stock-out", stockOut);
  //             }
  //           }
  //           return res.status(201).send(result);
  //         });
  //       }
  //     })
  //     .catch((error) => {
  //       console.error(`[error]: Error on fetching deposit ${error}`);
  //       return res.status(500).send(ErrorList["Internal server error"]);
  //     });
  // };
}

export default DepositController;
