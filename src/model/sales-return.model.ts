import { PaymentMethodModel } from "./payment-method.model";
import {
  SalesInvoiceItemModel,
  SalesInvoiceModel,
} from "./sales-invoice.model";

export interface ISalesReturnCode {
  id?: number;
  name: string;
  date: Date;
  payment_method_id: number | null;
  created_by: number;
  created_at: Date;
  is_confirm: boolean;
  is_delete: boolean;
  confirmed_by: number | null;
  confirmed_at: Date | null;
  sales_invoice_code_id: number;

  sales_return?: SalesReturnModel[];
  sales_invoice_code?: SalesInvoiceModel;
}

export interface ISalesReturn {
  id?: number;
  quantity: number;
  sales_return_code_id?: number;
  sales_invoice_id: number;

  sales_invoice?: SalesInvoiceItemModel;
  sales_return_code?: SalesReturnCodeModel;
}

export class SalesReturnCodeModel {
  id?: number;
  name: string;
  date: Date;
  payment_method_id: number | null;
  created_by: number;
  created_at: Date;
  is_confirm: boolean;
  is_delete: boolean;
  confirmed_by: number | null;
  confirmed_at: Date | null;
  sales_invoice_code_id: number;
  sales_invoice_code?: SalesInvoiceModel;

  payment_method?: PaymentMethodModel;
  sales_return?: SalesReturnModel[];

  constructor(data: ISalesReturnCode) {
    this.id = data.id;
    this.name = data.name;
    this.date = data.date;
    this.payment_method_id = data.payment_method_id;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.is_confirm = data.is_confirm;
    this.is_delete = data.is_delete;
    this.confirmed_at = data.confirmed_at;
    this.confirmed_by = data.confirmed_by;
    this.sales_invoice_code_id = data.sales_invoice_code_id;

    this.sales_invoice_code = data.sales_invoice_code;
    this.sales_return = data.sales_return;
  }

  static fromMap(data: any) {
    return new SalesReturnCodeModel({
      id: data.id,
      name: data.name,
      date: new Date(data.date),
      payment_method_id: data.payment_method_id,
      created_by: data.created_by,
      created_at: new Date(data.created_at),
      is_confirm: data.is_confirm,
      is_delete: data.is_delete,
      confirmed_at: new Date(data.confirmed_at),
      confirmed_by: data.confirmed_by,
      sales_invoice_code_id: data.sales_invoice_code_id,
      sales_invoice_code:
        data.sales_invoice_code == undefined
          ? undefined
          : SalesInvoiceModel.fromMap(data.sales_invoice_code),
      sales_return:
        data.sales_return == undefined
          ? undefined
          : data.sales_return.map((x: any) => {
              return {
                quantity: Number(x.quantity),
                sales_invoice_id: x.sales_invoice_id,
                sales_return_code_id: x.sales_invoice_code_id,
                sales_invoice:
                  x.sales_invoice == undefined
                    ? undefined
                    : SalesInvoiceItemModel.fromMap(x.sales_invoice),
              };
            }),
    });
  }
  /**
   * Fetch sales return by ID
   * @param mode
   * @returns
   */
  // static fetchByID(id: number) {
  //   return prisma.sales_return_code.findUnique({
  //     where: {
  //       id: id,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       date: true,
  //       payment_method: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //       created_at: true,
  //       user_sales_return_code_created_byTouser: {
  //         select: {
  //           name: true,
  //           user_avatar: true,
  //         },
  //       },
  //       sales_return: {
  //         include: {
  //           sales_invoice: {
  //             include: {
  //               sales_invoice_code: {
  //                 include: {
  //                   customer: true,
  //                 },
  //               },
  //               product: true,
  //               product_unit: true,
  //             },
  //           },
  //         },
  //       },
  //       is_confirm: true,
  //       is_delete: true,
  //     },
  //   });
  // }

