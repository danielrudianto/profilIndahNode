import { Request, Response } from "express";
import ErrorList from "../assets/error_list";
import {
  mysql_real_escape_string,
  translateFaktur,
  translateKeyword,
  translatePage,
} from "../helper/escape.helper";
import { queue } from "../helper/queue.helper";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { StockCardRepository } from "../repositories/stock-card.repository";
import { StockInRepository } from "../repositories/stock-in.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";

class GoodReceiptController {
  private goodReceiptRepository: GoodReceiptRepository;
  private stockInRepository: StockInRepository;
  private productStockRepository: ProductStockRepository;
  private stockCardRepository: StockCardRepository;

  constructor(
    goodReceiptRepository: GoodReceiptRepository,
    stockInRepository: StockInRepository,
    productStockRepository: ProductStockRepository,
    stockCardRepository: StockCardRepository
  ) {
    this.goodReceiptRepository = goodReceiptRepository;
    this.stockInRepository = stockInRepository;
    this.productStockRepository = productStockRepository;
    this.stockCardRepository = stockCardRepository;
  }

  create = async (req: Request, res: Response) => {
    const date = new Date(req.body.date);
    const name = req.body.name;
    const company_id = req.body.company_id;
    const supplier_id = req.body.supplier_id;
    const good_receipt_items = req.body.good_receipt as any[];

    const invoice_name = req.body.invoice_name;
    const faktur = req.body.faktur;
    const discount = req.body.discount;

    const userID = req.body.userId;
    const uuid = req.body.uuid;

    const is_confirm =
      req.body.is_confirm == undefined ? false : req.body.is_confirm;

    try {
      const result = await this.goodReceiptRepository.create({
        uuid: uuid,
        name: name,
        invoice_name: invoice_name,
        faktur: faktur,
        date: date,
        company_id: company_id,
        supplier_id: supplier_id,
        created_at: new Date(),
        created_by: userID,
        good_receipt: good_receipt_items.map((x, index) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            quantity: x.quantity,
            price: x.price,
            discount: x.discount,
          };
        }),
        discount: discount,
        confirmed_at: is_confirm ? new Date() : null,
        confirmed_by: is_confirm ? userID : null,
        is_confirm: is_confirm,
        is_delete: false,
      });

      await this.stockInRepository.createMany(
        result.good_receipt!.map((x) => {
          return {
            good_receipt_code_id: result.id!,
            good_receipt_id: x.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            price: x.price - x.discount,
            product_id: x.product_id,
            quantity:
              x.quantity *
              (x.product_unit == null ? 1 : x.product_unit.conversion),
            company_id: result.company_id,
            date: result.date,
          };
        })
      );

