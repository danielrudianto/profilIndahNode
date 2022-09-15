import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { ItemModel } from "../model/item.model";
import ItemPriceModel from "../model/item_price.model";
import SocketHelper from "../helper/socket.helper";
import ExcelJS from 'exceljs';

class ItemPriceController {
  static createBulk = (req: Request, res: Response) => {
    const effective_date = new Date(req.body.effective_date);
    const items = req.body.items as any[];
    const references: string[] = [];
    let count: number = 0;
    const price_object: any[] = [];

    items.forEach((x) => {
      const reference = x.reference;
      const price = x.price;
      const discount = x.discount;
      const discount_project = x.discount_project;

      references.push(reference);
      price_object[count] = {
        price: parseFloat(price),
        discount: parseFloat(discount),
        discount_project: parseFloat(discount_project),
      };
      count++;
    });

    ItemModel.fetchByReferences(references).then((items) => {
      if (items.length != count) {
        res
          .status(500)
          .send(
            `${
              items.length - count
            } barang tidak terdefinisi. Mohon cek kembali input anda`
          );
      } else {
        const transactions: any[] = [];
        const item_ids: number[] = [];

        references.forEach((reference, index) => {
          item_ids.push(items.filter((x) => x.reference == reference)[0].id);
          const item_price = new ItemPriceModel(
            price_object[index].price,
            price_object[index].discount,
            items.filter((x) => x.reference == reference)[0].id,
            req.body.userId,
            effective_date
          );
          transactions.push(item_price.create());
        });

        const transaction = new QueryTransactionHelper();
        ItemPriceModel.deleteByIds(item_ids, req.body.userId)
          .then(() => {
            transaction
              .create(transactions)
              .then((result) => {
                return res.status(201).send(result);
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      }
    });
  };

  static fetchAll = (req: Request, res: Response) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0, 0, 0);

    const result: any[] = [];

    ItemModel.fetchAll(date)
      .then((items) => {
        items.forEach((item) => {
          result.push({
            reference: item.reference,
            description: item.description,
            item_brand: item.item_brand,
            item_price: item.item_price,
          });
        });

        return res.status(200).send(
          items.map((x) => {
            return {
              reference: x.reference,
              description: x.description,
              item_brand: x.item_brand,
              price: x.item_price.filter((x) => x.item_unit == null)[0].price,
              discount: x.item_price.filter((x) => x.item_unit == null)[0]
                .discount,
              item_price: x.item_price.filter((x) => x.item_unit != null),
            };
          })
        );
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword ? "" : req.query.keyword.toString();
    const page = !req.query.page
      ? 1
      : Math.max(1, parseInt(req.query.page.toString()));
    const limit = parseInt(process.env.LIMIT!);
    const offset = (page - 1) * limit;

    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);

    ItemPriceModel.fetch(keyword, date, offset, limit)
      .then((result) => {
        return res.status(200).send({
          data: result[0].map((x) => {
            return {
              ...x,
              price: x.item_price.filter((x) => x.item_unit == null)[0].price,
              discount: x.item_price.filter((x) => x.item_unit == null)[0]
                .discount,
              effective_date: x.item_price.filter((x) => x.item_unit == null)[0]
                .effective_date,
              item_price: x.item_price.filter((x) => x.item_unit != null),
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchByReference = (req: Request, res: Response) => {
    const reference = req.params.reference;
    const date = new Date();
    date.setDate(new Date().getDate() + 1);
    date.setHours(0, 0, 0, 0);

    ItemPriceModel.fetchByReference(reference, date)
      .then((result) => {
        if (result == null) {
          return res.status(404).send("Barang tidak ditemukan.");
        } else {
          return res.status(200).send({
            ...result,
            price: result?.item_price.filter((x) => x.item_unit == null)[0]
              .price,
            discount: result?.item_price.filter((x) => x.item_unit == null)[0]
              .discount,
            item_price: result.item_price.filter((x) => x.item_unit != null),
            item_price_id: result.item_price.filter(
              (x) => x.item_unit == null
            )[0].id,
          });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static updatePrice = (req: Request, res: Response) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const price = req.body.price;
    const discount = req.body.discount;
    const effective_date = new Date(req.body.effective_date);
    const old_id = req.body.id;

    ItemPriceModel.updatePrice(
      item_id,
      price,
      discount,
      req.body.userId,
      item_unit_id,
      effective_date
    )
      .then((result) => {
        const socket = new SocketHelper("updateUnitPrice", {
          ...result[1],
          delete_id: old_id,
        });
        socket.create();
        return res.status(200).send(result[1]);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchById = (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    ItemPriceModel.fetchById(id)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static getXlsx = async(req: Request, res: Response) => {
    const brand_id = req.body.brand_id as number[];
    const type_id = req.body.type_id as number[];

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet 1');
    sheet.columns = [
      { header: 'Id', key: 'id', width: 0 },
      { header: 'Reference', key: 'reference' },
      { header: 'Description', key: 'description' }
    ];
    sheet.addRow({
      id: 1,
      reference: "ABC",
    });

    workbook.xlsx.writeBuffer().then(buffer => {
      return res.status(200).send({
        data: Buffer([buffer]).toString('base64')
      });
    })
  }
}

export default ItemPriceController;
