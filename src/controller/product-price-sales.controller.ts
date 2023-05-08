import { Request, Response } from "express";
import { ItemModel } from "../model/item.model";
import ItemPriceModel from "../model/item_price.model";
import SocketHelper from "../helper/socket.helper";
import ExcelJS from "exceljs";
import UserModel from "../model/user.model";
import ErrorList from "../assets/error_list";

class ItemPriceController {
  // Basic controllers including CRUD operations (Create, Read, Update, and Delete)
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
              id: x.id,
              reference: x.reference,
              description: x.description,
              count: x.count,
              price: x.price,
              discount: x.discount,
              effective_date: new Date(x.effective_date),
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static update = (req: Request, res: Response) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    const price = req.body.price;
    const discount = req.body.discount;
    const userID = req.body.userId;

    ItemPriceModel.fetchByItemID(item_id, item_unit_id)
      .then((item) => {
        if (item == null || item.length == 0) {
          const itemPrice = new ItemPriceModel(
            price,
            discount,
            item_id,
            item_unit_id,
            userID,
            new Date()
          );
          itemPrice.create().then((result) => {
            return res.status(201).send(result);
          });
        } else {
          const latest_price = item[0].price;
          const latest_discount = item[0].discount;
          if (latest_price == price && latest_discount == discount) {
            return res.status(201).send(item[0]);
          } else {
            const itemPrice = new ItemPriceModel(
              price,
              discount,
              item_id,
              item_unit_id,
              userID,
              new Date()
            );
            itemPrice
              .update()
              .then((result) => {
                return res.status(201).send(result);
              })
              .catch((error) => {
                return res.status(500).send(error);
              });
          }
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static createBulk = (req: Request, res: Response) => {
    const effective_date = new Date();
    const items = req.body as any[];
    const transactions: any[] = [];

    items.forEach((x) => {
      const id = x.id;
      const item_unit_id = x.item_unit_id;
      const price = x.price;
      const discount = x.discount;

      const item_price = new ItemPriceModel(
        price,
        discount,
        id,
        item_unit_id,
        req.body.userId,
        effective_date
      );

      transactions.push(
        ItemPriceModel.delete(id, item_unit_id, req.body.userId)
      );
      transactions.push(item_price.create());
    });

    Promise.all(transactions)
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(error);
        return res.status(500).send(error);
      });
  };

  static fetchByItemID = (req: Request, res: Response) => {
    const item_id = req.body.item_id;
    const item_unit_id = req.body.item_unit_id;
    ItemPriceModel.fetchByItemID(item_id, item_unit_id)
      .then((result) => {
        if (!result || result.length == 0) {
          return res.status(404).send(ErrorList["Not found"]);
        } else {
          return res.status(200).send(result[0]);
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };

  static fetchFormat = async (req: Request, res: Response) => {
    const brand_id = req.body.brand_id as number[];
    const type_id = req.body.type_id as number[];
    const setting = 0;

    const rows: any[] = [
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
        "Potongan harga",
      ],
    ];

    const columns_width: any[] = [];

    columns_width.push(
      rows[rows.length - 1].map((item: any) => {
        return item.toString().length;
      })
    );

    ItemModel.fetchItemPriceByBrandType(brand_id, type_id, setting)
      .then((items) => {
        items.forEach((x) => {
          rows.push([
            x.item_id,
            x.item_unit == null ? 0 : x.item_unit.id,
            x.item.reference,
            x.item.description,
            x.item.item_brand.name,
            x.item.item_type?.name,
            x.item_unit == null ? x.item.unit : x.item_unit.unit,
            x.item_unit == null
              ? 1
              : parseFloat(x.item_unit.conversion.toString()),
            x.item.unit,
            parseFloat(x.price.toString()),
            parseFloat(x.discount.toString()),
          ]);

          // Adjusting column width
          columns_width.push(
            rows[rows.length - 1].map((item: any) => {
              return item.toString().length;
            })
          );
        });

        const workbook = new ExcelJS.Workbook();
        // Setting up workbook properties
        workbook.creator = "Toko Profil Indah";
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.lastModifiedBy = "Toko Profil Indah";

        const sheet = workbook.addWorksheet("Perubahan Harga Jual", {
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
            prompt:
              "Nilai potongan harga harus lebih besar atau sama dengan 0.",
          };
        }

        sheet.getColumn(1).hidden = true;
        sheet.getColumn(2).hidden = true;

        sheet.getColumn(3).width = 18;
        sheet.getColumn(4).width = 60;
        sheet.getColumn(5).width = 12;
        sheet.getColumn(6).width = 12;
        sheet.getColumn(7).width = 12;
        sheet.getColumn(8).width = 18;

        sheet.getColumn(9).numFmt = "#,###.00";
        sheet.getColumn(10).numFmt = "#,###.00";
        sheet.getColumn(11).numFmt = "#,###.00";

        workbook.xlsx
          .writeBuffer()
          .then((buffer) => {
            return res.status(200).send({
              data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(
                buffer
              ).toString("base64")}`,
            });
          })
          .catch((error) => {
            return res.status(500).send(error);
          });
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ItemPriceController;