      await this.productStockRepository.updateMany(
        result.good_receipt!.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              x.quantity *
              (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
          };
        })
      );

      const stockCardResult = await this.stockCardRepository.createMany(
        result.good_receipt!.map((x) => {
          return {
            document_name: result.name,
            customer_id: null,
            supplier_id: result.supplier_id,
            date: result.date,
            good_receipt_id: x.id!,
            good_receipt_code_id: result.id!,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            sales_invoice_code_id: null,
            sales_invoice_id: null,
            sales_return_code_id: null,
            sales_return_id: null,
            quantity:
              x.quantity *
              (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
            display_quantity: x.quantity,
            stock: null,
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            created_at: new Date(),
          };
        })
      );

      stockCardResult.forEach(async (x) => {
        await queue.add("stock-card-inserted", {
          id: x.id,
        });
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const invoice_name = req.body.invoice_name;
    const faktur = translateFaktur(req.body.faktur);
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt;
    const userID = req.body.userId;
    const supplierID = req.body.supplier_id;
    const companyID = req.body.company_id;

    try {
      const data = await this.goodReceiptRepository.fetchByID(id);
      if (!data) {
        return res.status(404).send(ErrorList["Good receipt not found"]);
      }

      if (data.is_delete) {
        return res.status(400).send(ErrorList["Good receipt already deleted"]);
      }

      if (!data.is_confirm) {
        return res.status(400).send(ErrorList["Good receipt not confirmed"]);
      }

      const result = await this.goodReceiptRepository.update({
        uuid: data.uuid,
        id: id,
        name: name,
        invoice_name: invoice_name,
        supplier_id: supplierID,
        company_id: companyID,
        date: date,
        faktur: faktur,
        discount: discount,
        is_confirm: true,
        is_delete: false,
        confirmed_at: new Date(),
        confirmed_by: userID,
        good_receipt: good_receipt.map((x: any) => {
          return {
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            price: x.price,
            discount: x.discount,
            id: x.id,
          };
        }),
      });

      if (result) {
        // First delete the existing stock in records
        await this.stockInRepository.deleteMany(
          data.good_receipt!.map((x) => {
            return {
              good_receipt_code_id: id,
              good_receipt_id: x.id!,
              adjustment_case_code_id: null,
              adjustment_case_id: null,
              price: 0,
            };
          })
        );

        await this.productStockRepository.updateMany(
          data.good_receipt!.map((x) => {
            return {
              productID: x.product_id,
              quantity:
                -1 *
                x.quantity *
                (x.product_unit == null ? 1 : x.product_unit.conversion),
            };
          })
        );

        for (let i = 0; i < data.good_receipt!.length; i++) {
          await queue.add("stock-card-deleted", {
            sales_invoice_code_id: null,
            sales_invoice_id: null,
            adjustment_case_code_id: null,
            adjustment_case_id: null,
            sales_return_code_id: null,
            sales_return_id: null,
            good_receipt_code_id: id,
            good_receipt_id: data.good_receipt![i].id,
          });
        }

        await this.stockInRepository.createMany(
          result.good_receipt!.map((x) => {
            return {
              good_receipt_code_id: result.id!,
              good_receipt_id: x.id!,
              adjustment_case_code_id: null,
              adjustment_case_id: null,
              price: x.price - x.discount,
              product_id: x.product_id,
              quantity:
                x.quantity *
                (x.product_unit == null ? 1 : x.product_unit.conversion),
              company_id: result.company_id,
              date: result.date,
            };
          })
        );

        await this.productStockRepository.updateMany(
          result.good_receipt!.map((x) => {
            return {
              productID: x.product_id,
              quantity:
                x.quantity *
                (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
            };
          })
        );

        await this.stockCardRepository.createMany(
          result.good_receipt!.map((x) => {
            return {
              document_name: result.name,
              customer_id: null,
              supplier_id: result.supplier_id,
              date: result.date,
              good_receipt_id: x.id!,
              good_receipt_code_id: id!,
              adjustment_case_code_id: null,
              adjustment_case_id: null,
              sales_invoice_code_id: null,
              sales_invoice_id: null,
              sales_return_code_id: null,
              sales_return_id: null,
              quantity:
                x.quantity *
                (x.product_unit_id == null ? 1 : x.product_unit!.conversion),
              display_quantity: x.quantity,
              stock: null,
              product_id: x.product_id,
              product_unit_id: x.product_unit_id,
              created_at: new Date(),
            };
          })
        );

        return res.status(201).send(result);
      }
    } catch (error) {
      console.error(`[error]: Error on updating good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  check = async (req: Request, res: Response) => {
    const name = req.body.name;
    try {
      const result = await this.goodReceiptRepository.fetchByName(name);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on checking good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const result = await this.goodReceiptRepository.fetchByID(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetching good receipt ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchUnconfirmed = async (req: Request, res: Response) => {
    const page = translatePage(req.query.page);
    const pageSize = Number(process.env.LIMIT);

    try {
      const result = await this.goodReceiptRepository.fetchUnconfirmed({
        keyword: "",
        page: page,
        pageSize: pageSize,
      });
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching unconfirmed good receipts ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchAnnualArchives = async (req: Request, res: Response) => {
    try {
      const result = await this.goodReceiptRepository.fetchAnnualArchives();
      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching annual good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchArchives = async (req: Request, res: Response) => {
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    const page = translatePage(req.body.page);
    const pageSize = Number(process.env.LIMIT);
    const keyword = translateKeyword(req.body.keyword);
    const endDate = new Date(req.body.endDate);
    const startDate = new Date(req.body.startDate);
    const sortBy = req.body.sortBy;
    const sortDirection = req.body.sortDirection;
    const isActive = req.body.isActive;
    const isDelete = req.body.isDelete;
    const isPending = req.body.isPending;

    try {
      const result = await this.goodReceiptRepository.fetchArchives({
        month: month,
        year: year,
        page: page,
        pageSize: pageSize,
        keyword: keyword,
        endDate: endDate,
        startDate: startDate,
        sortBy: sortBy,
        sortDirection: sortDirection,
        isActive: isActive,
        isDelete: isDelete,
        isPending: isPending,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(
        `[error]: Error on fetching good receipt archives ${error}`
      );
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  confirm = async (req: Request, res: Response) => {
    const id = req.body.id;
    const date = new Date(req.body.date);
    const name = req.body.name;
    const invoice_name = req.body.invoice_name;
    const faktur = translateFaktur(req.body.faktur);
    const discount = req.body.discount;
    const good_receipt = req.body.good_receipt;
    const userID = req.body.userId;

    try {
      const data = await this.goodReceiptRepository.fetchByID(id);

      if (!data) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (data.is_confirm) {
        return res
          .status(400)
          .send(ErrorList["Good receipt already confirmed"]);
      }

      if (data.is_delete) {
        return res.status(400).send(ErrorList["Good receipt already deleted"]);
      }

      const result = await this.goodReceiptRepository.confirm({
        uuid: data.uuid,
        id: id,
        name: name,
        invoice_name: invoice_name,
        date: date,
        faktur: faktur,
        discount: discount,
        is_confirm: true,
        is_delete: false,
        confirmed_at: new Date(),
        confirmed_by: userID,
        good_receipt: good_receipt.map((x: any) => {
          return {
            price: x.price,
            discount: x.discount,
            id: x.id,
          };
        }),
        company_id: data.company_id,
        supplier_id: data.supplier_id,
      });

      await this.stockInRepository.updateMany(
        good_receipt.map((x: any) => {
          return {
            good_receipt_id: x.id,
            good_receipt_code_id: id,
            adjustment_case_id: null,
            adjustment_case_code_id: null,
            price: x.price - x.discount,
          };
        })
      );

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on confirming purchase invoice ${error}`);
      return res.status(500).send(error);
    }
  };

  reject = async (req: Request, res: Response) => {
    const id = req.body.id;
    const userID = req.body.userId;

    try {
      const data = await this.goodReceiptRepository.fetchByID(id);

      if (!data) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      if (data.is_confirm) {
        return res
          .status(400)
          .send(ErrorList["Good receipt already confirmed"]);
      }

      if (data.is_delete) {
        return res.status(400).send(ErrorList["Good receipt already deleted"]);
      }

      const result = await this.goodReceiptRepository.reject({
        uuid: data.uuid,
        id: id,
        name: data.name,
        invoice_name: data.invoice_name,
        date: data.date,
        faktur: data.faktur,
        discount: data.discount,
        is_confirm: false,
        is_delete: true,
        confirmed_at: new Date(),
        confirmed_by: userID,
        company_id: data.company_id,
        supplier_id: data.supplier_id,
      });

      if (!result) {
        return res.status(400).send(ErrorList["Good receipt creation failed"]);
      }

      await this.stockInRepository.deleteMany(
        data.good_receipt!.map((x: any) => {
          return {
            good_receipt_id: x.id,
            good_receipt_code_id: id,
            adjustment_case_id: null,
            adjustment_case_code_id: null,
            price: 0,
          };
        })
      );

      await this.productStockRepository.updateMany(
        data.good_receipt!.map((x) => {
          return {
            productID: x.product_id,
            quantity:
              -1 *
              x.quantity *
              (x.product_unit == null ? 1 : x.product_unit.conversion),
          };
        })
      );

      for (let i = 0; i < data.good_receipt!.length; i++) {
        await queue.add("stock-card-deleted", {
          sales_invoice_code_id: null,
          sales_invoice_id: null,
          adjustment_case_code_id: null,
          adjustment_case_id: null,
          sales_return_code_id: null,
          sales_return_id: null,
          good_receipt_code_id: id,
          good_receipt_id: data.good_receipt![i].id,
        });
      }

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on confirming purchase invoice ${error}`);
      return res.status(500).send(error);
    }
  };
}

export default GoodReceiptController;
