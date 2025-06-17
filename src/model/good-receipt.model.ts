import { CompanyModel } from "./company.model";
import { ProductModel } from "./product.model";
import { ProductUnitModel } from "./product-unit.model";
import SupplierModel from "./supplier.model";
import { UserViewModel } from "./user.model";

export interface IGoodReceipt {
  id?: number;
  uuid: string;
  name: string;
  invoice_name: string;
  faktur: string;
  date: Date;
  supplier_id: number;
  company_id: number;
  created_by?: number;
  created_at?: Date;
  good_receipt?: IGoodReceiptItem[];

  company?: CompanyModel;
  supplier?: SupplierModel;

  user_good_receipt_code_created_byTouser?: UserViewModel;
  user_good_receipt_code_confirmed_byTouser?: UserViewModel;
}

export interface IGoodReceiptItem {
  id?: number;
  good_receipt_id?: number;
  product_id: number;
  product_unit_id: number;
  quantity: number;
  price: number;
  discount: number;

  product?: ProductModel;
  product_unit?: ProductUnitModel;
  good_receipt_code?: GoodReceiptModel;
}

class GoodReceiptModel {
  id?: number;
  uuid: string;
  name: string;
  invoice_name: string;
  faktur: string;
  date: Date;
  supplier_id: number;
  company_id: number;
  created_by?: number;
  created_at?: Date;
  good_receipt?: IGoodReceiptItem[];
  company?: CompanyModel;
  supplier?: SupplierModel;

  user_good_receipt_code_created_byTouser?: UserViewModel;
  user_good_receipt_code_confirmed_byTouser?: UserViewModel;

  constructor(data: IGoodReceipt) {
    this.id = data.id;
    this.uuid = data.uuid;
    this.name = data.name;
    this.invoice_name = data.invoice_name;
    this.faktur = data.faktur;
    this.date = data.date;
    this.supplier_id = data.supplier_id;
    this.company_id = data.company_id;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.good_receipt = data.good_receipt;
    this.company = data.company;
    this.supplier = data.supplier;
    this.user_good_receipt_code_created_byTouser =
      data.user_good_receipt_code_created_byTouser;
    this.user_good_receipt_code_confirmed_byTouser =
      data.user_good_receipt_code_confirmed_byTouser;
  }

  static fromMap(data: any) {
    return new GoodReceiptModel({
      id: data.id,
      uuid: data.uuid,
      name: data.name,
      invoice_name: data.invoice_name,
      faktur: data.faktur,
      date: data.date,
      supplier_id: data.supplier_id,
      company_id: data.company_id,
      created_by: data.created_by,
      created_at: data.created_at,
      good_receipt:
        data.good_receipt == undefined
          ? undefined
          : data.good_receipt.map((item: any) => ({
              id: item.id,
              item_id: item.item_id,
              item_unit_id: item.item_unit_id,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,

              item: ProductModel.fromMap(item.item),
              item_unit:
                item.item_unit == undefined
                  ? undefined
                  : item.item_unit == null
                  ? null
                  : ProductUnitModel.fromMap(item.item_unit),
            })),
      company:
        data.company == undefined ? undefined : new CompanyModel(data.company),
      supplier:
        data.supplier == undefined
          ? undefined
          : new SupplierModel(data.supplier),
      user_good_receipt_code_created_byTouser:
        data.user_good_receipt_code_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(data.user_good_receipt_code_created_byTouser),
      user_good_receipt_code_confirmed_byTouser:
        data.user_good_receipt_code_confirmed_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(
              data.user_good_receipt_code_confirmed_byTouser
            ),
    });
  }