  // static fetchValueByMonthYear(month: number, year: number) {
  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT SUM(sales_return.quantity * (bill.price - bill.discount)) AS value, bill.id, bill.bill_code_id
  //     FROM sales_return
  //     JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //     JOIN bill ON sales_return.bill_id = bill.id
  //     JOIN bill_code ON bill.bill_code_id = bill_code.id
  //     WHERE MONTH(bill_code.date) = ${month} AND YEAR(bill_code.date) = ${year}
  //     AND bill_code.is_delete = 0
  //     AND sales_return_code.is_delete = 0
  //     GROUP BY bill.id
  //   `);
  // }

  // /**
  //  * Delete sales return code by id
  //  * @param id
  //  * @param created_by
  //  * @returns
  //  */
  // static deleteByID(id: number, created_by: number) {
  //   return prisma.sales_return_code.update({
  //     where: {
  //       id: id,
  //     },
  //     data: {
  //       is_confirm: false,
  //       is_delete: true,
  //       confirmed_at: new Date(),
  //       confirmed_by: created_by,
  //     },
  //     include: {
  //       sales_return: {
  //         include: {
  //           sales_invoice: {
  //             include: {
  //               sales_invoice_code: {
  //                 include: {
  //                   customer: true,
  //                 },
  //               },
  //               product: true,
  //               product_unit: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });
  // }

  // /**
  //  * Fetch sales return code by id
  //  * @param id
  //  * @returns sales return code
  //  */
  // static fetchCodeByID(id: number) {
  //   return prisma.sales_return_code.findFirst({
  //     where: {
  //       sales_return: {
  //         some: {
  //           id: id,
  //         },
  //       },
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       date: true,
  //       created_at: true,
  //       user_sales_return_code_created_byTouser: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //       sales_return: {
  //         select: {
  //           id: true,
  //           quantity: true,
  //           sales_invoice: {
  //             include: {
  //               sales_invoice_code: {
  //                 include: {
  //                   customer: true,
  //                 },
  //               },
  //               product: true,
  //               product_unit: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });
  // }

  // /**
  //  * Search sales return code
  //  * @param date
  //  * @param items
  //  * @param packages
  //  * @returns  sales return codes
  //  */
  // static fetchSearch(
  //   date: Date,
  //   items: ISalesReturnSearchItem[],
  //   packages: ISalesReturnSearchPackage[]
  // ) {
  //   let mysql_string = "";

  //   items.forEach((x) => {
  //     if (x.item_unit_id == null) {
  //       mysql_string += `
  //         AND bill_code.id IN (
  //           SELECT DISTINCT(bill.bill_code_id) AS id
  //           FROM bill
  //           LEFT JOIN (
  //             SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //             FROM sales_return
  //             JOIN sales_return_code
  //             ON sales_return.sales_return_code_id = sales_return_code.id
  //             WHERE sales_return_code.is_delete = 0
  //             GROUP BY sales_return.bill_id
  //           ) salesReturn
  //           ON bill.id = salesReturn.bill_id
  //           WHERE bill.item_id = ${x.item_id}
  //           AND bill.item_unit_id IS NULL
  //           AND (bill.quantity - COALESCE(salesReturn.quantity, 0)) >= ${x.quantity}
  //         )`;
  //     } else {
  //       mysql_string += `
  //         AND bill_code.id IN (
  //           SELECT DISTINCT(bill.bill_code_id) AS id
  //           FROM bill
  //           LEFT JOIN (
  //             SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //             FROM sales_return
  //             JOIN sales_return_code
  //             ON sales_return.sales_return_code_id = sales_return_code.id
  //             WHERE sales_return_code.is_delete = 0
  //             GROUP BY sales_return.bill_id
  //           ) salesReturn
  //           ON bill.id = salesReturn.bill_id
  //           WHERE bill.item_id = ${x.item_id}
  //           AND bill.item_unit_id = ${x.item_unit_id}
  //           AND (bill.quantity - COALESCE(salesReturn.quantity, 0)) >= ${x.quantity}
  //         )`;
  //     }
  //   });

