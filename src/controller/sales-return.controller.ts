import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import { SalesReturnRepository } from "../repositories/sales-return.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { StockRepository } from "../repositories/stock.repository";
import { translateKeyword, translatePage } from "../helper/escape.helper";

class SalesReturnController {
  salesReturnRepository: SalesReturnRepository;
  salesInvoiceRepository: SalesInvoiceRepository;
  stockRepository: StockRepository;

  constructor(
    salesReturnRepository: SalesReturnRepository,
    salesInvoiceRepository: SalesInvoiceRepository,
    stockRepository: StockRepository
  ) {
    this.salesReturnRepository = salesReturnRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.stockRepository = stockRepository;
  }

  create = async (req: Request, res: Response) => {
    try {
      const date = new Date(req.body.date);
      const payment_method_id =
        req.body.payment_method_id == 0 ? null : req.body.payment_method_id;
      const items = req.body.sales_return as any[];
      const userID = req.body.userId;
      const sales_return = req.body.sales_return;
      const name = this.generateName(date);

      // first need to check if the quantity satisfies
      const validation = await this.salesInvoiceRepository.validateSalesReturn(
        sales_return
      );

      if (!validation) {
        return res.status(400).send(ErrorList["Sales return insufficient"]);
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
      });

      if (!result) {
        return res.status(400).send(ErrorList["Sales return creation failed"]);
      }

      await this.stockRepository.updateMany(
        result.sales_return!.map((x) => {
          return {
            quantity:
              x.quantity *
              (x.sales_invoice?.product_unit == null
                ? 1
                : x.sales_invoice.product_unit.conversion),
            productID: x.sales_invoice!.product_id!,
          };
        })
      );

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating sales return: ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  private generateName(date: Date): string {
    const name = `RJ-${date.getFullYear()}-${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}${Math.floor(
      Math.random() * 10
    )}${Math.floor(Math.random() * 10)}`;

    return name;
  }

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const salesReturn = this.salesReturnRepository.fetchByID(id);
    } catch (error) {
      console.error(`[error]: Error during fetching sales invoice ${error}`);
      return res.status(500).send(error);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.salesReturnRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching annual good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT);
    const keyword = translateKeyword(req.query.keyword);

    try {
      const result = await this.salesReturnRepository.fetchArchives({
        month: month,
        year: year,
        page: page,
        pageSize: pageSize,
        keyword: keyword,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  static deleteByID = (req: Request, res: Response) => {
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

  // static fetchCodeByID = (req: Request, res: Response) => {
  //   const id = parseInt(req.params.id.toString());
  //   SalesReturnModel.fetchCodeByID(id)
  //     .then((result) => {
  //       return res.status(200).send(result);
  //     })
  //     .catch((error) => {
  //       return res.status(500).send(error);
  //     });
  // };
}

export default SalesReturnController;