  // /**
  //  * Fetch good receipt by ID
  //  * @param id
  //  * @returns
  //  */
  // static fetchByID(id: number | number[]) {
  //   if (typeof id === "number") {
  //     return prisma.good_receipt_code.findUnique({
  //       where: {
  //         id: id,
  //       },
  //       select: {
  //         id: true,
  //         name: true,
  //         date: true,
  //         user_good_receipt_code_created_byTouser: {
  //           select: {
  //             name: true,
  //           },
  //         },
  //         created_at: true,
  //         user_good_receipt_code_confirmed_byTouser: {
  //           select: {
  //             name: true,
  //           },
  //         },
  //         confirmed_at: true,
  //         is_confirm: true,
  //         is_delete: true,
  //         company: {
  //           select: {
  //             id: true,
  //             name: true,
  //             address: true,
  //             npwp: true,
  //           },
  //         },
  //         supplier: {
  //           select: {
  //             id: true,
  //             name: true,
  //             address: true,
  //             npwp: true,
  //           },
  //         },
  //         good_receipt: {
  //           select: {
  //             id: true,
  //             item_unit: {
  //               select: {
  //                 unit: true,
  //                 conversion: true,
  //               },
  //             },
  //             item: {
  //               select: {
  //                 id: true,
  //                 reference: true,
  //                 description: true,
  //                 unit: true,
  //               },
  //             },
  //             quantity: true,
  //           },
  //         },
  //         purchase_invoice: {
  //           select: {
  //             name: true,
  //             date: true,
  //             is_confirm: true,
  //             is_delete: true,
  //           },
  //         },
  //       },
  //     });
  //   } else {
  //     return prisma.good_receipt.findMany({
  //       where: {
  //         id: {
  //           in: id,
  //         },
  //       },
  //     });
  //   }
  // }

  // static fetchByName(name: string) {
  //   return prisma.good_receipt_code.findFirst({
  //     where: {
  //       name: name,
  //     },
  //     select: {
  //       name: true,
  //       date: true,
  //       supplier: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // /**
  //  * Update good receipt
  //  * Update a good receipt and good receipt items
  //  * @param name
  //  * @param date
  //  * @param created_by
  //  * @param supplier_id
  //  * @param company_id
  //  * @param items
  //  */
  // static update(data: IGoodReceipt) {
  //   return prisma.good_receipt_code.update({
  //     where: {
  //       id: data.id,
  //     },
  //     data: {
  //       name: data.name,
  //       date: data.date,
  //       supplier_id: data.supplier_id,
  //       company_id: data.company_id,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       date: true,
  //       supplier_id: true,
  //       company_id: true,
  //       purchase_invoice: {
  //         select: {
  //           id: true,
  //           discount: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // /**
  //  * Delete good receipt by good receipt code ID
  //  * Used when updating good receipt code
  //  * @param good_receipt_code_id
  //  * @returns
  //  */
  // static deleteByGoodReceiptCodeID(good_receipt_code_id: number) {
  //   return prisma.good_receipt.deleteMany({
  //     where: {
  //       good_receipt_code_id: good_receipt_code_id,
  //     },
  //   });
  // }

  // /**
  //  * Fetch good receipt archive years
  //  * @returns Promise<AnnualArchive[]>
  //  */
  // static fetchArchiveYears() {
  //   return prisma.$queryRaw<AnnualArchive[]>`
  //     SELECT DISTINCT(YEAR(good_receipt_code.date)) AS year,
  //     COUNT(id) AS count
  //     FROM good_receipt_code
  //     GROUP BY YEAR(good_receipt_code.date)
  //     ORDER BY good_receipt_code.date ASC
  //   `;
  // }

  // /**
  //  * Fetch good receipt archive months
  //  * by year
  //  * @param year
  //  * @param mode
  //  * @returns
  //  */
  // static fetchArchiveMonths(year: number) {
  //   return prisma.$queryRaw<MonthlyArchive[]>`
  //     SELECT DISTINCT(MONTH(good_receipt_code.date)) AS month,
  //     ${year} AS year,
  //     COUNT(id) AS count
  //     FROM good_receipt_code
  //     WHERE YEAR(good_receipt_code.date) = ${year}
  //     GROUP BY MONTH(good_receipt_code.date)
  //     ORDER BY good_receipt_code.date ASC
  //   `;
  // }

