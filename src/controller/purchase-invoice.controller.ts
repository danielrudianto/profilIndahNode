import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import {
  mysql_real_escape_string,
  translateKeyword,
  translatePage,
} from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import GoodReceiptModel from "../model/good-receipt.model";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { PurchaseInvoiceRepository } from "../repositories/purchase-invoice.repository";

class PurchaseInvoiceController {
  private purchaseInvoiceRepository: PurchaseInvoiceRepository;
  private goodReceiptRepository: GoodReceiptRepository;

  constructor(
    purchaseInvoiceRepository: PurchaseInvoiceRepository,
    goodReceiptRepository: GoodReceiptRepository
  ) {
    this.purchaseInvoiceRepository = purchaseInvoiceRepository;
    this.goodReceiptRepository = goodReceiptRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const purchase_invoice = req.body.purchase_invoice as any;
    const discount = purchase_invoice.discount;
    const purchase_invoice_name = purchase_invoice.name;
    const faktur = translateKeyword(purchase_invoice.faktur);
    const userID = req.body.userId;
    const uuid = req.body.uuid;

    try {
      const goodReceipt = await this.goodReceiptRepository.create({
        uuid: uuid,
        name: name,
        date: date,
        supplier_id: supplier_id,
        company_id: company_id,
        created_by: userID,
        good_receipt: good_receipt_items.map((x) => {
          return {
            item_id: x.item_id,
            item_unit_id: x.item_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }),
      });

      const purchaseInvoice = await this.purchaseInvoiceRepository.create({
        uuid: uuid,
        date: date,
        name: purchase_invoice_name,
        faktur: faktur,
        discount: discount,
        good_receipt_code_id: goodReceipt.id,
        created_by: userID,
        created_at: new Date(),
      });

      const socket = new SocketHelper("createGoodReceipt", {
        supplier_id: goodReceipt.supplier_id,
        company_id: goodReceipt.company_id,
      });
      socket.create();

      await queue.add("good-receipt-created", {
        id: goodReceipt.id,
      });

      return res.status(201).send(purchaseInvoice);
    } catch (error) {
      console.error(`[error]: Error on creating good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const purchaseInvoice = await this.purchaseInvoiceRepository.fetchByID(
        id
      );
      if (!purchaseInvoice) {
        return res.status(404).send(ErrorList["Not found"]);
      }
    } catch (error) {
      console.error(
        `[error]: Error on fetching purchase invoice by ID ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  /**
   * Fetch purchase invoice by ID
   * @param req
   * @param res
   */
  static fetchByID = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    PurchaseInvoiceModel.fetchByID(id)
      .then((result) => {
        if (!result) {
          return res.status(404).send(ErrorList["Not found"]);
        }

        let subTotal = 0;
        for (let item of result.good_receipt_code.good_receipt) {
          subTotal += Number(item.price) * Number(item.quantity);
        }
        return res.status(200).send({
          ...result,
          id: id,
          subTotal: subTotal,
          total:
            subTotal - (result.discount == null ? 0 : Number(result.discount)),
        });
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
  static update = async (req: Request, res: Response) => {
    // const id = req.body.id;
    // const date = new Date(req.body.date);
    // const name = req.body.name;
    // const company_id = req.body.company_id;
    // const supplier_id = req.body.supplier_id;
    // const good_receipt_items = req.body.good_receipt as any[];
    // const updatePurchaseInvoice = req.body.purchase_invoice;
    // const faktur =
    //   updatePurchaseInvoice.faktur == null
    //     ? null
    //     : updatePurchaseInvoice.faktur.toString().length < 16
    //     ? null
    //     : updatePurchaseInvoice.faktur;
    // const discount = updatePurchaseInvoice.discount;
    // const purchase_invoice_name = updatePurchaseInvoice.name;
    // const purchaseInvoice = await PurchaseInvoiceModel.fetchByID(id);
    // if (!purchaseInvoice) {
    //   return res.status(404).send(ErrorList["Not found"]);
    // }
    // if (purchaseInvoice.is_delete) {
    //   return res
    //     .status(400)
    //     .send(ErrorList["Purchase invoice already deleted"]);
    // }
    // const goodReceipt: any = await GoodReceiptModel.fetchByID(
    //   purchaseInvoice.good_receipt_code_id
    // );
    // if (!goodReceipt) {
    //   return res.status(404).send(ErrorList["Not found"]);
    // }
    // if (goodReceipt.is_delete) {
    //   return res.status(400).send(ErrorList["Good receipt already deleted"]);
    // }
    // PurchaseInvoiceModel.update({
    //   id: id,
    //   name: purchase_invoice_name,
    //   date: date,
    //   faktur: faktur,
    //   discount: discount,
    //   good_receipt_code: {
    //     supplier_id: supplier_id,
    //     company_id: company_id,
    //     name: name,
    //     date: date,
    //     good_receipt: good_receipt_items.map((x) => {
    //       return {
    //         item_id: x.item_id,
    //         item_unit_id: x.item_unit_id,
    //         quantity: x.quantity,
    //         price: x.price,
    //         discount: x.discount,
    //       };
    //     }),
    //   },
    // })
    //   .then(async (result) => {
    //     // Remove stock outs that has stock_in_id of the good receipt
    //     StockInModel.fetch(
    //       IStockInFetchMethod.BY_GOOD_RECEIPT_CODE_ID,
    //       goodReceipt.id
    //     ).then(async (stockIns) => {
    //       await StockOutModel.delete(
    //         IStockOutDelete.BY_STOCK_IN_IDS,
    //         stockIns.map((x) => {
    //           return x.id;
    //         })
    //       );
    //       await StockInModel.deleteMany(
    //         stockIns.map((x) => {
    //           return x.id;
    //         })
    //       );
    //       const createPurchaseInvoiceTotalValue =
    //         result.good_receipt_code.good_receipt.reduce((a, b) => {
    //           return (
    //             a + (Number(b.price) - Number(b.discount)) * Number(b.quantity)
    //           );
    //         }, 0);
    //       const createPurchaseInvoiceDiscount =
    //         result.discount == null ? 0 : Number(result.discount || 0);
    //       const createPurchaseInvoiceNetValue =
    //         createPurchaseInvoiceTotalValue - createPurchaseInvoiceDiscount;
    //       // Create stock in for the updated good receipt
    //       await StockInModel.createMany(
    //         result.good_receipt_code.good_receipt.map((x) => {
    //           return {
    //             date: result.good_receipt_code.date,
    //             company_id: result.good_receipt_code.company_id,
    //             item_id: x.item.id,
    //             good_receipt_code_id: result.good_receipt_code.id,
    //             good_receipt_id: x.id,
    //             adjustment_case_code_id: null,
    //             adjustment_case_id: null,
    //             price:
    //               createPurchaseInvoiceTotalValue == 0
    //                 ? 0
    //                 : ((Number(x.price) - Number(x.discount)) *
    //                     createPurchaseInvoiceNetValue) /
    //                   (createPurchaseInvoiceTotalValue *
    //                     (x.item_unit == null
    //                       ? 1
    //                       : Number(x.item_unit.conversion))),
    //             quantity:
    //               Number(x.quantity) *
    //               (x.item_unit == null ? 1 : Number(x.item_unit.conversion)),
    //           };
    //         })
    //       );
    //       return res.status(201).send(result);
    //     });
    //   })
    //   .catch((error) => {
    //     console.error(`[error]: Error on updating good receipt ${error}`);
    //     return res.status(500).send(ErrorList["Internal server error"]);
    //   });
  };

  fetchUnconfirmed = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT!);

    const result = await this.purchaseInvoiceRepository.fetchUnconfirmed({
      keyword: "",
      page: page,
      pageSize: pageSize,
    });

    return res.status(200).send(result);
  };

  updateStatus = async (req: Request, res: Response) => {
    const id = Number(req.body.id);
    const is_confirm = req.body.is_confirm;
    const is_delete = req.body.is_delete;
    const userID = req.body.userId;

    try {
      const purchaseInvoice = await this.purchaseInvoiceRepository.fetchByID(
        id
      );

      if (!purchaseInvoice) {
        return res.status(404).send(ErrorList["Invoice not found"]);
      }

      if (purchaseInvoice.is_confirm) {
        return res.status(400).send(ErrorList["Invoice already confirmed"]);
      }

      if (purchaseInvoice.is_delete) {
        return res.status(400).send(ErrorList["Invoice already deleted"]);
      }

      if (purchaseInvoice.good_receipt_code == null) {
        return res.status(404).send(ErrorList["Good receipt not found"]);
      }

      if (is_confirm) {
        const discount = req.body.discount;
        const good_receipt = req.body.good_receipt as any[];
        const good_receipt_name = req.body.good_receipt_name;
        const purchase_invoice_name = req.body.name;
        const date = new Date(req.body.date);

        const updatedPurchaseInvoice =
          await this.purchaseInvoiceRepository.update({
            id: id,
            name: purchase_invoice_name,
            uuid: purchaseInvoice.uuid,
            discount: discount,
            date: date,
            created_by: userID,
            created_at: new Date(),
          });

        const updatedGoodReceipt = await this.goodReceiptRepository.update({
          id: purchaseInvoice.good_receipt_code_id,
          uuid: purchaseInvoice.good_receipt_code.uuid,
          name: good_receipt_name,
          date: date,
          supplier_id: purchaseInvoice.good_receipt_code.supplier_id,
          company_id: purchaseInvoice.good_receipt_code.company_id,
          created_by: userID,
          created_at: new Date(),
          good_receipt: good_receipt.map((x) => {
            return {
              item_id: x.item_id,
              item_unit_id: x.item_unit_id,
              quantity: x.quantity,
              price: x.price,
              discount: x.discount,
            };
          }),
        });

        await queue.add("good-receipt-updated", {
          id: updatedGoodReceipt.id,
        });

        const socket = new SocketHelper(
          "updatePurchaseDocumentStatus",
          updatedPurchaseInvoice
        );
        socket.create();

        return res.status(200).send(updatedPurchaseInvoice);
      } else if (is_delete) {
        await this.purchaseInvoiceRepository.delete(id, userID);
        await queue.add("delete-good-receipt", {
          id: purchaseInvoice.good_receipt_code_id,
        });
      } else {
        return res.status(400).send(ErrorList["Invalid status update"]);
      }
    } catch (error) {
      console.error(
        `[error]: Error on fetching purchase invoice by ID ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  static fetchArchive = (req: Request, res: Response) => {
    const mode = req.body.mode;
    const year = req.body.year;
    const month = req.body.month;
    if (year == null) {
      PurchaseInvoiceModel.fetchArchiveYears()!
        .then((result) => {
          return res.status(200).send(
            result
              .map((x) => {
                return {
                  year: x.year,
                  count: parseInt(x.count.toString()),
                };
              })
              .sort((a, b) => {
                return a.year - b.year;
              })
          );
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching purchase invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else if (year != null && month == null) {
      PurchaseInvoiceModel.fetchArchiveMonths(year)!
        .then((result) => {
          const response = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          result.forEach((x) => {
            response[x.month - 1] = parseInt(x.count.toString());
          });
          return res.status(200).send(response);
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching purchase invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    } else {
      const page = req.body.limit.page;
      const keyword = req.body.search.keyword;
      PurchaseInvoiceModel.fetchArchive({
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
                supplier_name: x.supplier_name,
                company_name: x.company_name,
              };
            }),
            count:
              result[1] == null || result[1].length == 0
                ? 0
                : parseInt(result[1][0].count.toString()),
          });
        })
        .catch((error) => {
          console.error(
            `[error]: Error on fetching purchase invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };

  static fetchArchiveV2 = (req: Request, res: Response) => {
    const year = req.body.year;
    const month = req.body.month;
    if (month == null && year == null) {
      PurchaseInvoiceModel.fetchArchiveYearsV2()!.then((result) => {
        return res.status(200).send(
          result.map((x) => {
            return {
              year: x.year,
              month: x.month,
              count: Number(x.count.toString().replace("n", "")),
            };
          })
        );
      });
    } else {
      const keyword = req.body.keyword;
      const page = req.body.page ?? 1;
      const status = req.body.status;
      const startDate = req.body.startDate;
      const endDate = req.body.endDate;
      PurchaseInvoiceModel.fetchArchiveV2({
        year: Number(year),
        month: Number(month),
        mode: status,
        status: status,
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
                supplier_name: x.supplier_name,
                company_name: x.company_name,
                good_receipt_name: x.gr_name,
                faktur: x.faktur,
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
            `[error]: Error on fetching purchase invoice archive ${error}`
          );
          return res.status(500).send(ErrorList["Internal server error"]);
        });
    }
  };

  /**
   * Search purchase invoices
   * @param req
   * @param res
   */
  static search = (req: Request, res: Response) => {
    const suppliers = req.body.suppliers as number[];
    const items = req.body.items as number[];
    const companies = req.body.companies as number[];
    const date = req.body.date as any[];
    const page = req.body.page as number;
    const search = req.body.keyword as any;
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
      mysql_real_escape_string(search ?? ""),
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
        console.error(
          `[error]: Error while searching purchase invoices ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Delete purchase invoice by ID
   * @param req
   * @param res
   * @returns
   */
  static deleteByID = async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const userID = req.body.userID;

    const purchaseInvoice = await PurchaseInvoiceModel.fetchByID(id);
    if (!purchaseInvoice) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (purchaseInvoice.is_delete) {
      return res
        .status(400)
        .send(ErrorList["Purchase invoice already deleted"]);
    }

    const goodReceiptCodeID = purchaseInvoice.good_receipt_code_id;

    const goodReceipt = (await GoodReceiptModel.fetchByID(
      goodReceiptCodeID
    )) as any;

    PurchaseInvoiceModel.deleteByID({
      id: id,
      deleted_by: userID,
    })
      .then(async (result) => {
        for (let i = 0; i < goodReceipt.good_receipt.length; i++) {
          await queue.add("delete-stock-in", {
            itemID: goodReceipt.good_receipt[i].item.id,
            goodReceiptID: goodReceipt.good_receipt[i].id,
            adjustmentCaseID: null,
            quantity:
              Number(goodReceipt.good_receipt[i].quantity) *
              (goodReceipt.good_receipt[i].item_unit == null
                ? 1
                : Number(goodReceipt.good_receipt[i].item_unit.conversion)),
          });
        }
        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(
          `[error]: Error while deleting purchase invoice ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch purchase invoice dashboard
   * @param req
   * @param res
   */
  static fetchDashboard = async (req: Request, res: Response) => {
    // 1 Fetch today's sales
    // 2 Fetch this month's sales
    // 3 Fetch yesterday's sales
    // 4 Fetch last month's sales

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    Promise.all([
      PurchaseInvoiceModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
      ),
      PurchaseInvoiceModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate() - 1
      ),
      PurchaseInvoiceModel.fetchByDate(
        today.getFullYear(),
        today.getMonth() + 1,
        null
      ),
      PurchaseInvoiceModel.fetchByDate(
        today.getFullYear(),
        today.getMonth(),
        null
      ),
      PurchaseInvoiceModel.fetchByDate(
        today.getFullYear(),
        today.getMonth(),
        -today.getDate()
      ),
    ])
      .then(
        ([purchase1, purchase2, purchase3, purchase4, purchase5]: any[]) => {
          return res.status(200).send({
            today: purchase1[0].value == null ? 0 : Number(purchase1[0].value),
            yesterday:
              purchase2[0].value == null ? 0 : Number(purchase2[0].value),
            thisMonth:
              purchase3[0].value == null ? 0 : Number(purchase3[0].value),
            lastMonth:
              purchase4[0].value == null ? 0 : Number(purchase4[0].value),
            monthOnMonth:
              purchase5[0].value == null ? 0 : Number(purchase5[0].value),
          });
        }
      )
      .catch((error) => {
        console.error(`[error]: Error on fetching sales data. ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default PurchaseInvoiceController;
