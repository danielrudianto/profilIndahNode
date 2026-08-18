import { Request, Response } from "express";
import moment from "moment";
import ErrorList from "../constants/error-list.constant";
import { translateKeyword, translatePage } from "../utils/escape.helper";
import { ProductRepository } from "../repositories/product.repository";
import { PromotionRepository } from "../repositories/promotion.repository";

class PromotionController {
  private promotionRepository: PromotionRepository;
  private productRepository: ProductRepository;

  constructor(
    promotionRepository: PromotionRepository,
    productRepository: ProductRepository
  ) {
    this.promotionRepository = promotionRepository;
    this.productRepository = productRepository;
  }

  create = async (req: Request, res: Response) => {
    const name = req.body.name;
    const description = req.body.description;
    /*
      moment.utc, BUKAN moment lokal: kolom `start` bertipe DATE, dan Prisma
      menyimpan bagian tanggal UTC-nya. Tengah malam WIB = kemarin 17:00 UTC,
      jadi parse lokal membuat tanggal mulai MUNDUR SEHARI pada setiap
      penyimpanan. Sudah terjadi diam-diam sejak lama.
    */
    const startDate = moment.utc(req.body.start_date, "DD-MM-YYYY").toDate();
    const endDate =
      req.body.end_date == null
        ? null
        : moment.utc(req.body.end_date, "DD-MM-YYYY").toDate();
    const target = req.body.target;
    const supplierID = req.body.supplier_id;
    const userID = req.body.userId;
    const promotion_brand = req.body.promotion_brand;
    const promotion_rules = req.body.promotion_rules;

    try {
      const result = await this.promotionRepository.create({
        name: name,
        description: description,
        startDate: startDate,
        endDate: endDate,
        target: target,
        created_by: userID,
        created_at: new Date(),
        promotion_rules: promotion_rules,
        promotion_brand: promotion_brand,
        supplier_id: supplierID,
        is_delete: false,
        deleted_by: null,
        deleted_at: null,
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on create promotion code ${error}`);
      return res.status(500).send("Internal Server Error");
    }
  };

  fetch = async (req: Request, res: Response) => {
    try {
      const keyword = translateKeyword(req.query.keyword);
      const page = translatePage(req.query.page);
      const pageSize = Number(process.env.LIMIT!);

      const result = await this.promotionRepository.fetch({
        keyword: keyword,
        page: page,
        pageSize: pageSize,
        status: req.query.status as string | undefined,
      });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on fetch promotion code ${error}`);
      return res.status(500).send("Internal Server Error");
    }
  };

  fetchByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    try {
      const promotion = await this.promotionRepository.fetchByID(id);
      if (!promotion) {
        return res.status(404).send(ErrorList["Promotion not found"]);
      }

      return res.status(200).send(promotion);
    } catch (error) {
      console.error(`[error]: Error on fetch promotion code by id ${error}`);
      return res.status(500).send("Internal Server Error");
    }
  };