  // /**
  //  * Fetch archive
  //  * Fetch good receipt archive
  //  * @param year
  //  * @param month
  //  * @param page
  //  * @param mode
  //  * @returns
  //  */
  // static fetchArchive(data: IFetchArchive) {
  //   switch (data.mode) {
  //     case 0:
  //       return prisma.$transaction([
  //         prisma.$queryRawUnsafe<GoodReceiptArchive[]>(`
  //       SELECT good_receipt_code.id, good_receipt_code.date,
  //       good_receipt_code.name, good_receipt_code.is_delete,
  //       company_id AS company_id, company.name AS company_name,
  //       supplier.id AS supplier_id, supplier.name AS supplier_name,
  //       good_receipt_code.is_confirm
  //       FROM good_receipt_code
  //       JOIN company ON good_receipt_code.company_id = company.id
  //       JOIN supplier ON good_receipt_code.supplier_id = supplier.id
  //       WHERE YEAR(good_receipt_code.date) = ${
  //         data.year
  //       } AND MONTH(good_receipt_code.date) = ${data.month + 1}
  //       ${
  //         data.keyword == ""
  //           ? ""
  //           : `AND good_receipt_code.name LIKE '%${data.keyword}%'`
  //       }
  //       ORDER BY good_receipt_code.date ASC
  //       LIMIT ${data.limit}
  //       OFFSET ${data.offset}`),
  //         prisma.$queryRawUnsafe<ArchiveCount[]>(`
  //         SELECT COUNT(id) AS count FROM good_receipt_code
  //         WHERE YEAR(good_receipt_code.date) = ${
  //           data.year
  //         } AND MONTH(good_receipt_code.date) = ${data.month + 1}
  //         ${
  //           data.keyword == ""
  //             ? ""
  //             : `AND good_receipt_code.name LIKE '%${data.keyword}%'`
  //         }
  //         `),
  //       ]);
  //     case 1:
  //       return prisma.$transaction([
  //         prisma.$queryRawUnsafe<GoodReceiptArchive[]>(`
  //       SELECT good_receipt_code.id, good_receipt_code.date, good_receipt_code.name, good_receipt_code.is_delete, company_id AS company_id, company.name AS company_name, supplier.id AS supplier_id, supplier.name AS supplier_name, good_receipt_code.is_confirm
  //       FROM good_receipt_code
  //       JOIN company ON good_receipt_code.company_id = company.id
  //       JOIN supplier ON good_receipt_code.supplier_id = supplier.id
  //       WHERE YEAR(good_receipt_code.date) = ${
  //         data.year
  //       } AND MONTH(good_receipt_code.date) = ${data.month + 1}
  //       AND good_receipt_code.is_delete = 1
  //       ${
  //         data.keyword == ""
  //           ? ""
  //           : `AND good_receipt_code.name LIKE '%${data.keyword}%'`
  //       }
  //       ORDER BY good_receipt_code.date ASC
  //       LIMIT ${data.limit}
  //       OFFSET ${data.offset}`),
  //         prisma.$queryRawUnsafe<ArchiveCount[]>(`
  //         SELECT COUNT(id) AS count
  //         FROM good_receipt_code
  //         WHERE YEAR(good_receipt_code.date) = ${
  //           data.year
  //         } AND MONTH(good_receipt_code.date) = ${data.month + 1}
  //       AND good_receipt_code.is_delete = 1
  //       ${
  //         data.keyword == ""
  //           ? ""
  //           : `AND good_receipt_code.name LIKE '%${data.keyword}%'`
  //       }
  //       `),
  //       ]);
  //     case 2:
  //       return prisma.$transaction([
  //         prisma.$queryRawUnsafe<GoodReceiptArchive[]>(`
  //       SELECT good_receipt_code.id, good_receipt_code.date, good_receipt_code.name, good_receipt_code.is_delete, company_id AS company_id, company.name AS company_name, supplier.id AS supplier_id, supplier.name AS supplier_name, good_receipt_code.is_confirm
  //       FROM good_receipt_code
  //       JOIN company ON good_receipt_code.company_id = company.id
  //       JOIN supplier ON good_receipt_code.supplier_id = supplier.id
  //       WHERE YEAR(good_receipt_code.date) = ${
  //         data.year
  //       } AND MONTH(good_receipt_code.date) = ${data.month + 1}
  //       AND good_receipt_code.is_delete = 0
  //       ${
  //         data.keyword == ""
  //           ? ""
  //           : `AND good_receipt_code.name LIKE '%${data.keyword}%'`
  //       }
  //       ORDER BY good_receipt_code.date ASC
  //       LIMIT ${data.limit}
  //       OFFSET ${data.offset}`),
  //         prisma.$queryRawUnsafe<ArchiveCount[]>(`
  //         SELECT COUNT(id) AS count FROM good_receipt_code
  //         WHERE YEAR(good_receipt_code.date) = ${
  //           data.year
  //         } AND MONTH(good_receipt_code.date) = ${data.month + 1}
  //       AND good_receipt_code.is_delete = 0
  //       ${
  //         data.keyword == ""
  //           ? ""
  //           : `AND good_receipt_code.name LIKE '%${data.keyword}%'`
  //       }
  //       `),
  //       ]);
  //   }
  // }

