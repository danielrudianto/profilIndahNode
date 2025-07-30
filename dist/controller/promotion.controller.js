"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
const error_list_1 = __importDefault(require("../assets/error_list"));
const escape_helper_1 = require("../helper/escape.helper");
class PromotionController {
    constructor(promotionRepository, productRepository) {
        this.create = async (req, res) => {
            const name = req.body.name;
            const description = req.body.description;
            const startDate = (0, moment_1.default)(req.body.start_date, "DD-MM-YYYY").toDate();
            const endDate = req.body.endDate == null
                ? null
                : (0, moment_1.default)(req.body.end_date, "DD-MM-YYYY").toDate();
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
            }
            catch (error) {
                console.error(`[error]: Error on create promotion code ${error}`);
                return res.status(500).send("Internal Server Error");
            }
        };
        this.fetch = async (req, res) => {
            try {
                const keyword = (0, escape_helper_1.translateKeyword)(req.query.keyword);
                const page = (0, escape_helper_1.translatePage)(req.query.page);
                const pageSize = Number(process.env.LIMIT);
                const result = await this.promotionRepository.fetch({
                    keyword: keyword,
                    page: page,
                    pageSize: pageSize,
                });
                return res.status(200).send(result);
            }
            catch (error) {
                console.error(`[error]: Error on fetch promotion code ${error}`);
                return res.status(500).send("Internal Server Error");
            }
        };
        this.fetchByID = async (req, res) => {
            const id = Number(req.params.id);
            try {
                const promotion = await this.promotionRepository.fetchByID(id);
                if (!promotion) {
                    return res.status(404).send("Not Found");
                }
                return res.status(200).send(promotion);
            }
            catch (error) {
                console.error(`[error]: Error on fetch promotion code by id ${error}`);
                return res.status(500).send("Internal Server Error");
            }
        };
        // static create = (req: Request, res: Response) => {
        //   // convert startDate from the format "dd-MM-YYYY" to Date object
        //   const name = req.body.name;
        //   const description = req.body.description;
        //   const startDate = moment(req.body.startDate, "DD-MM-YYYY").toDate();
        //   const endDate =
        //     req.body.endDate == null
        //       ? null
        //       : moment(req.body.endDate, "DD-MM-YYYY").toDate();
        //   const rules = req.body.rules;
        //   const target = req.body.target;
        //   const brandID = req.body.brand;
        //   const supplierID = req.body.supplier;
        //   const userID = req.body.userId;
        //   PromotionModel.create({
        //     name: name,
        //     description: description,
        //     startDate: startDate,
        //     endDate: endDate,
        //     target: target,
        //     createdBy: userID,
        //     rules: rules,
        //     brand_id: brandID,
        //     supplier_id: supplierID,
        //   })
        //     .then((result) => {
        //       return res.status(201).send(result);
        //     })
        //     .catch((err) => {
        //       console.error(`[error]: Error on create promotion code ${err}`);
        //       return res.status(500).send("Internal Server Error");
        //     });
        // };
        // static fetch = (req: Request, res: Response) => {
        //   const keyword = !req.query.keyword
        //     ? ""
        //     : decodeURIComponent(req.query.keyword as string);
        //   const page = !req.query.page ? 1 : parseInt(req.query.page as string);
        //   PromotionModel.fetch(keyword, page)
        //     .then((result) => {
        //       return res.status(200).send({
        //         data: result[0].map((x) => {
        //           return {
        //             id: x.id,
        //             name: x.name,
        //             description: x.description,
        //             start: x.start,
        //             end: x.end,
        //             target: x.target,
        //             created_by: x.promotion_code_created_by.name,
        //             status: x.is_delete
        //               ? "Deleted"
        //               : x.end != null &&
        //                 new Date(x.end).getTime() < new Date().getTime() &&
        //                 !x.is_delete
        //               ? "Expired"
        //               : (x.end == null && !x.is_delete) ||
        //                 (new Date(x.end!).getTime() >= new Date().getTime() &&
        //                   !x.is_delete)
        //               ? "Active"
        //               : "Inactive",
        //             brand: x.brand.name,
        //             supplier: x.supplier.name,
        //           };
        //         }),
        //         count: result[1],
        //       });
        //     })
        //     .catch((error) => {
        //       console.error(`[error]: Error on fetch promotion code ${error}`);
        //       return res.status(500).send("Internal Server Error");
        //     });
        // };
        // static fetchActive = (req: Request, res: Response) => {
        //   PromotionModel.fetchActive()
        //     .then((result) => {
        //       return res.status(200).send(
        //         result.map((x) => {
        //           return {
        //             id: x.id,
        //             name: x.name,
        //             description: x.description,
        //             start: x.start,
        //             end: x.end,
        //             target: x.target,
        //             created_by: x.promotion_code_created_by.name,
        //             status: x.is_delete
        //               ? "Deleted"
        //               : x.end != null &&
        //                 new Date(x.end).getTime() < new Date().getTime() &&
        //                 !x.is_delete
        //               ? "Expired"
        //               : (x.end == null && !x.is_delete) ||
        //                 (new Date(x.end!).getTime() < new Date().getTime() &&
        //                   !x.is_delete)
        //               ? "Active"
        //               : "Inactive",
        //             brand: x.brand.name,
        //             supplier: x.supplier.name,
        //           };
        //         })
        //       );
        //     })
        //     .catch((error) => {
        //       console.error(`[error]: Error on fetch active promotion code ${error}`);
        //       return res.status(500).send("Internal Server Error");
        //     });
        // };
        this.fetchResult = async (req, res) => {
            var _a, _b;
            const id = Number(req.params.id);
            const promotion = await this.promotionRepository.fetchByID(id);
            if (!promotion) {
                return res.status(404).send(error_list_1.default["Not found"]);
            }
            const startsWith = promotion.promotion_rules.filter((x) => {
                return x.rule == "Starts with";
            });
            const endsWith = promotion.promotion_rules.filter((x) => {
                return x.rule == "Ends with";
            });
            const contains = promotion.promotion_rules.filter((x) => {
                return x.rule == "Contains";
            });
            const doesNotStartWith = promotion.promotion_rules.filter((x) => {
                return x.rule == "Does not start with";
            });
            const doesNotEndWith = promotion.promotion_rules.filter((x) => {
                return x.rule == "Does not end with";
            });
            const doesNotContain = promotion.promotion_rules.filter((x) => {
                return x.rule == "Does not contain";
            });
            const productBrands = (_b = (_a = promotion.promotion_brand) === null || _a === void 0 ? void 0 : _a.map((x) => {
                return x.product_brand_id;
            })) !== null && _b !== void 0 ? _b : [];
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
            const result = await this.promotionRepository.fetchResult(productID, promotion.supplier_id, promotion.startDate, promotion.endDate);
            return res.status(200).send({
                promotion: promotion,
                result: result,
            });
        };
        this.promotionRepository = promotionRepository;
        this.productRepository = productRepository;
    }
}
exports.default = PromotionController;
//# sourceMappingURL=promotion.controller.js.map