  //   packages.forEach((x) => {
  //     mysql_string += `
  //       AND bill_code.id IN (
  //         SELECT DISTINCT(bill.bill_code_id) AS id
  //         FROM bill
  //         LEFT JOIN (
  //           SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //           FROM sales_return
  //           JOIN sales_return_code
  //             ON sales_return.sales_return_code_id = sales_return_code.id
  //             WHERE sales_return_code.is_delete = 0
  //           GROUP BY sales_return.bill_id
  //         ) salesReturn
  //         ON bill.id = salesReturn.bill_id/*  */
  //         WHERE bill.package_code_id = ${x.package_code_id}
  //         AND (bill.quantity - COALESCE(salesReturn.quantity, 0)) >= ${x.quantity}
  //       )`;
  //   });

  //   return prisma.$queryRawUnsafe(`
  //     SELECT bill_code.id, bill_code.date, bill_code.name,
  //     COALESCE(customer.name, 'Retail') AS customer_name
  //     FROM bill_code
  //     LEFT JOIN customer ON bill_code.customer_id = customer.id
  //     WHERE DAY(bill_code.date) = ${date.getDate()}
  //     AND MONTH(bill_code.date) = ${date.getMonth() + 1}
  //     AND YEAR(bill_code.date) = ${date.getFullYear()}
  //     ${mysql_string}
  //   `);
  // }

  // /**
  //  * Fetch sales return archive years
  //  * @param mode
  //  * @returns sales return archive years and count
  //  */
  // static fetchArchiveYears() {
  //   return prisma.$queryRaw<AnnualArchive[]>`
  //     SELECT DISTINCT(YEAR(sales_return_code.date)) AS year,
  //     COUNT(id) AS count
  //     FROM sales_return_code
  //     WHERE sales_return_code.date IS NOT NULL
  //     GROUP BY YEAR(sales_return_code.date)
  //     ORDER BY sales_return_code.date ASC
  //   `;
  // }

  // static fetchArchiveYearsV2() {
  //   return prisma.$queryRaw<MonthlyArchive[]>`
  //     SELECT YEAR(sales_return_code.date) AS year, MONTH(sales_return_code.date) AS month,
  //     COUNT(id) AS count
  //     FROM sales_return_code
  //     GROUP BY MONTH(sales_return_code.date), YEAR(sales_return_code.date)
  //     ORDER BY sales_return_code.date DESC
  //   `;
  // }

  // /**
  //  * Fetch sales return archive
  //  * By year
  //  * @param year
  //  * @param month
  //  * @param page
  //  * @param mode
  //  * @returns
  //  */
  // static fetchArchiveMonths(year: number) {
  //   return prisma.$queryRaw<MonthlyArchive[]>`
  //     SELECT DISTINCT(MONTH(sales_return_code.date)) AS month,
  //     YEAR(sales_return_code.date) AS year,
  //     COUNT(id) AS count
  //     FROM sales_return_code
  //     WHERE YEAR(sales_return_code.date) = ${year}
  //     GROUP BY MONTH(sales_return_code.date)
  //     ORDER BY sales_return_code.date ASC
  //   `;
  // }
  // /**
  //  * Fetch all sales return code
  //  * Used for development purpose only
  //  * @remarks
  //  * This method is only used for development purpose
  //  *
  //  * @returns
  //  */
  // static fetchAll() {
  //   return prisma.sales_return_code.findMany({
  //     where: {
  //       is_delete: false,
  //     },
  //     select: {
  //       id: true,
  //       name: true,
  //       date: true,
  //       created_at: true,
  //       sales_return: {
  //         select: {
  //           id: true,
  //           quantity: true,
  //           sales_invoice: {
  //             include: {
  //               sales_invoice_code: {
  //                 include: {
  //                   customer: true,
  //                 },
  //               },
  //               product: true,
  //               product_unit: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });
  // }
}

export class SalesReturnModel {
  id?: number;
  quantity: number;
  sales_return_code_id: number;
  sales_invoice_id: number;

  sales_invoice?: SalesInvoiceItemModel;
  sales_return_code?: SalesReturnCodeModel;

  constructor(data: ISalesReturn) {
    this.id = data.id;
    this.quantity = data.quantity;
    this.sales_return_code_id = data.sales_return_code_id!;
    this.sales_invoice_id = data.sales_invoice_id;

    this.sales_return_code = data.sales_return_code;
    this.sales_invoice = data.sales_invoice;
  }
}