  // /**
  //  * Search for good receipt code
  //  * It will search for certain suppliers, companies,
  //  * items, date, keyword, page, and status.
  //  * Helping users to find a particular good receipt document
  //  * @param suppliers
  //  * @param companies
  //  * @param items
  //  * @param date
  //  * @param keyword
  //  * @param page
  //  * @param status
  //  * @returns
  //  */
  // static search(
  //   suppliers: number[],
  //   companies: number[],
  //   items: number[],
  //   date: any[],
  //   keyword: string,
  //   page: number,
  //   status: number
  // ) {
  //   let query = `SELECT good_receipt_code.name, good_receipt_code.id, good_receipt_code.date, supplier.name AS supplier_name, company.name AS company_name, good_receipt_code.is_confirm, good_receipt_code.is_delete
  //     FROM good_receipt_code
  //     JOIN supplier ON good_receipt_code.supplier_id = supplier.id
  //     JOIN company ON good_receipt_code.company_id = company.id`;
  //   let conditionalQueries = "";
  //   if (items.length > 0) {
  //     conditionalQueries += ` JOIN (
  //       SELECT good_receipt.good_receipt_code_id
  //       FROM good_receipt
  //       WHERE good_receipt.item_id IN (${items.join(",")})
  //       GROUP BY good_receipt.good_receipt_code_id
  //     ) grCount ON good_receipt_code.id = grCount.good_receipt_code_id`;
  //   }

  //   if (suppliers.length > 0) {
  //     conditionalQueries += ` AND good_receipt_code.supplier_id IN (${suppliers.join(
  //       ","
  //     )})`;
  //   }

  //   if (companies.length > 0) {
  //     conditionalQueries += ` AND good_receipt_code.company_id IN (${companies.join(
  //       ","
  //     )})`;
  //   }

  //   if (date[0] != null && date[1] != null) {
  //     conditionalQueries += ` AND good_receipt_code.date BETWEEN '${date[0]}' AND '${date[1]}'`;
  //   }

  //   if (keyword != "") {
  //     conditionalQueries += ` AND good_receipt_code.name LIKE '%${keyword}%'`;
  //   }

  //   if (status == 0) {
  //     conditionalQueries += ` AND good_receipt_code.is_confirm = 1 AND good_receipt_code.is_delete = 0`;
  //   } else if (status == 1) {
  //     conditionalQueries += ` AND good_receipt_code.is_delete = 1 AND good_receipt_code.is_confirm = 0`;
  //   }

  //   return prisma.$transaction([
  //     prisma.$queryRawUnsafe<any[]>(
  //       `${query} ${conditionalQueries} ORDER BY good_receipt_code.date DESC LIMIT 10 OFFSET ${
  //         (page - 1) * 10
  //       }`
  //     ),
  //     prisma.$queryRawUnsafe<any[]>(
  //       `SELECT COUNT(good_receipt_code.id) AS count FROM good_receipt_code ${conditionalQueries}`
  //     ),
  //   ]);
  // }

  // static fetchByCompanyID(company_id: number, date: string) {
  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT item.reference, item.description, item.unit,
  //     good_receipt.quantity * COALESCE(item_unit.conversion, 1) AS quantity,
  //     good_receipt_code.name AS name, supplier.name AS opponent
  //     FROM good_receipt
  //     JOIN item ON good_receipt.item_id = item.id
  //     LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
  //     JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
  //     JOIN supplier ON good_receipt_code.supplier_id = supplier.id
  //     WHERE good_receipt_code.company_id = ${company_id}
  //     AND good_receipt_code.date = '${date}'
  //     AND good_receipt_code.is_delete = 0
  //   `);
  // }

