import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { mysql_real_escape_string } from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import SocketHelper from "../helper/socket.helper";
import GoodReceiptModel from "../model/good_receipt.model";
import ItemPurchasePriceModel from "../model/item_purchase_price.model";
import PurchaseInvoiceModel from "../model/purchase-invoice.model";

class PurchaseInvoiceController {
  /**
   * Create a new purchase invoice
   * @param req
   * @param res
   */
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

    PurchaseInvoiceModel.create({
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
      .then(async (good_receipt_result) => {
        await ItemPurchasePriceModel.delete(
          good_receipt_items
            .filter((x) => x.save)
            .map((x) => {
              return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                deleted_by: userID,
              };
            })
        );

        await ItemPurchasePriceModel.create(
          good_receipt_items
            .filter((x) => x.save)
            .map((x) => {
              return {
                item_id: x.item_id,
                item_unit_id: x.item_unit_id,
                created_by: userID,
                price: x.price,
                discount: x.discount,
              };
            })
        );

        const socket = new SocketHelper("createGoodReceipt", {
          supplier_id: good_receipt_result.supplier_id,
          company_id: good_receipt_result.company_id,
        });
        socket.create();

        await queue.add("create-purchase-invoice", good_receipt_result);
        return res.status(201).send(good_receipt_result);
      })
      .catch((error) => {
        console.error(`[error]: Error on creating purchase invoice ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
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
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];
    const updatePurchaseInvoice = req.body.purchase_invoice;

    const faktur =
      updatePurchaseInvoice.faktur == null
        ? null
        : updatePurchaseInvoice.faktur.toString().length < 16
        ? null
        : updatePurchaseInvoice.faktur;
    const discount = updatePurchaseInvoice.discount;
    const purchase_invoice_name = updatePurchaseInvoice.name;

    const purchaseInvoice = await PurchaseInvoiceModel.fetchByID(id);
    if (!purchaseInvoice) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (purchaseInvoice.is_delete) {
      return res
        .status(400)
        .send(ErrorList["Purchase invoice already deleted"]);
    }

    const goodReceipt: any = await GoodReceiptModel.fetchByID(
      purchaseInvoice.good_receipt_code_id
    );
    if (!goodReceipt) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    if (goodReceipt.is_delete) {
      return res.status(400).send(ErrorList["Good receipt already deleted"]);
    }

    PurchaseInvoiceModel.update({
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
      .then(async (result) => {
        // Next thing to do is to update the stock
        await queue.add("delete-purchase-invoice", purchaseInvoice);
        await queue.add("update-purchase-invoice", result);

        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on updating good receipt ${error}`);
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Fetch unconfirmed purchase invoice
   * @param req
   * @param res
   */
  static fetchUnconfirmed = (req: Request, res: Response) => {
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    PurchaseInvoiceModel.fetchUnconfirmed(offset, limit)
      .then(([purchaseInvoiceResult, purchaseInvoiceCount]) => {
        return res.status(200).send({
          data: purchaseInvoiceResult,
          count: purchaseInvoiceCount,
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetching unconfirmed purchase invoice ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  /**
   * Update purchase invoice status
   * Either confirm or delete
   * @param req
   * @param res
   * @returns
   */
  static updateStatus = async (req: Request, res: Response) => {
    const id = parseInt(req.body.id);
    const is_confirm = req.body.is_confirm;
    const is_delete = req.body.is_delete;
    const userID = req.body.userId;

    const purchaseInvoice = await PurchaseInvoiceModel.fetchByID(id);
    if (!purchaseInvoice) {
      return res.status(404).send(ErrorList["Invoice not found"]);
    }

    if (purchaseInvoice.is_confirm) {
      return res.status(400).send(ErrorList["Invoice already confirmed"]);
    }

    if (purchaseInvoice.is_delete) {
      return res.status(400).send(ErrorList["Invoice already deleted"]);
    }

    const goodReceiptCodeID = purchaseInvoice.good_receipt_code_id;

    const goodReceipt = (await GoodReceiptModel.fetchByID(
      goodReceiptCodeID
    )) as any;
    if (!goodReceipt) {
      return res.status(404).send(ErrorList["Good receipt not found"]);
    }

    if (is_confirm) {
      const discount = req.body.discount;
      const good_receipt = req.body.good_receipt as any[];
      const good_receipt_name = req.body.good_receipt_name;
      const purchase_invoice_name = req.body.name;
      const date = new Date(req.body.date);

      if (goodReceipt.purchase_invoice == null) {
        return res.status(404).send(ErrorList["Purchase invoice not found"]);
      }

      if (goodReceipt.purchase_invoice.is_confirm) {
        return res
          .status(400)
          .send(ErrorList["Purchase invoice already confirmed"]);
      }

      if (goodReceipt.purchase_invoice.is_delete) {
        return res
          .status(400)
          .send(ErrorList["Purchase invoice already deleted"]);
      }

      PurchaseInvoiceModel.confirmByID({
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
      }).then(async (updatePurchaseInvoiceResult) => {
        const socket = new SocketHelper(
          "updatePurchaseDocumentStatus",
          updatePurchaseInvoiceResult[0]
        );
        socket.create();

        const updatedPurchaseInvoice = await PurchaseInvoiceModel.fetchByID(id);
        await queue.add("confirm-purchase-invoice", updatedPurchaseInvoice);

        if (good_receipt.filter((x) => x.save).length > 0) {
          // Search for saved items
          await ItemPurchasePriceModel.delete(
            good_receipt
              .filter((x) => x.save)
              .map((x) => {
                return {
                  item_id: x.item.id,
                  item_unit_id: x.item_unit_id,
                  deleted_by: userID,
                };
              })
          );
          // Then save the price
          await ItemPurchasePriceModel.create(
            good_receipt
              .filter((x) => x.save)
              .map((x) => {
                return {
                  item_id: x.item_id,
                  item_unit_id: x.item_unit_id,
                  price: x.price,
                  discount: x.discount,
                  created_by: userID,
                };
              })
          );
        }

        return res.status(200).send(updatePurchaseInvoiceResult);
      });
    } else if (is_delete) {
      const [purchaseInvoiceUpdate, _] = await PurchaseInvoiceModel.deleteByID({
        id: id,
        deleted_by: userID,
      });

      await queue.add("delete-purchase-invoice", goodReceipt);

      const socket = new SocketHelper(
        "updatePurchaseDocumentStatus",
        purchaseInvoiceUpdate
      );
      socket.create();

      return res.status(200).send(purchaseInvoiceUpdate);
    }
  };

  /**
   * Fetch purchase invoice archive
   * @param req
   * @param res
   */
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
        await queue.add("delete-purchase-invoice", goodReceipt);
        return res.status(201).send(result);
      })
      .catch((error) => {
        console.error(
          `[error]: Error while deleting purchase invoice ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };
}

export default PurchaseInvoiceController;
