"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_helper_1 = require("../helper/database.helper");
const user_model_1 = require("./user.model");
const product_model_1 = require("./product.model");
const product_unit_model_1 = require("./product-unit.model");
class AdjustmentCaseModel {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.date = data.date;
        this.created_by = data.created_by;
        this.created_at = data.created_at;
        this.is_confirm = false;
        this.is_delete = false;
        this.confirmed_by = null;
        this.confirmed_at = new Date();
        this.company_id = data.company_id;
        this.adjustment_case = data.adjustment_case || [];
        this.user_adjustment_case_code_created_byTouser =
            data.user_adjustment_case_code_created_byTouser;
    }
    static fromMap(data) {
        return new AdjustmentCaseModel({
            id: data.id,
            name: data.name,
            date: data.date,
            created_by: data.created_by,
            created_at: data.created_at,
            is_confirm: data.is_confirm,
            is_delete: data.is_delete,
            confirmed_by: data.confirmed_by,
            confirmed_at: data.confirmed_at,
            company_id: data.company_id,
            adjustment_case: data.adjustment_case.map((ac) => ({
                id: ac.id,
                product_id: ac.product_id,
                product_unit_id: ac.product_unit_id,
                quantity: Number(ac.quantity),
                product: new product_model_1.ProductModel({
                    id: ac.product.id,
                    reference: ac.product.reference,
                    description: ac.product.description,
                    unit: ac.product.unit,
                    product_brand_id: ac.product.product_brand_id,
                    product_type_id: ac.product.product_type_id,
                }),
                product_unit: ac.product_unit == null
                    ? null
                    : new product_unit_model_1.ProductUnitViewModel({
                        product_id: ac.product_id,
                        unit: ac.product_unit.unit,
                        conversion: Number(ac.product_unit.conversion),
                    }),
            })),
            user_adjustment_case_code_created_byTouser: data.user_adjustment_case_code_created_byTouser == null ||
                data.user_adjustment_case_code_created_byTouser == undefined
                ? undefined
                : user_model_1.UserViewModel.fromMap(data.user_adjustment_case_code_created_byTouser),
        });
    }
    static fetchUnconfirmed(page) {
        return database_helper_1.prisma.$transaction([
            database_helper_1.prisma.adjustment_case_code.findMany({
                where: {
                    is_confirm: false,
                    is_delete: false,
                },
                orderBy: {
                    date: "asc",
                },
                skip: (page - 1) * 10,
                take: 10,
                select: {
                    id: true,
                    date: true,
                    name: true,
                    user_adjustment_case_code_created_byTouser: {
                        select: {
                            name: true,
                            user_avatar: true,
                        },
                    },
                    company: {
                        select: {
                            name: true,
                        },
                    },
                    adjustment_case: true,
                },
            }),
            database_helper_1.prisma.adjustment_case_code.count({
                where: {
                    is_confirm: false,
                    is_delete: false,
                },
            }),
        ]);
    }
    /**
     * Delete adjustment case code
     * @param id
     * @returns
     */
    static deleteByID(id) {
        return database_helper_1.prisma.adjustment_case_code.update({
            where: {
                id: id,
            },
            data: {
                is_delete: true,
                is_confirm: false,
            },
            select: {
                name: true,
                date: true,
                id: true,
                is_confirm: true,
                is_delete: true,
                user_adjustment_case_code_created_byTouser: {
                    select: {
                        name: true,
                    },
                },
                created_at: true,
                adjustment_case: {
                    select: {
                        id: true,
                        product: true,
                        quantity: true,
                        product_unit: true,
                    },
                },
                company: {
                    select: {
                        name: true,
                        address: true,
                        npwp: true,
                    },
                },
            },
        });
    }
    static fetchGeneralByIDs(ids) {
        if (ids.length == 0)
            return Promise.resolve([]);
        return database_helper_1.prisma.$queryRawUnsafe(`
      SELECT adjustment_case_code.id, adjustment_case_code.name, adjustment_case_code.date, "Internal" AS opponent
      FROM adjustment_case_code
      WHERE adjustment_case_code.id IN (${ids.join(",")})
    `);
    }
    static fetchByCompanyID(company_id, date) {
        return database_helper_1.prisma.$queryRawUnsafe(`
      SELECT item.reference, item.description, item.unit, adjustment_case.quantity * (COALESCE(item_unit.conversion, 1)) AS quantity, adjustment_case_code.name
      FROM adjustment_case
      JOIN adjustment_case_code ON adjustment_case_code.id = adjustment_case.adjustment_case_code_id
      JOIN item ON item.id = adjustment_case.item_id
      LEFT JOIN item_unit ON item_unit.id = adjustment_case.item_unit_id
      WHERE adjustment_case_code.company_id = ${company_id}
      AND adjustment_case.quantity > 0
      AND adjustment_case_code.date = '${date}'
      AND adjustment_case_code.is_delete = 0
      AND adjustment_case_code.is_confirm = 1
    `);
    }
}
exports.default = AdjustmentCaseModel;
//# sourceMappingURL=adjustment-case.model.js.map