  // static fetchByItemIDs(
  //   item_ids: number[],
  //   date_start: Date,
  //   date_end: Date | null,
  //   supplier_id: number
  // ) {
  //   if (item_ids.length == 0) return Promise.resolve([]);

  //   const formatted_date_start = `${date_start.getFullYear()}-${(
  //     date_start.getMonth() + 1
  //   )
  //     .toString()
  //     .padStart(2, "0")}-${date_start.getDate().toString().padStart(2, "0")}`;

  //   const formatted_date_end =
  //     date_end == null
  //       ? null
  //       : `${date_end.getFullYear()}-${(date_end.getMonth() + 1)
  //           .toString()
  //           .padStart(2, "0")}-${date_end
  //           .getDate()
  //           .toString()
  //           .padStart(2, "0")}`;
  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT supplier.id, supplier.name, good_receipt_code.date, p.value, good_receipt_code.name as good_receipt_code_name
  //     FROM good_receipt
  //     JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
  //     JOIN supplier ON good_receipt_code.supplier_id = supplier.id
  //     JOIN (
  //       SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt.good_receipt_code_id
  //       FROM good_receipt
  //       GROUP BY good_receipt.good_receipt_code_id
  //     ) AS p
  //     ON good_receipt_code.id = p.good_receipt_code_id
  //     WHERE good_receipt.item_id IN (${item_ids.join(",")})
  //     ${
  //       date_end != null
  //         ? `AND good_receipt_code.date BETWEEN '${formatted_date_start}' AND '${formatted_date_end}'`
  //         : `AND good_receipt_code.date >= '${formatted_date_start}'`
  //     }
  //     AND good_receipt_code.is_delete = 0
  //     AND good_receipt_code.supplier_id = ${supplier_id}
  //     GROUP BY YEAR(good_receipt_code.date), MONTH(good_receipt_code.date), DAY(good_receipt_code.date),
  //     good_receipt_code.supplier_id
  //     ORDER BY good_receipt_code.date ASC
  //   `);
  // }

  // static fetchItemsByItemIDs(
  //   item_ids: number[],
  //   date_start: Date,
  //   date_end: Date | null,
  //   supplier_id: number
  // ) {
  //   if (item_ids.length == 0) return Promise.resolve([]);

  //   const formatted_date_start = `${date_start.getFullYear()}-${(
  //     date_start.getMonth() + 1
  //   )
  //     .toString()
  //     .padStart(2, "0")}-${date_start.getDate().toString().padStart(2, "0")}`;

  //   const formatted_date_end =
  //     date_end == null
  //       ? null
  //       : `${date_end.getFullYear()}-${(date_end.getMonth() + 1)
  //           .toString()
  //           .padStart(2, "0")}-${date_end
  //           .getDate()
  //           .toString()
  //           .padStart(2, "0")}`;

  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT good_receipt_code.date, good_receipt_code.name as good_receipt_code_name, item.reference, COALESCE(item_unit.unit, item.unit) AS unit, good_receipt.quantity, good_receipt.price, good_receipt.discount
  //     FROM good_receipt
  //     JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
  //     JOIN supplier ON good_receipt_code.supplier_id = supplier.id
  //     JOIN item ON good_receipt.item_id = item.id
  //     LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
  //     WHERE good_receipt.item_id IN (${item_ids.join(",")})
  //     ${
  //       date_end != null
  //         ? `AND good_receipt_code.date BETWEEN '${formatted_date_start}' AND '${formatted_date_end}'`
  //         : `AND good_receipt_code.date >= '${formatted_date_start}'`
  //     }
  //     AND good_receipt_code.is_delete = 0
  //     AND good_receipt_code.supplier_id = ${supplier_id}
  //     ORDER BY good_receipt_code.date ASC
  //   `);
  // }
}

export default GoodReceiptModel;