  update = async (req: Request, res: Response) => {
    const id = req.body.id;
    const name = req.body.name;
    const description = req.body.description;
    /* moment.utc — alasannya sama dengan pada create di atas. */
    const startDate = moment.utc(req.body.start_date, "DD-MM-YYYY").toDate();
    const endDate =
      req.body.end_date == null
        ? null
        : moment.utc(req.body.end_date, "DD-MM-YYYY").toDate();
    const target = req.body.target;
    const supplierID = req.body.supplier_id;
    const userID = req.body.userId;
    const promotion_brand = req.body.promotion_brand;
    const promotion_rules = req.body.promotion_rules;

    try {
      const result = await this.promotionRepository.update({
        id: id,
        name: name,
        description: description,
        startDate: startDate,
        endDate: endDate,
        target: target,
        created_by: userID,
        created_at: new Date(),
        promotion_rules: promotion_rules,
        promotion_brand: promotion_brand,
        supplier_id: supplierID,
        is_delete: false,
        deleted_by: null,
        deleted_at: null,
      });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating promotion data ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  fetchResult = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const promotion = await this.promotionRepository.fetchByID(id);
    if (!promotion) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    const startsWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Starts with";
    });
    const endsWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Ends with";
    });
    const contains = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Contains";
    });
    const doesNotStartWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not start with";
    });
    const doesNotEndWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not end with";
    });
    const doesNotContain = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not contain";
    });

    const productBrands =
      promotion.promotion_brand?.map((x) => {
        return x.product_brand_id;
      }) ?? [];

    const productID = await this.productRepository.fetchPromotion({
      brands: productBrands,
      startsWith: startsWith.map((x) => {
        return x.value;
      }),
      endsWith: endsWith.map((x) => {
        return x.value;
      }),
      contains: contains.map((x) => {
        return x.value;
      }),
      doesNotStartWith: doesNotStartWith.map((x) => {
        return x.value;
      }),
      doesNotEndWith: doesNotEndWith.map((x) => {
        return x.value;
      }),
      doesNotContain: doesNotContain.map((x) => {
        return x.value;
      }),
    });

    const products = await this.productRepository.fetchByIDs(productID);

    const result = await this.promotionRepository.fetchResult(
      productID,
      promotion.supplier_id,
      promotion.startDate,
      promotion.endDate
    );

    return res.status(200).send({
      promotion: promotion,
      result: result,
      products: products,
    });
  };

  downloadSalesResultByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const promotion = await this.promotionRepository.fetchByID(id);
    if (!promotion) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    const startsWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Starts with";
    });
    const endsWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Ends with";
    });
    const contains = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Contains";
    });
    const doesNotStartWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not start with";
    });
    const doesNotEndWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not end with";
    });
    const doesNotContain = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not contain";
    });

    const productBrands =
      promotion.promotion_brand?.map((x) => {
        return x.product_brand_id;
      }) ?? [];

    const productID = await this.productRepository.fetchPromotion({
      brands: productBrands,
      startsWith: startsWith.map((x) => {
        return x.value;
      }),
      endsWith: endsWith.map((x) => {
        return x.value;
      }),
      contains: contains.map((x) => {
        return x.value;
      }),
      doesNotStartWith: doesNotStartWith.map((x) => {
        return x.value;
      }),
      doesNotEndWith: doesNotEndWith.map((x) => {
        return x.value;
      }),
      doesNotContain: doesNotContain.map((x) => {
        return x.value;
      }),
    });

    const result = await this.promotionRepository.fetchSalesResult(
      productID,
      promotion.startDate,
      promotion.endDate
    );

    return res.status(200).send({
      data: result,
    });
  };

  downloadPurchaseResultByID = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const promotion = await this.promotionRepository.fetchByID(id);
    if (!promotion) {
      return res.status(404).send(ErrorList["Not found"]);
    }

    const startsWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Starts with";
    });
    const endsWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Ends with";
    });
    const contains = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Contains";
    });
    const doesNotStartWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not start with";
    });
    const doesNotEndWith = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not end with";
    });
    const doesNotContain = promotion.promotion_rules!.filter((x) => {
      return x.rule == "Does not contain";
    });

    const productBrands =
      promotion.promotion_brand?.map((x) => {
        return x.product_brand_id;
      }) ?? [];

    const productID = await this.productRepository.fetchPromotion({
      brands: productBrands,
      startsWith: startsWith.map((x) => {
        return x.value;
      }),
      endsWith: endsWith.map((x) => {
        return x.value;
      }),
      contains: contains.map((x) => {
        return x.value;
      }),
      doesNotStartWith: doesNotStartWith.map((x) => {
        return x.value;
      }),
      doesNotEndWith: doesNotEndWith.map((x) => {
        return x.value;
      }),
      doesNotContain: doesNotContain.map((x) => {
        return x.value;
      }),
    });

    const result = await this.promotionRepository.fetchPurchaseReport(
      productID,
      promotion.supplier_id,
      promotion.startDate,
      promotion.endDate
    );

    return res.status(200).send({
      data: result,
    });
  };
}

export default PromotionController;
