import { Request, Response } from "express";
import PromotionModel from "../model/promotion.model";
import { mongoProductModel } from "../mongo-model/mongo-product.model";
import GoodReceiptModel from "../model/good_receipt.model";
import ErrorList from "../assets/error_list";
import moment from "moment";

class PromotionController {
  static create = (req: Request, res: Response) => {
    // convert startDate from the format "dd-MM-YYYY" to Date object

    const name = req.body.name;
    const description = req.body.description;
    const startDate = moment(req.body.startDate, "DD-MM-YYYY").toDate();
    const endDate =
      req.body.endDate == null
        ? null
        : moment(req.body.endDate, "DD-MM-YYYY").toDate();

    const rules = req.body.rules;
    const target = req.body.target;
    const brandID = req.body.brand;
    const supplierID = req.body.supplier;
    const userID = req.body.userId;

    PromotionModel.create({
      name: name,
      description: description,
      startDate: startDate,
      endDate: endDate,
      target: target,
      createdBy: userID,
      rules: rules,
      brand_id: brandID,
      supplier_id: supplierID,
    })
      .then((result) => {
        return res.status(201).send(result);
      })
      .catch((err) => {
        console.error(`[error]: Error on create promotion code ${err}`);
        return res.status(500).send("Internal Server Error");
      });
  };

