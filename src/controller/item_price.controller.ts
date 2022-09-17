import { Request, Response } from "express";
import QueryTransactionHelper from "../helper/query.transaction.helper";
import { ItemModel } from "../model/item.model";
import ItemPriceModel from "../model/item_price.model";
import SocketHelper from "../helper/socket.helper";
import ExcelJS from "exceljs";
import UserModel from "../model/user.model";
import LogHelper from "../helper/log.helper";

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
        LogHelper.log(new Date(), "error", error, "Item price controller - Fetch", req.body.userId);
        
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

  static getXlsx = async (req: Request, res: Response) => {
    UserModel.fetchById(req.body.userId)
      .then((user) => {
        if (user == null) {
          return res.status(401).send("Pengguna tidak ditemukan.");
        } else {
          const brand_id = req.body.brand_id as number[];
          const type_id = req.body.type_id as number[];

          const rows: any[] = [
            [
              "ID",
              "Referensi",
              "Deskripsi",
              "MereK",
              "Tipe",
              "Satuan",
              "Konversi",
              "Satuan dasar",
              "Harga",
              "Potongan harga",
            ],
          ];

          const columns_width: any[] = [];

          columns_width.push(rows[rows.length - 1].map((item: any) => {
            return item.toString().length
          }))

          ItemModel.fetchItemByBrandType(brand_id, type_id)
            .then((items) => {
              items.forEach((x) => {
                rows.push([
                  x.id,
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
                columns_width.push(rows[rows.length - 1].map((item: any) => {
                  return item.toString().length
                }))
              });

              const workbook = new ExcelJS.Workbook();
              // Setting up workbook properties
              workbook.creator = "Toko Profil Indah";
              workbook.lastModifiedBy = user?.name;
              workbook.created = new Date();

              const sheet = workbook.addWorksheet("Perubahan Harga Jual");
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

              const fixed_width: number[] = [10, 10, 10, 10, 10, 10, 10, 10];

              for(let row_index = 0; row_index < rows.length - 1; row_index++){
                for(let column_index = 0; column_index < 10; column_index++){
                  const width = columns_width[row_index][column_index];
                  if(width > fixed_width[column_index]){
                    fixed_width[column_index] = width + ((column_index >= 9) ? 20 : 0);
                  }
                }
              }

              for(let column_index = 0; column_index < 8; column_index++){
                sheet.getColumn(column_index + 1).width = fixed_width[column_index];
              }

              sheet.getColumn(1).hidden = true;
              sheet.getColumn(9).protection = {
                locked: false,
              };
              
              sheet.getColumn(10).protection = {
                locked: false,
              };

              sheet.getColumn(9).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';
              sheet.getColumn(10).numFmt = '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)';

              sheet.protect("", {
                selectLockedCells: false,
                selectUnlockedCells: true
              }).then(() => {
                workbook.xlsx.writeBuffer().then((buffer) => {
                  return res.status(200).send({
                    data: `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${Buffer.from(
                      buffer
                    ).toString("base64")}`,
                  });
                }).catch(error => {
                  return res.status(500).send(error);
                })
              }).catch(error => {
                return res.status(500).send(error);
              })

              
            })
            .catch((error) => {
              LogHelper.log(
                new Date(),
                error,
                "error",
                "Item price controller - getXlsx",
                req.body.userId
              );
              return res.status(500).send(error);
            });
        }
      })
      .catch((error) => {
        return res.status(500).send(error);
      });
  };
}

export default ItemPriceController;