  static fetch = (req: Request, res: Response) => {
    const keyword = !req.query.keyword
      ? ""
      : decodeURIComponent(req.query.keyword as string);
    const page = !req.query.page ? 1 : parseInt(req.query.page as string);

    PromotionModel.fetch(keyword, page)
      .then((result) => {
        return res.status(200).send({
          data: result[0].map((x) => {
            return {
              id: x.id,
              name: x.name,
              description: x.description,
              start: x.start,
              end: x.end,
              target: x.target,
              created_by: x.promotion_code_created_by.name,
              status: x.is_delete
                ? "Deleted"
                : x.end != null &&
                  new Date(x.end).getTime() < new Date().getTime() &&
                  !x.is_delete
                ? "Expired"
                : (x.end == null && !x.is_delete) ||
                  (new Date(x.end!).getTime() >= new Date().getTime() &&
                    !x.is_delete)
                ? "Active"
                : "Inactive",
              brand: x.brand.name,
              supplier: x.supplier.name,
            };
          }),
          count: result[1],
        });
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch promotion code ${error}`);
        return res.status(500).send("Internal Server Error");
      });
  };

  static fetchActive = (req: Request, res: Response) => {
    PromotionModel.fetchActive()
      .then((result) => {
        return res.status(200).send(
          result.map((x) => {
            return {
              id: x.id,
              name: x.name,
              description: x.description,
              start: x.start,
              end: x.end,
              target: x.target,
              created_by: x.promotion_code_created_by.name,
              status: x.is_delete
                ? "Deleted"
                : x.end != null &&
                  new Date(x.end).getTime() < new Date().getTime() &&
                  !x.is_delete
                ? "Expired"
                : (x.end == null && !x.is_delete) ||
                  (new Date(x.end!).getTime() < new Date().getTime() &&
                    !x.is_delete)
                ? "Active"
                : "Inactive",
              brand: x.brand.name,
              supplier: x.supplier.name,
            };
          })
        );
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch active promotion code ${error}`);
        return res.status(500).send("Internal Server Error");
      });
  };

  static fetchResultByID = (req: Request, res: Response) => {
    const id = (!req.params.id ? null : parseInt(req.params.id)) as number;

    PromotionModel.fetchByID(id)
      .then(async (promotion) => {
        if (!promotion) {
          return res.status(404).send("Not Found");
        }

        const startsWith = promotion.promotion.filter((x) => {
          return x.rule == "Starts with";
        });
        const endsWith = promotion.promotion.filter((x) => {
          return x.rule == "Ends with";
        });
        const contains = promotion.promotion.filter((x) => {
          return x.rule == "Contains";
        });
        const doesNotStartWith = promotion.promotion.filter((x) => {
          return x.rule == "Does not start with";
        });
        const doesNotEndWith = promotion.promotion.filter((x) => {
          return x.rule == "Does not end with";
        });
        const doesNotContain = promotion.promotion.filter((x) => {
          return x.rule == "Does not contain";
        });

        const productIDs = await mongoProductModel.find({
          $and: [
            { itemBrandID: promotion.brand_id },
            startsWith.length > 0
              ? {
                  $or: startsWith.map((x) => ({
                    reference: new RegExp(`^${x.value}`, "i"),
                  })),
                }
              : {},
            endsWith.length > 0
              ? {
                  $or: endsWith.map((x) => ({
                    reference: new RegExp(`${x.value}$`, "i"),
                  })),
                }
              : {},
            contains.length > 0
              ? {
                  $or: contains.map((x) => ({
                    reference: new RegExp(`${x.value}`, "i"),
                  })),
                }
              : {},
            doesNotStartWith.length > 0
              ? {
                  $and: doesNotStartWith.map((x) => ({
                    reference: { $not: new RegExp(`^${x.value}`, "i") },
                  })),
                }
              : {},
            doesNotEndWith.length > 0
              ? {
                  $and: doesNotEndWith.map((x) => ({
                    reference: { $not: new RegExp(`${x.value}$`, "i") },
                  })),
                }
              : {},
            doesNotContain.length > 0
              ? {
                  $and: doesNotContain.map((x) => ({
                    reference: { $not: new RegExp(`${x.value}`, "i") },
                  })),
                }
              : {},
          ],
        });

        const calculation = await PromotionModel.calculateByID(
          productIDs.map((x) => {
            return x.itemID;
          }),
          new Date(promotion.start),
          promotion.end == null ? null : new Date(promotion.end),
          promotion.supplier_id
        );

        return res.status(200).send({
          ...promotion,
          target: Number(promotion.target),
          progress: {
            sales: !calculation
              ? 0
              : calculation[0] == null || calculation[0].length == 0
              ? 0
              : calculation[0][0].total,
            overflow: !calculation
              ? 0
              : calculation[1] == null || calculation[1].length == 0
              ? 0
              : calculation[1][0].total,
            purchase: !calculation
              ? 0
              : calculation[2] == null || calculation[2].length == 0
              ? 0
              : calculation[2][0].total,
          },
          items: productIDs
            .map((x) => {
              return {
                reference: x.reference,
                description: x.description,
              };
            })
            .sort((a, b) => {
              return a.reference > b.reference ? 1 : -1;
            }),
        });
      })
      .catch((error) => {
        console.error(
          `[error]: Error on fetch promotion result by id ${error}`
        );
        return res.status(500).send(ErrorList["Internal server error"]);
      });
  };

  static fetchByID = (req: Request, res: Response) => {
    const id = (!req.params.id ? null : parseInt(req.params.id)) as number;

    PromotionModel.fetchByID(id)
      .then((promotion) => {
        if (!promotion) {
          return res.status(404).send("Not Found");
        }

        return res.status(200).send(promotion);
      })
      .catch((error) => {
        console.error(`[error]: Error on fetch promotion code by id ${error}`);
        return res.status(500).send("Internal Server Error");
      });
  };

  static update = async (req: Request, res: Response) => {
    const id = (!req.body.id ? null : parseInt(req.body.id)) as number;
    const name = req.body.name;
    const description = req.body.description;
    const startDate = new Date(req.body.startDate);
    const endDate =
      req.body.endDate == null ? null : new Date(req.body.endDate);

    const rules = req.body.rules;
    const target = req.body.target;
    const brandID = req.body.brand;
    const supplierID = req.body.supplier;
    const userID = req.body.userId;

    await PromotionModel.deleteRules(id);

    PromotionModel.update({
      id: id,
      name: name,
      description: description,
      startDate: startDate,
      endDate: endDate,
      target: target,
      rules: rules,
      brand_id: brandID,
      supplier_id: supplierID,
      createdBy: userID,
    })
      .then((result) => {
        return res.status(200).send(result);
      })
      .catch((error) => {
        console.error(`[error]: Error on update promotion code ${error}`);
        return res.status(500).send("Internal Server Error");
      });
  };

  static downloadResultByID = (req: Request, res: Response) => {
    const id = req.body.id;
    PromotionModel.fetchByID(id).then(async (promotion) => {
      if (!promotion) {
        return res.status(404).send("Not Found");
      }

      const startsWith = promotion.promotion.filter((x) => {
        return x.rule == "Starts with";
      });
      const endsWith = promotion.promotion.filter((x) => {
        return x.rule == "Ends with";
      });
      const contains = promotion.promotion.filter((x) => {
        return x.rule == "Contains";
      });
      const doesNotStartWith = promotion.promotion.filter((x) => {
        return x.rule == "Does not start with";
      });
      const doesNotEndWith = promotion.promotion.filter((x) => {
        return x.rule == "Does not end with";
      });
      const doesNotContain = promotion.promotion.filter((x) => {
        return x.rule == "Does not contain";
      });

      const productIDs = await mongoProductModel.find({
        $and: [
          { itemBrandID: promotion.brand_id },
          startsWith.length > 0
            ? {
                $or: startsWith.map((x) => ({
                  reference: new RegExp(`^${x.value}`, "i"),
                })),
              }
            : {},
          endsWith.length > 0
            ? {
                $or: endsWith.map((x) => ({
                  reference: new RegExp(`${x.value}$`, "i"),
                })),
              }
            : {},
          contains.length > 0
            ? {
                $or: contains.map((x) => ({
                  reference: new RegExp(`${x.value}`, "i"),
                })),
              }
            : {},
          doesNotStartWith.length > 0
            ? {
                $and: doesNotStartWith.map((x) => ({
                  reference: { $not: new RegExp(`^${x.value}`, "i") },
                })),
              }
            : {},
          doesNotEndWith.length > 0
            ? {
                $and: doesNotEndWith.map((x) => ({
                  reference: { $not: new RegExp(`${x.value}$`, "i") },
                })),
              }
            : {},
          doesNotContain.length > 0
            ? {
                $and: doesNotContain.map((x) => ({
                  reference: { $not: new RegExp(`${x.value}`, "i") },
                })),
              }
            : {},
        ],
      });

      const good_receipts = await GoodReceiptModel.fetchByItemIDs(
        productIDs.map((x) => {
          return x.itemID;
        }),
        promotion.start,
        promotion.end,
        promotion.supplier_id
      );

      const good_receipts_items = await GoodReceiptModel.fetchItemsByItemIDs(
        productIDs.map((x) => {
          return x.itemID;
        }),
        promotion.start,
        promotion.end,
        promotion.supplier_id
      );

      return res.status(200).send({
        data: promotion,
        result: good_receipts,
        items: good_receipts_items,
      });
    });
  };
}

export default PromotionController;
