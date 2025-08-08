import { ProductModel } from "./product.model";
import { CustomerModel } from "./customer.model";
import { SalesInvoicePaymentModel } from "./sales-invoice-payment.model";
import { ProductUnitModel } from "./product-unit.model";
import { UserViewModel } from "./user.model";
import { PaymentMethodViewModel } from "./payment-method.model";

export interface ISalesInvoiceCode {
  id?: number;
  name: string;
  customerID: number | null;
  createdBy: number;
  createdAt: Date;
  discount: number;
  delivery: number;
  service: number;
  date: Date;
  uuid: string;
  sales_invoice: ISalesInvoice[];
  sales_invoice_payment: SalesInvoicePaymentModel[];
  isPaid: boolean;
  isConfirm: boolean;
  isDelete: boolean;
  sales: string | null;
  confirmedBy?: number | null;
  confirmedAt?: Date | null;

  customer?: CustomerModel | null;
  user_bill_code_created_byTouser?: UserViewModel;
  user_bill_code_confirmed_byTouser?: UserViewModel | null;
}

export interface ISalesInvoice {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
  product?: ProductModel;
  product_unit?: ProductUnitModel | null;
}

export class SalesInvoiceModel {
  id?: number;
  name: string;
  date: Date;
  discount: number;
  delivery: number;
  service: number;
  sales: string | null;
  customerID: number | null;
  createdBy: number;
  createdAt: Date;
  is_confirm: boolean;
  confirmedBy?: number | null;
  confirmedAt?: Date | null;
  isPaid: boolean;
  isDelete: boolean;
  uuid: string;
  payment_term: number | null = null;

  sales_invoice?: ISalesInvoice[] = [];
  sales_invoice_payment?: SalesInvoicePaymentModel[] = [];

  customer?: CustomerModel | null;
  user_bill_code_created_byTouser?: UserViewModel;
  user_bill_code_confirmed_byTouser?: UserViewModel | null;

  constructor(data: ISalesInvoiceCode) {
    this.id = data.id;
    this.name = data.name;
    this.customerID = data.customerID;
    this.customer = data.customer;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.discount = data.discount;
    this.delivery = data.delivery;
    this.service = data.service;
    this.date = data.date;
    this.is_confirm = data.isConfirm;
    this.confirmedBy = data.confirmedBy;
    this.confirmedAt = data.confirmedAt;
    this.uuid = data.uuid;
    this.isPaid = data.isPaid;
    this.sales = data.sales;
    this.isDelete = data.isDelete;
    this.sales_invoice = data.sales_invoice;
    this.sales_invoice_payment = data.sales_invoice_payment;
    this.customer = data.customer;
    this.user_bill_code_created_byTouser = data.user_bill_code_created_byTouser;
    this.user_bill_code_confirmed_byTouser =
      data.user_bill_code_confirmed_byTouser;
  }

  static fromMap(data: any) {
    return new SalesInvoiceModel({
      id: data.id,
      name: data.name,
      date: data.date,
      discount: Number(data.discount),
      delivery: Number(data.delivery),
      service: Number(data.service),
      sales: data.sales,
      customerID: data.customer_id,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      isConfirm: data.is_confirm,
      confirmedBy: data.confirmed_by,
      confirmedAt: data.confirmed_at,
      isPaid: data.is_paid,
      isDelete: data.is_delete,
      uuid: data.uuid,
      sales_invoice:
        data.sales_invoice == undefined
          ? []
          : (data.sales_invoice as any[]).map((item) => {
              return {
                id: item.id,
                product_id: item.product_id,
                product_unit_id: item.product_unit_id,
                quantity: Number(item.quantity),
                price: Number(item.price),
                discount: Number(item.discount),

                product:
                  item.product == undefined
                    ? undefined
                    : ProductModel.fromMap(item.product),
                product_unit:
                  item.product_unit == null
                    ? null
                    : item.product_unit == undefined
                    ? undefined
                    : ProductUnitModel.fromMap(item.product_unit),
              };
            }),
      sales_invoice_payment:
        data.sales_invoice_payment == undefined
          ? undefined
          : data.sales_invoice_payment!.map((x: any) => {
              return new SalesInvoicePaymentModel({
                id: x.id,
                date: new Date(x.date),
                payment_method_id: x.payment_method_id,
                value: Number(x.value),
                payment_method:
                  x.payment_method_id == null
                    ? null
                    : new PaymentMethodViewModel({
                        id: x.payment_method_id,
                        name: x.payment_method.name,
                        description: x.payment_method.description,
                      }),
                sales_invoice_code_id: data.id,
              });
            }),
      customer:
        data.customer == undefined
          ? undefined
          : data.customer == null
          ? null
          : CustomerModel.fromMap(data.customer),
      user_bill_code_created_byTouser:
        data.user_bill_code_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(data.user_bill_code_created_byTouser),
      user_bill_code_confirmed_byTouser:
        data.user_bill_code_confirmed_byTouser == undefined
          ? undefined
          : data.user_bill_code_confirmed_byTouser == null
          ? null
          : UserViewModel.fromMap(data.user_bill_code_confirmed_byTouser),
    });
  }
  // /**
  //  * Search for bill codes
  //  * Based on customer, item, date, keyword, page, and mode
  //  * @param customers
  //  * @param items
  //  * @param date
  //  * @param keyword
  //  * @param page
  //  * @param mode
  //  * @returns
  //  */
  // static search(
  //   customers: number[],
  //   items: number[],
  //   date: any[],
  //   keyword: string,
  //   page: number,
  //   mode: number
  // ) {
  //   let query = `SELECT bill_code.name, bill_code.id, bill_code.date, COALESCE(customer.name, 'Retail customer') AS customer_name, bill_code.is_confirm, bill_code.is_delete
  //     FROM bill_code
  //     LEFT JOIN customer ON bill_code.customer_id = customer.id`;
  //   let conditionalQueries = "";
  //   if (items.length > 0) {
  //     conditionalQueries += ` JOIN (
  //       SELECT bill.bill_code_id
  //       FROM bill
  //       WHERE bill.item_id IN (${items.join(",")})
  //       GROUP BY bill.bill_code_id
  //       UNION ALL SELECT bill.bill_code_id
  //       FROM bill
  //       JOIN package_code ON bill.package_code_id = package_code.id
  //       JOIN package_content ON package_code.id = package_content.package_code_id
  //       JOIN item ON package_content.item_id = item.id
  //       WHERE item.id IN (${items.join(",")})
  //       GROUP BY bill.bill_code_id
  //     ) billCount ON bill_code.id = billCount.bill_code_id`;
  //   }

  //   conditionalQueries += ` WHERE 1 = 1`;

  //   if (customers.length > 0) {
  //     conditionalQueries += ` AND bill_code.customer_id IN (${customers
  //       .filter((x) => x != 0)
  //       .join(",")})`;
  //   }

  //   if (customers.includes(0)) {
  //     conditionalQueries += ` OR bill_code.customer_id IS NULL`;
  //   }

  //   if (date[0] != null && date[1] != null) {
  //     conditionalQueries += ` AND bill_code.date BETWEEN '${date[0]}' AND '${date[1]}'`;
  //   }

  //   if (keyword != "") {
  //     conditionalQueries += ` AND bill_code.name LIKE '%${keyword}%'`;
  //   }

  //   if (mode == 0) {
  //     conditionalQueries += ` AND bill_code.is_confirm = 1 AND bill_code.is_delete = 0`;
  //   } else if (mode == 1) {
  //     conditionalQueries += ` AND bill_code.is_confirm = 0 AND bill_code.is_delete = 1`;
  //   }

  //   return prisma.$transaction([
  //     prisma.$queryRawUnsafe<any[]>(
  //       `${query} ${conditionalQueries} ORDER BY bill_code.date DESC LIMIT 10 OFFSET ${
  //         (page - 1) * 10
  //       }`
  //     ),
  //     prisma.$queryRawUnsafe<any[]>(
  //       `SELECT COUNT(bill_code.id) AS count FROM bill_code ${conditionalQueries}`
  //     ),
  //   ]);
  // }

  // static fetchSince(since: number) {
  //   return prisma.bill_code.findMany({
  //     where: {
  //       id: {
  //         gt: since,
  //       },
  //       is_delete: false,
  //       is_confirm: true,
  //     },
  //     include: {
  //       bill: {
  //         include: {
  //           package_code: {
  //             include: {
  //               package_content: {
  //                 select: {
  //                   quantity: true,
  //                   item_id: true,
  //                   item_unit: {
  //                     select: {
  //                       unit: true,
  //                       conversion: true,
  //                     },
  //                   },
  //                   item: {
  //                     select: {
  //                       reference: true,
  //                       description: true,
  //                       unit: true,
  //                     },
  //                   },
  //                   price: true,
  //                   discount: true,
  //                 },
  //               },
  //             },
  //           },
  //           item_unit: {
  //             select: {
  //               unit: true,
  //               conversion: true,
  //             },
  //           },
  //           item: {
  //             select: {
  //               id: true,
  //               reference: true,
  //               description: true,
  //               unit: true,
  //               item_type: {
  //                 select: {
  //                   name: true,
  //                   id: true,
  //                 },
  //               },
  //               item_brand: {
  //                 select: {
  //                   name: true,
  //                   id: true,
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //       customer: {
  //         select: {
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // /**
  //  * Fetch bill code and group them by year
  //  * @param mode
  //  * @returns AnnualArchive[]
  //  */
  // static fetchArchiveYears() {
  //   return prisma.$queryRaw<AnnualArchive[]>`
  //     SELECT DISTINCT(YEAR(bill_code.date)) AS year, COUNT(id) AS count
  //     FROM bill_code
  //     GROUP BY YEAR(bill_code.date)
  //   `;
  // }

  // static fetchArchiveYearsV2() {
  //   return prisma.$queryRaw<MonthlyArchive[]>`
  //     SELECT YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month,
  //     COUNT(id) AS count
  //     FROM bill_code
  //     GROUP BY MONTH(bill_code.date), YEAR(bill_code.date)
  //     ORDER BY bill_code.date DESC
  //   `;
  // }

  // /**
  //  * Fetch monthly archive
  //  * @param year
  //  * @returns  MonthlyArchive[]
  //  */
  // static fetchArchiveMonths(year: number) {
  //   return prisma.$queryRaw<MonthlyArchive[]>`
  //     SELECT DISTINCT(MONTH(bill_code.date)) AS month,
  //     YEAR(bill_code.date) AS year,
  //      COUNT(id) AS count
  //     FROM bill_code
  //     WHERE YEAR(bill_code.date) = ${year}
  //     GROUP BY MONTH(bill_code.date)
  //   `;
  // }

  // /**
  //  * Fetch archive by year and month
  //  * @param IFetchArchiveBill
  //  * @returns Promise<BillArchive[]>
  //  */
  // static fetchArchive(data: IFetchArchive) {
  //   switch (data.mode) {
  //     case 0:
  //       return prisma.$transaction([
  //         prisma.$queryRawUnsafe<BillArchive[]>(`
  //           SELECT bill_code.id, bill_code.date, bill_code.name,
  //           bill_code.is_delete,
  //           COALESCE(customer.name, 'Retail customer') AS customer_name,
  //           COALESCE(bill_code.sales, 'Internal') AS sales,
  //           bill_code.is_confirm, bill_code.customer_id
  //           FROM bill_code
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           WHERE YEAR(bill_code.date) = ${
  //             data.year
  //           } AND MONTH(bill_code.date) = ${data.month + 1}
  //           ${
  //             data.keyword == null
  //               ? ""
  //               : `AND (bill_code.name LIKE '%${data.keyword}%'
  //               OR COALESCE(customer.name, 'Retail customer')
  //               LIKE '%${data.keyword}%')`
  //           }
  //           ORDER BY date ASC
  //           LIMIT ${data.limit}
  //           OFFSET ${data.offset}
  //         `),
  //         prisma.$queryRawUnsafe<ArchiveCount[]>(`
  //           SELECT COUNT(bill_code.id) AS count
  //           FROM bill_code
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           WHERE YEAR(bill_code.date) = ${
  //             data.year
  //           } AND MONTH(bill_code.date) = ${data.month + 1}
  //           ${
  //             data.keyword == null
  //               ? ""
  //               : `AND (bill_code.name LIKE '%${data.keyword}%'
  //               OR COALESCE(customer.name, 'Retail customer')
  //               LIKE '%${data.keyword}%')`
  //           }
  //         `),
  //       ]);
  //     case 1:
  //       return prisma.$transaction([
  //         prisma.$queryRawUnsafe<BillArchive[]>(`
  //         SELECT *
  //         FROM (
  //           SELECT bill_code.id, bill_code.date, bill_code.name,
  //           bill_code.is_delete,
  //           COALESCE(customer.name, 'Retail customer') AS customer_name,
  //           COALESCE(bill_code.sales, 'Internal') AS sales,
  //           bill_code.is_confirm, bill_code.customer_id
  //           FROM bill_code
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           WHERE YEAR(bill_code.date) = ${
  //             data.year
  //           } AND MONTH(bill_code.date) = ${data.month + 1}
  //           AND bill_code.is_delete = 1
  //           ${
  //             data.keyword == null
  //               ? ""
  //               : `AND (bill_code.name LIKE '%${data.keyword}%'
  //               OR COALESCE(customer.name, 'Retail customer')
  //               LIKE '%${data.keyword}%')`
  //           }
  //           ORDER BY date ASC
  //           LIMIT ${data.limit}
  //           OFFSET ${data.offset}
  //         ) AS bill
  //         `),
  //         prisma.$queryRawUnsafe<ArchiveCount[]>(`
  //           SELECT COUNT(bill_code.id) AS count FROM bill_code
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           WHERE YEAR(bill_code.date) = ${
  //             data.year
  //           } AND MONTH(bill_code.date) = ${
  //           data.month + 1
  //         } AND bill_code.is_delete = 1
  //         ${
  //           data.keyword == null
  //             ? ""
  //             : `AND (bill_code.name LIKE '%${data.keyword}%'
  //               OR COALESCE(customer.name, 'Retail customer')
  //               LIKE '%${data.keyword}%')`
  //         }
  //         `),
  //       ]);
  //     case 2:
  //       return prisma.$transaction([
  //         prisma.$queryRawUnsafe<BillArchive[]>(`
  //         SELECT *
  //         FROM (
  //           SELECT bill_code.id, bill_code.date, bill_code.name,
  //           bill_code.is_delete,
  //           COALESCE(customer.name, 'Retail customer') AS customer_name,
  //           COALESCE(bill_code.sales, 'Internal') AS sales,
  //           bill_code.is_confirm, bill_code.customer_id
  //           FROM bill_code
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           WHERE YEAR(bill_code.date) = ${
  //             data.year
  //           } AND MONTH(bill_code.date) = ${data.month + 1}
  //           AND bill_code.is_delete = 0
  //           ${
  //             data.keyword == null
  //               ? ""
  //               : `AND (bill_code.name LIKE '%${data.keyword}%'
  //               OR COALESCE(customer.name, 'Retail customer')
  //               LIKE '%${data.keyword}%')`
  //           }
  //           ORDER BY date ASC
  //           LIMIT ${data.limit}
  //           OFFSET ${data.offset}
  //         ) AS bill
  //         `),
  //         prisma.$queryRawUnsafe<ArchiveCount[]>(`
  //           SELECT COUNT(bill_code.id) AS count FROM bill_code
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           WHERE YEAR(bill_code.date) = ${
  //             data.year
  //           } AND MONTH(bill_code.date) = ${
  //           data.month + 1
  //         } AND bill_code.is_delete = 0
  //         ${
  //           data.keyword == null
  //             ? ""
  //             : `AND (bill_code.name LIKE '%${data.keyword}%'
  //             OR COALESCE(customer.name, 'Retail customer')
  //             LIKE '%${data.keyword}%')`
  //         }
  //         `),
  //       ]);
  //   }
  // }

  // static fetchArchiveV2(data: IFetchSalesInvoiceArchive) {
  //   return prisma.$transaction([
  //     prisma.$queryRawUnsafe<BillArchiveV2[]>(`
  //     SELECT *
  //     FROM (
  //       SELECT bill_code.id, bill_code.date, bill_code.name,
  //       bill_code.is_delete,
  //       COALESCE(customer.name, 'Retail customer') AS customer_name,
  //       COALESCE(bill_code.sales, 'Internal') AS sales,
  //       bill_code.is_confirm, bill_code.customer_id, bill_code.is_paid
  //       FROM bill_code
  //       LEFT JOIN customer ON bill_code.customer_id = customer.id
  //       WHERE YEAR(bill_code.date) = ${data.year} AND MONTH(bill_code.date) = ${
  //       data.month
  //     }
  //       ${
  //         data.keyword == null || data.keyword == ""
  //           ? ""
  //           : `AND (bill_code.name LIKE '%${data.keyword}%'
  //           OR COALESCE(customer.name, 'Retail customer')
  //           LIKE '%${data.keyword}%'
  //           OR COALESCE(bill_code.sales, 'Internal') LIKE '%${data.keyword}%'
  //           )`
  //       }
  //       ${
  //         data.status == 0
  //           ? ""
  //           : data.status == 1
  //           ? `AND bill_code.is_delete = 1`
  //           : `AND bill_code.is_delete = 0`
  //       }
  //       ${
  //         data.paymentStatus == 0
  //           ? ""
  //           : data.paymentStatus == 1
  //           ? `AND bill_code.is_paid = 1`
  //           : `AND bill_code.is_paid = 0`
  //       }
  //       AND bill_code.date BETWEEN '${data.startDate}' AND '${data.endDate}'
  //       ORDER BY date ASC
  //       LIMIT ${data.limit}
  //       OFFSET ${data.offset}
  //     ) AS bill
  //     `),
  //     prisma.$queryRawUnsafe<ArchiveCount[]>(`
  //       SELECT COUNT(bill_code.id) AS count FROM bill_code
  //       LEFT JOIN customer ON bill_code.customer_id = customer.id
  //       WHERE YEAR(bill_code.date) = ${data.year} AND MONTH(bill_code.date) = ${
  //       data.month
  //     }
  //     ${
  //       data.keyword == null || data.keyword == ""
  //         ? ""
  //         : `AND (bill_code.name LIKE '%${data.keyword}%'
  //           OR COALESCE(customer.name, 'Retail customer')
  //           LIKE '%${data.keyword}%'
  //           OR COALESCE(bill_code.sales, 'Internal') LIKE '%${data.keyword}%')`
  //     }
  //     ${
  //       data.status == 0
  //         ? ""
  //         : data.status == 1
  //         ? `AND bill_code.is_delete = 1`
  //         : `AND bill_code.is_delete = 0`
  //     }
  //     ${
  //       data.paymentStatus == 0
  //         ? ""
  //         : data.paymentStatus == 1
  //         ? `AND bill_code.is_paid = 1`
  //         : `AND bill_code.is_paid = 0`
  //     }
  //     AND bill_code.date BETWEEN '${data.startDate}' AND '${data.endDate}'
  //     `),
  //   ]);
  // }

  // /**
  //  * Delete bill code by id
  //  * @param id
  //  * @param deleted_by
  //  * @returns BillCode
  //  */
  // static deleteByID(id: number, deleted_by: number) {
  //   return prisma.bill_code.update({
  //     where: {
  //       id: id,
  //     },
  //     data: {
  //       is_confirm: false,
  //       is_delete: true,
  //       confirmed_at: new Date(),
  //       confirmed_by: deleted_by,
  //     },
  //     include: {
  //       bill: {
  //         include: {
  //           package_code: {
  //             select: {
  //               package_content: {
  //                 select: {
  //                   quantity: true,
  //                   item_id: true,
  //                   item_unit: {
  //                     select: {
  //                       unit: true,
  //                       conversion: true,
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //           item: {
  //             select: {
  //               id: true,
  //               unit: true,
  //             },
  //           },
  //           item_unit: {
  //             select: {
  //               unit: true,
  //               conversion: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });
  // }

  // /**
  //  * Fetch chart items
  //  * @param monthly
  //  * @param limit
  //  * @param offset
  //  * @returns
  //  */
  // static fetchChartItems(monthly: boolean, limit: number, offset: number) {
  //   const date = new Date();
  //   const start_date = new Date();

  //   if (monthly) {
  //     date.setMonth(date.getMonth() - offset);
  //     start_date.setMonth(date.getMonth() - limit - offset);

  //     const prev_date = new Date();
  //     const start_prev_date = new Date();
  //     prev_date.setMonth(date.getMonth() - offset - 12);
  //     start_prev_date.setMonth(date.getMonth() - limit - offset - 12);

  //     return prisma.$transaction([
  //       prisma.$queryRawUnsafe(`SELECT year, month, (delivery + value - discount + service) AS value, diff FROM (
  //         SELECT YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, SUM(bill_code.delivery) AS delivery, SUM(bill_code.discount) AS discount, SUM(a.value) AS value, SUM(bill_code.service) AS service, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
  //         FROM bill_code
  //         JOIN (
  //           SELECT (SUM(bill.price - bill.discount) * bill.quantity) AS value, bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //         ) AS a
  //         ON bill_code.id = a.bill_code_id
  //         WHERE bill_code.date BETWEEN '${start_date
  //           .getFullYear()
  //           .toString()}-${(start_date.getMonth() + 1)
  //         .toString()
  //         .padStart(2, "0")}-01' AND LAST_DAY('${date
  //         .getFullYear()
  //         .toString()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-01')
  //         AND bill_code.is_confirm = 1
  //         AND bill_code.is_delete = 0
  //         GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)) AS bill_a`),
  //       prisma.$queryRawUnsafe(`SELECT year, month, (delivery + value - discount + service) AS value, diff FROM (
  //         SELECT YEAR(bill_code.date) AS year, MONTH(bill_code.date) AS month, SUM(bill_code.delivery) AS delivery, SUM(bill_code.discount) AS discount, SUM(a.value) AS value, SUM(bill_code.service) AS service, TIMESTAMPDIFF(MONTH, LAST_DAY(curdate()), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(LAST_DAY(bill_code.date)),2,'00')), '%Y-%m-%d')) AS diff
  //         FROM bill_code
  //         JOIN (
  //           SELECT (SUM(bill.price - bill.discount) * bill.quantity) AS value, bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //           ) AS a
  //         ON bill_code.id = a.bill_code_id
  //         WHERE bill_code.date BETWEEN '${start_prev_date
  //           .getFullYear()
  //           .toString()}-${(start_prev_date.getMonth() + 1)
  //         .toString()
  //         .padStart(2, "0")}-01' AND LAST_DAY('${prev_date
  //         .getFullYear()
  //         .toString()}-${(prev_date.getMonth() + 1)
  //         .toString()
  //         .padStart(2, "0")}-01')
  //         AND bill_code.is_confirm = 1
  //         AND bill_code.is_delete = 0
  //         GROUP BY YEAR(bill_code.date), MONTH(bill_code.date)) AS bill_a`),
  //     ]);
  //   } else {
  //     date.setDate(date.getDate() - offset);
  //     start_date.setDate(date.getDate() - limit - offset);
  //     return prisma.$queryRawUnsafe(`SELECT diff, (delivery + value - discount + service) AS value FROM (
  //       SELECT datediff(curdate(), STR_TO_DATE(CONCAT(YEAR(bill_code.date),'-',LPAD(MONTH(bill_code.date),2,'00'),'-',LPAD(DAY(bill_code.date),2,'00')), '%Y-%m-%d')) AS diff, SUM(a.value) AS value, SUM(delivery) AS delivery, SUM(discount) AS discount, SUM(service) AS service
  //       FROM bill_code
  //       JOIN (
  //         SELECT (SUM(bill.price - bill.discount) * bill.quantity) AS value, bill_code_id
  //         FROM bill
  //         GROUP BY bill.bill_code_id
  //       ) AS a
  //       ON bill_code.id = a.bill_code_id
  //       WHERE bill_code.date BETWEEN '${start_date.getFullYear().toString()}-${(
  //       start_date.getMonth() + 1
  //     )
  //       .toString()
  //       .padStart(2, "0")}-${start_date
  //       .getDate()
  //       .toString()
  //       .padStart(2, "0")}' AND '${date.getFullYear().toString()}-${(
  //       date.getMonth() + 1
  //     )
  //       .toString()
  //       .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}'
  //       AND bill_code.is_confirm = 1
  //       AND bill_code.is_delete = 0
  //       GROUP BY YEAR(bill_code.date), MONTH(bill_code.date), DAY(bill_code.date)) AS bill_a`);
  //   }
  // }

  // /**
  //  * Fetch by CustomerID
  //  * @param customer_id
  //  * @returns
  //  */
  // static fetchByCustomerId(customer_id: number | null) {
  //   if (customer_id == null) {
  //     return prisma.$queryRaw`
  //       SELECT SUM(bill_.value + bill_code.delivery - bill_code.discount + bill_code.service) AS value, COUNT(bill_code) AS count
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //         FROM bill
  //         GROUP BY bill.bill_code_id
  //       ) AS bill_
  //       ON bill_code.id = bill_.bill_code_id = bill_code.id
  //       WHERE bill_code.customer_id IS NULL
  //     `;
  //   } else {
  //     return prisma.$queryRaw`
  //       SELECT SUM(bill_.value + bill_code.delivery - bill_code.discount + bill_code.service) AS value, COUNT(bill_code) AS count
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //         FROM bill
  //         GROUP BY bill.bill_code_id
  //       ) AS bill_
  //       ON bill_code.id = bill_.bill_code_id = bill_code.id
  //       WHERE bill_code.customer_id = ${customer_id}
  //     `;
  //   }
  // }

  // static fetchSum(month: number = 0, year: number) {
  //   return prisma.$queryRawUnsafe<IReportBill[]>(`
  //       SELECT SUM(value) AS value, SUM(discount) AS discount,
  //       SUM(delivery) AS delivery, SUM(service) AS service
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM((bill.quantity - COALESCE(returnTable.quantity, 0)) * (bill.price - bill.discount)) AS value, bill_code_id
  //         FROM bill
  //         LEFT JOIN (
  //           SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id AS id
  //           FROM sales_return
  //           JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //           WHERE sales_return_code.is_delete = 0
  //           AND sales_return_code.is_confirm = 1
  //           GROUP BY sales_return.bill_id
  //         ) returnTable
  //         ON returnTable.id = bill.id
  //         GROUP BY bill.bill_code_id
  //       ) bills
  //       ON bill_code.id = bills.bill_code_id
  //       AND YEAR(bill_code.date) = ${year}
  //       ${month == 0 ? "" : `AND MONTH(bill_code.date) = ${month}`}
  //       AND bill_code.is_confirm = 1
  //       AND bill_code.is_delete = 0
  //     `);
  // }

  // static fetchMoneyReceipt(formattedDate: string) {
  //   return prisma.$queryRawUnsafe(`
  //   SELECT method.id, COALESCE(method.name, "Cash") AS name,
  //   pm.value AS bill,
  //   sr.value AS sales_return,
  //   dp.value AS deposit
  //   FROM (
  // 	SELECT id, name FROM payment_method
  //       WHERE payment_method.is_delete = 0
  //       UNION ALL
  //       SELECT 0 AS id, "Cash" AS name
  //   ) AS method
  //   LEFT JOIN (
  //     SELECT SUM(value) AS value, COALESCE(bill_payment.payment_method_id, 0) AS payment_method_id
  //     FROM bill_payment
  //     JOIN bill_code ON bill_payment.bill_code_id = bill_code.id
  //     WHERE bill_code.is_confirm = 1
  //     AND bill_code.is_delete = 0
  //     AND bill_code.date = '${formattedDate}'
  //     GROUP BY bill_payment.payment_method_id
  //   ) pm
  //   ON method.id = pm.payment_method_id
  //   LEFT JOIN (
  //     SELECT SUM(sr_detail.value) AS value, COALESCE(payment_method_id, 0) AS payment_method_id
  //     FROM sales_return_code
  //     JOIN (
  //       SELECT SUM(sales_return.quantity * (bill.price - bill.discount)) AS value, sales_return_code_id
  //         FROM sales_return
  //         JOIN bill ON sales_return.bill_id = bill.id
  //         GROUP BY sales_return.sales_return_code_id
  //       ) sr_detail
  //       ON sales_return_code.id = sr_detail.sales_return_code_id
  //       WHERE sales_return_code.is_confirm = 1
  //       AND sales_return_code.is_delete = 0
  //       AND sales_return_code.date = '${formattedDate}'
  //       GROUP BY sales_return_code.payment_method_id
  //   ) sr
  //   ON method.id = sr.payment_method_id
  //   LEFT JOIN (
  //     SELECT SUM(value) AS value, COALESCE(payment_method_id, 0) AS payment_method_id
  //     FROM deposit_payment
  //     JOIN deposit_code ON deposit_payment.deposit_code_id = deposit_code.id
  //     WHERE deposit_code.is_delete = 0
  //     AND deposit_payment.date = '${formattedDate}'
  //     GROUP BY deposit_payment.payment_method_id
  //   ) dp
  //   ON method.id = dp.payment_method_id
  //   `);
  // }

  // static fetchAppendix(month: number, year: number) {
  //   return prisma.$queryRawUnsafe(`
  //       SELECT bill_code.date, bill_code.name,
  //       COALESCE(customer.name, "Retail") AS customer_name,
  //       billValue.discount, billValue.value, bill_code.delivery,
  //       bill_code.service
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM((bill.quantity - COALESCE(returnTable.quantity, 0)) * bill.price) AS value,
  //         SUM((bill.quantity - COALESCE(returnTable.quantity, 0)) * bill.discount) AS discount,
  //         bill.bill_code_id
  //         FROM bill
  //         LEFT JOIN (
  //           SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //           FROM sales_return
  //           JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //           WHERE sales_return_code.is_confirm = 1
  //           AND sales_return_code.is_delete = 0
  //           GROUP BY sales_return.bill_id
  //         ) returnTable
  //         ON bill.id = returnTable.bill_id
  //         GROUP BY bill.bill_code_id
  //       ) billValue
  //       ON bill_code.id = billValue.bill_code_id
  //       LEFT JOIN customer ON bill_code.customer_id = customer.id
  //       WHERE bill_code.is_confirm = 1
  //       AND bill_code.is_delete = 0
  //       AND YEAR(bill_code.date) = ${year}
  //       ${month == 0 ? "" : `AND MONTH(bill_code.date) = ${month}`}
  //       ORDER BY bill_code.date ASC
  //   `);
  // }

  // /**
  //  * Calculate total sales for a month
  //  * @param month
  //  * @param year
  //  * @param mode
  //  * @returns
  //  */
  // static calculateTotalSales(month: number, year: number, mode: string) {
  //   switch (mode) {
  //     case "plain":
  //       return prisma.$transaction([
  //         prisma.$queryRaw<any[]>`
  //           SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, DAY(bill_code.date) AS day
  //           FROM bill
  //           JOIN bill_code ON bill.bill_code_id = bill_code.id
  //           LEFT JOIN (
  //             SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //             FROM sales_return
  //             JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //             WHERE sales_return_code.is_confirm = 1
  //             AND sales_return_code.is_delete = 0
  //             GROUP BY sales_return.bill_id
  //           ) salesReturn
  //           ON bill.id = salesReturn.bill_id
  //           WHERE bill_code.is_confirm = 1
  //           AND bill_code.is_delete = 0
  //           AND YEAR(bill_code.date) = ${year}
  //           AND MONTH(bill_code.date) = ${month}
  //           GROUP BY DAY(bill_code.date)
  //         `,
  //         prisma.$queryRaw<any[]>`
  //           SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, customer.id AS customer_id, COALESCE(customer.name, "Retail customer") AS customer_name
  //           FROM bill
  //           JOIN bill_code ON bill.bill_code_id = bill_code.id
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           LEFT JOIN (
  //             SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //             FROM sales_return
  //             JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //             WHERE sales_return_code.is_confirm = 1
  //             AND sales_return_code.is_delete = 0
  //             GROUP BY sales_return.bill_id
  //           ) salesReturn
  //           ON bill.id = salesReturn.bill_id
  //           WHERE bill_code.is_confirm = 1
  //           AND bill_code.is_delete = 0
  //           AND YEAR(bill_code.date) = ${year}
  //           AND MONTH(bill_code.date) = ${month}
  //           GROUP BY bill_code.customer_id
  //         `,
  //       ]);
  //     case "customer":
  //       return prisma.$queryRaw<any[]>`
  //         SELECT SUM((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount)) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, customer.id AS customer_id, COALESCE(customer.name, "Retail customer") AS customer_name
  //         FROM bill
  //         JOIN bill_code ON bill.bill_code_id = bill_code.id
  //         LEFT JOIN (
  //           SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //           FROM sales_return
  //           JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //           WHERE sales_return_code.is_confirm = 1
  //           AND sales_return_code.is_delete = 0
  //           GROUP BY sales_return.bill_id
  //         ) salesReturn
  //         ON bill.id = salesReturn.bill_id
  //         LEFT JOIN customer ON bill_code.customer_id = customer.id
  //         WHERE bill_code.is_confirm = 1
  //         AND bill_code.is_delete = 0
  //         AND YEAR(bill_code.date) = ${year}
  //         AND MONTH(bill_code.date) = ${month}
  //         GROUP BY bill_code.customer_id
  //       `;
  //     case "type":
  //       return prisma.$queryRaw<any[]>`
  //         SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, item_type.name AS item_type_name
  //         FROM bill
  //         JOIN bill_code ON bill.bill_code_id = bill_code.id
  //         JOIN item ON bill.item_id = item.id
  //         JOIN item_type ON item.item_type_id = item_type.id
  //         LEFT JOIN (
  //           SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //           FROM sales_return
  //           JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //           WHERE sales_return_code.is_confirm = 1
  //           AND sales_return_code.is_delete = 0
  //           GROUP BY sales_return.bill_id
  //         ) salesReturn
  //         ON bill.id = salesReturn.bill_id
  //         WHERE bill_code.is_confirm = 1
  //         AND bill_code.is_delete = 0
  //         AND YEAR(bill_code.date) = ${year}
  //         AND MONTH(bill_code.date) = ${month}
  //         GROUP BY item_type.id
  //       `;
  //     case "brand":
  //       return prisma.$queryRaw<any[]>`
  //         SELECT SUM(((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount))) AS value, item_brand.name AS item_brand_name
  //         FROM bill
  //         JOIN bill_code ON bill.bill_code_id = bill_code.id
  //         JOIN item ON bill.item_id = item.id
  //         JOIN item_brand ON item.item_brand_id = item_brand.id
  //         LEFT JOIN (
  //           SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //           FROM sales_return
  //           JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //           WHERE sales_return_code.is_confirm = 1
  //           AND sales_return_code.is_delete = 0
  //           GROUP BY sales_return.bill_id
  //         ) salesReturn
  //         ON bill.id = salesReturn.bill_id
  //         WHERE bill_code.is_confirm = 1
  //         AND bill_code.is_delete = 0
  //         AND YEAR(bill_code.date) = ${year}
  //         AND MONTH(bill_code.date) = ${month}
  //         GROUP BY item_brand.id
  //       `;
  //     case "package":
  //       return prisma.$queryRaw<any[]>`
  //         SELECT SUM(bill.quantity - coalesce(salesReturn.quantity, 0)) AS quantity, SUM((bill.quantity - coalesce(salesReturn.quantity, 0)) * (bill.price - bill.discount)) AS value, package_code_id, package_code.name, package_code.description
  //         FROM bill
  //         LEFT JOIN (
  //           SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
  //             FROM sales_return
  //             JOIN sales_return_code
  //             ON sales_return.sales_return_code_id = sales_return_code.id
  //             WHERE sales_return_code.is_confirm = 1
  //             AND sales_return_code.is_delete = 0
  //             GROUP BY sales_return.bill_id
  //         ) AS salesReturn
  //         ON bill.id = salesReturn.bill_id
  //         JOIN package_code ON bill.package_code_id = package_code.id
  //         JOIN bill_code ON bill.bill_code_id = bill_code.id
  //         WHERE bill_code.is_confirm = 1
  //         AND bill_code.is_delete = 0
  //         AND YEAR(bill_code.date) = ${year}
  //         AND MONTH(bill_code.date) = ${month}
  //         group by bill.package_code_id
  //         ORDER BY value DESC
  //       `;
  //     case "sales":
  //       return prisma.$queryRaw<any[]>`
  //         SELECT COUNT(DISTINCT(bill_code.id)) AS count, SUM((bill.quantity) * (bill.price - bill.discount)) AS value, SUM(bill_code.discount) AS discount, SUM(delivery) AS delivery, SUM(service) AS service, COALESCE(bill_code.sales, "Internal") AS sales_name
  //         FROM bill
  //         JOIN bill_code ON bill.bill_code_id = bill_code.id
  //         WHERE bill_code.is_confirm = 1
  //         AND bill_code.is_delete = 0
  //         AND YEAR(bill_code.date) = ${year}
  //         AND MONTH(bill_code.date) = ${month}
  //         GROUP BY bill_code.sales
  //       `;
  //     case "V2":
  //       return prisma.$queryRaw<any[]>`
  //         SELECT
  //           ((bill.quantity - COALESCE(salesReturn.quantity, 0)) * (bill.price - bill.discount)) AS value,
  //           item_brand.name AS item_brand_name,
  //           item_type.name AS item_type_name,
  //           customer.name AS customer_name,
  //           item_brand_id,
  //           item_type_id,
  //           customer_id,
  //           bill_code.sales,
  //           bill_code.id,
  //           bill_code.delivery,
  //           bill_code.service,
  //           bill_code.discount,
  //           DAY(bill_code.date) AS day
  //         FROM
  //           bill
  //         JOIN
  //           bill_code ON bill.bill_code_id = bill_code.id
  //         JOIN
  //           item ON bill.item_id = item.id
  //         JOIN
  //           item_brand ON item.item_brand_id = item_brand.id
  //         JOIN
  //           item_type ON item.item_type_id = item_type.id
  //         LEFT JOIN
  //           customer ON bill_code.customer_id = customer.id
  //         LEFT JOIN (
  //           SELECT
  //             bill_id, SUM(quantity) AS quantity
  //           FROM
  //             sales_return
  //           JOIN
  //             sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
  //           WHERE
  //             sales_return_code.is_confirm = 1
  //             AND sales_return_code.is_delete = 0
  //           GROUP BY
  //             bill_id
  //         ) salesReturn ON bill.id = salesReturn.bill_id
  //         WHERE
  //           bill_code.is_confirm = 1
  //           AND bill_code.is_delete = 0
  //           AND YEAR(bill_code.date) = ${year}
  //           AND MONTH(bill_code.date) = ${month}
  //       `;
  //     default:
  //       return prisma.$queryRawUnsafe<any[]>(`
  //           SELECT COALESCE(bill_code.sales, 'Internal') AS sales, bill_code.date, COALESCE(customer.name, 'Retail customer') AS customer_name,
  //           bill_code.name, pv.value, bill_code.discount, bill_code.service, bill_code.delivery
  //           FROM bill_code
  //           LEFT JOIN customer ON bill_code.customer_id = customer.id
  //           JOIN (
  //             SELECT (bill.quantity * (bill.price - bill.discount)) AS value,
  //             bill.bill_code_id
  //             FROM bill
  //             GROUP BY bill.bill_code_id
  //           ) pv
  //           ON bill_code.id = pv.bill_code_id
  //           WHERE bill_code.is_delete = 0
  //           AND YEAR(bill_code.date) = ${year}
  //           AND MONTH(bill_code.date) = ${month}
  //           ORDER BY bill_code.date ASC
  //       `);
  //       break;
  //   }
  // }

  // static countByCustomerIds(customer_ids: number[]) {
  //   return prisma.bill_code.groupBy({
  //     by: ["customer_id"],
  //     where: {
  //       customer_id: {
  //         in: customer_ids,
  //       },
  //       is_delete: false,
  //     },
  //     _count: true,
  //   });
  // }

  // countByDate(date: Date) {
  //   return prisma.bill_code.count({
  //     where: {
  //       date: {
  //         lte: new Date(
  //           date.getFullYear(),
  //           date.getMonth(),
  //           date.getDate(),
  //           0,
  //           0,
  //           0,
  //           0
  //         ),
  //         gte: new Date(
  //           date.getFullYear(),
  //           date.getMonth() + 1,
  //           date.getDate(),
  //           0,
  //           0,
  //           0,
  //           0
  //         ),
  //       },
  //     },
  //   });
  // }

  // static fetchByDate(year: number, month: number, day: number | null) {
  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT (a.delivery + a.value - a.discount + a.service) AS value
  //     FROM (
  //       SELECT SUM((bill.price - bill.discount) * bill.quantity) AS value, bill_code.delivery, bill_code.discount, bill_code.service
  //       FROM bill
  //       JOIN bill_code ON bill.bill_code_id = bill_code.id
  //       WHERE bill_code.is_confirm = 1
  //       AND bill_code.is_delete = 0
  //       AND YEAR(bill_code.date) = ${year} AND MONTH(bill_code.date) = ${month}
  //       ${
  //         day == null
  //           ? ""
  //           : day < 0
  //           ? "AND DAY(bill_code.date) <= " + Math.abs(day)
  //           : "AND DAY(bill_code.date) = " + day
  //       }
  //     ) AS a`);
  // }

  // /**
  //  * Fetch today and yesterday's sales
  //  * Assuming only 1.393 sales item per day (as of 2024-06-14)
  //  */
  // static fetchRecentSales() {
  //   const todayDate = new Date();
  //   const yesterdayDate = new Date();
  //   yesterdayDate.setDate(todayDate.getDate() - 1);

  //   return prisma.$transaction([
  //     prisma.$queryRawUnsafe<any[]>(`
  //       SELECT SUM(b.value) - bill_code.discount + bill_code.delivery + bill_code.service AS value
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //           ORDER BY bill_code_id DESC
  //           LIMIT 2800
  //       ) AS b
  //       ON bill_code.id = b.bill_code_id
  //       WHERE bill_code.is_delete = 0
  //       AND bill_code.date BETWEEN '${
  //         todayDate.toISOString().split("T")[0]
  //       }' AND '${todayDate.toISOString().split("T")[0]}'
  //     `),
  //     prisma.$queryRawUnsafe<any[]>(`
  //       SELECT SUM(b.value) - bill_code.discount + bill_code.delivery + bill_code.service AS value
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //           ORDER BY bill_code_id DESC
  //           LIMIT 5600
  //       ) AS b
  //       ON bill_code.id = b.bill_code_id
  //       WHERE bill_code.is_delete = 0
  //       AND bill_code.date BETWEEN '${
  //         yesterdayDate.toISOString().split("T")[0]
  //       }' AND '${yesterdayDate.toISOString().split("T")[0]}'
  //     `),
  //   ]);
  // }

  // /**
  //  * Fetch this month's and last month's sales
  //  * Assuming only 1.393 sales item per day (as of 2024-06-14)
  //  */
  // static fetchOlderSales() {
  //   const date = new Date();
  //   const month = date.getMonth();
  //   const year = date.getFullYear();

  //   const lastDate = new Date();
  //   lastDate.setMonth(month - 1);
  //   const lastMonth = lastDate.getMonth();
  //   const lastYear = lastDate.getFullYear();
  //   return prisma.$transaction([
  //     prisma.$queryRawUnsafe<any[]>(`
  //       SELECT SUM(b.value) - bill_code.discount + bill_code.delivery + bill_code.service AS value
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //           ORDER BY bill_code_id DESC
  //           LIMIT 84000
  //       ) AS b
  //       ON bill_code.id = b.bill_code_id
  //       WHERE bill_code.is_delete = 0
  //       AND MONTH(bill_code.date) = ${
  //         month + 1
  //       } AND YEAR(bill_code.date) = ${year}
  //     `),
  //     prisma.$queryRawUnsafe<any[]>(`
  //       SELECT SUM(b.value) - bill_code.discount + bill_code.delivery + bill_code.service AS value
  //       FROM bill_code
  //       JOIN (
  //         SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //           ORDER BY bill_code_id DESC
  //           LIMIT 168000
  //       ) AS b
  //       ON bill_code.id = b.bill_code_id
  //       WHERE bill_code.is_delete = 0
  //       AND MONTH(bill_code.date) = ${
  //         lastMonth + 1
  //       } AND YEAR(bill_code.date) = ${lastYear}
  //     `),
  //   ]);
  // }

  // /**
  //  * Fetch all bill code
  //  * Used for development purpose only
  //  * @remarks
  //  * This method is only used for development purpose
  //  *
  //  * @returns
  //  */
  // static fetchAll() {
  //   return prisma.bill_code.findMany({
  //     where: {
  //       is_delete: false,
  //     },
  //     include: {
  //       bill: {
  //         include: {
  //           item: {
  //             select: {
  //               id: true,
  //               reference: true,
  //               description: true,
  //               unit: true,
  //             },
  //           },
  //           item_unit: {
  //             select: {
  //               unit: true,
  //               conversion: true,
  //             },
  //           },
  //           package_code: {
  //             select: {
  //               package_content: {
  //                 select: {
  //                   quantity: true,
  //                   price: true,
  //                   discount: true,
  //                   item: {
  //                     select: {
  //                       id: true,
  //                       reference: true,
  //                       description: true,
  //                       unit: true,
  //                     },
  //                   },
  //                   item_unit: {
  //                     select: {
  //                       unit: true,
  //                       conversion: true,
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //       customer: {
  //         select: {
  //           id: true,
  //           name: true,
  //         },
  //       },
  //     },
  //   });
  // }

  // /**
  //  * Fetch all receivable by Bill Code ID
  //  */
  // static fetchReceivableIDs() {
  //   return prisma.bill_code.findMany({
  //     where: {
  //       is_delete: false,
  //       is_paid: false,
  //     },
  //     select: {
  //       id: true,
  //     },
  //   });
  // }

  // static fetchReceivableByIDs(ids: number[]) {
  //   if (ids.length == 0) return Promise.resolve([]);
  //   return prisma.$queryRawUnsafe(`
  //     SELECT SUM(COALESCE(b.value, 0) - bill_code.discount + bill_code.delivery + bill_code.service - COALESCE(p.value, 0)) AS value,
  //     bill_code.customer_id,
  //     COALESCE(customer.name, 'Retail customer') AS customer_name
  //     FROM bill_code
  //     LEFT JOIN customer ON bill_code.customer_id = customer.id
  //     LEFT JOIN (
  //       SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //       FROM bill
  //       WHERE bill.bill_code_id IN (${ids.join(",")})
  //       GROUP BY bill.bill_code_id
  //     ) AS b
  //     ON bill_code.id = b.bill_code_id
  //     LEFT JOIN (
  //       SELECT SUM(bill_payment.value) AS value, bill_payment.bill_code_id
  //         FROM bill_payment
  //         WHERE bill_payment.bill_code_id IN (${ids.join(",")})
  //         GROUP BY bill_code_id
  //     ) AS p
  //     ON bill_code.id = p.bill_code_id
  //     WHERE bill_code.is_delete = 0
  //     AND bill_code.id IN (${ids.join(",")})
  //     GROUP BY bill_code.customer_id
  //     HAVING value > 0
  //     ORDER BY value DESC
  //   `);
  // }

  // static fetchReceivableDetailByIDs(ids: number[]) {
  //   if (ids.length == 0) return Promise.resolve([]);
  //   return prisma.$queryRawUnsafe(`
  //     SELECT bill_code.id, bill_code.payment_term, (COALESCE(b.value, 0) - bill_code.discount + bill_code.delivery + bill_code.service) AS value,
  //     COALESCE(p.value, 0) AS payment,
  //     bill_code.customer_id, bill_code.name, bill_code.date
  //     FROM bill_code
  //     JOIN (
  //       SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //       FROM bill
  //       WHERE bill.bill_code_id IN (${ids.join(",")})
  //       GROUP BY bill.bill_code_id
  //     ) AS b
  //     ON bill_code.id = b.bill_code_id
  //     LEFT JOIN (
  //       SELECT SUM(bill_payment.value) AS value, bill_payment.bill_code_id
  //       FROM bill_payment
  //       WHERE bill_payment.bill_code_id IN (${ids.join(",")})
  //       GROUP BY bill_code_id
  //     ) AS p
  //     ON bill_code.id = p.bill_code_id
  //     AND bill_code.is_delete = 0
  //     AND bill_code.id IN (${ids.join(",")})
  //     ORDER BY bill_code.date DESC
  //   `);
  // }

  // /**
  //  * Fetch receivables
  //  * @returns
  //  */
  // static fetchReceivables() {
  //   return prisma.$queryRawUnsafe(`
  //     SELECT SUM(COALESCE(b.value, 0) - bill_code.discount + bill_code.delivery + bill_code.service - COALESCE(p.value, 0)) AS value,
  //     bill_code.customer_id,
  //     COALESCE(customer.name, 'Retail customer') AS customer_name
  //     FROM bill_code
  //     LEFT JOIN customer ON bill_code.customer_id = customer.id
  //     LEFT JOIN (
  //       SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //       FROM bill
  //       GROUP BY bill.bill_code_id
  //     ) AS b
  //     ON bill_code.id = b.bill_code_id
  //     LEFT JOIN (
  //       SELECT SUM(bill_payment.value) AS value, bill_payment.bill_code_id
  //         FROM bill_payment
  //         GROUP BY bill_code_id
  //     ) AS p
  //     ON bill_code.id = p.bill_code_id
  //     WHERE bill_code.is_confirm = 1
  //     AND bill_code.is_delete = 0
  //     AND bill_code.is_paid = 0
  //     GROUP BY bill_code.customer_id
  //     ORDER BY value DESC
  //   `);
  // }

  // // Fetch bill code ID by customerID
  // static fetchBillIDByCustomerID(customer_id: number) {
  //   if (customer_id == 0) {
  //     return prisma.bill_code.findMany({
  //       where: {
  //         is_confirm: true,
  //         is_delete: false,
  //         is_paid: false,
  //         customer_id: null,
  //       },
  //       select: {
  //         id: true,
  //       },
  //     });
  //   } else {
  //     return prisma.bill_code.findMany({
  //       where: {
  //         is_confirm: true,
  //         is_delete: false,
  //         is_paid: false,
  //         customer_id: customer_id,
  //       },
  //       select: {
  //         id: true,
  //       },
  //     });
  //   }
  // }

  // static fetchBillIDByCustomerIDV2(customerID: number, page: number) {
  //   return prisma.$transaction([
  //     prisma.bill_code.findMany({
  //       where: {
  //         is_confirm: true,
  //         is_delete: false,
  //         is_paid: false,
  //         customer_id: customerID == 0 ? null : customerID,
  //       },
  //       select: {
  //         id: true,
  //       },
  //       take: 10,
  //       skip: (page - 1) * 10,
  //     }),
  //     prisma.bill_code.count({
  //       where: {
  //         is_confirm: true,
  //         is_delete: false,
  //         is_paid: false,
  //         customer_id: customerID == 0 ? null : customerID,
  //       },
  //     }),
  //   ]);
  // }

  // static fetchReceivableByCustomerID(customer_id: number) {
  //   if (customer_id == 0) {
  //     return prisma.$queryRawUnsafe(
  //       `
  //         SELECT bill_code.id, bill_code.payment_term, (COALESCE(b.value, 0) - bill_code.discount + bill_code.delivery + bill_code.service) AS value,
  //         COALESCE(p.value, 0) AS payment,
  //         bill_code.customer_id, bill_code.name, bill_code.date
  //         FROM bill_code
  //         JOIN (
  //           SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //         ) AS b
  //         ON bill_code.id = b.bill_code_id
  //         LEFT JOIN (
  //           SELECT SUM(bill_payment.value) AS value, bill_payment.bill_code_id
  //           FROM bill_payment
  //           GROUP BY bill_code_id
  //         ) AS p
  //         ON bill_code.id = p.bill_code_id
  //         WHERE bill_code.is_confirm = 1
  //         AND bill_code.customer_id IS NULL
  //         AND bill_code.is_paid = 0
  //         ORDER BY bill_code.date DESC`
  //     );
  //   } else {
  //     return prisma.$queryRawUnsafe(
  //       `
  //         SELECT bill_code.id, bill_code.payment_term, (COALESCE(b.value, 0) - bill_code.discount + bill_code.delivery + bill_code.service) AS value,
  //         COALESCE(p.value, 0) AS payment,
  //         bill_code.customer_id, bill_code.name, bill_code.date
  //         FROM bill_code
  //         JOIN (
  //           SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //           FROM bill
  //           GROUP BY bill.bill_code_id
  //         ) AS b
  //         ON bill_code.id = b.bill_code_id
  //         LEFT JOIN (
  //           SELECT SUM(bill_payment.value) AS value, bill_payment.bill_code_id
  //           FROM bill_payment
  //           GROUP BY bill_code_id
  //         ) AS p
  //         ON bill_code.id = p.bill_code_id
  //         WHERE bill_code.is_confirm = 1
  //         AND bill_code.customer_id = ${customer_id}
  //         AND bill_code.is_delete = 0
  //         AND bill_code.is_paid = 0
  //         ORDER BY bill_code.date DESC`
  //     );
  //   }
  // }

  // static fetchGeneralByIDs(ids: number[]) {
  //   if (ids.length == 0) return Promise.resolve([]);

  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT bill_code.id, bill_code.name, bill_code.date, COALESCE(customer.name, "Retail customer") AS opponent
  //     FROM bill_code
  //     LEFT JOIN customer ON bill_code.customer_id =customer.id
  //     WHERE bill_code.id IN (${ids.join(",")})
  //   `);
  // }

  // static fetchPaymentsByID(id: number) {
  //   return prisma.bill_payment.findMany({
  //     where: {
  //       bill_code_id: id,
  //     },
  //     select: {
  //       id: true,
  //       value: true,
  //       payment_method: {
  //         select: {
  //           name: true,
  //           description: true,
  //         },
  //       },
  //       payment_method_id: true,
  //       date: true,
  //     },
  //   });
  // }

  // static deletePaymentByID(id: number) {
  //   return prisma.bill_payment.delete({
  //     where: {
  //       id: id,
  //     },
  //     select: {
  //       bill_code_id: true,
  //     },
  //   });
  // }

  // /**
  //  * Calculates the total receivables for all confirmed, non-deleted, and unpaid bill codes.
  //  * @returns {Promise<any[]>} An array containing a single object with a 'value' property representing the total receivables.
  //  */
  // static calculateReceivables() {
  //   return prisma.$queryRawUnsafe<any[]>(`
  //     SELECT SUM(COALESCE(b.value) + bill_code.delivery - bill_code.discount + bill_code.service - COALESCE(pm.value, 0)) AS value
  //     FROM bill_code
  //     LEFT JOIN (
  //       SELECT SUM(bill.quantity * (bill.price - bill.discount)) AS value, bill.bill_code_id
  //       FROM bill
  //       GROUP BY bill.bill_code_id
  //     ) AS b
  //     ON bill_code.id = b.bill_code_id
  //     LEFT JOIN (
  //       SELECT SUM(bill_payment.value) AS value, bill_payment.bill_code_id
  //       FROM bill_payment
  //       GROUP BY bill_code_id
  //     ) AS pm
  //     ON bill_code.id = pm.bill_code_id
  //     WHERE bill_code.is_confirm = 1
  //     AND bill_code.is_delete = 0
  //     AND bill_code.is_paid = 0
  //   `);
  // }

  // static evaluateBill(id: number) {
  //   return prisma.bill_code.update({
  //     where: {
  //       id: id,
  //     },
  //     data: {},
  //   });
  // }
}

export class SalesInvoiceItemModel {
  id?: number;
  product_id: number;
  product_unit_id: number | null;
  quantity: number;
  price: number;
  discount: number;
  product?: ProductModel;
  product_unit?: ProductUnitModel | null;

  constructor(data: ISalesInvoice) {
    this.id = data.id;
    this.product_id = data.product_id;
    this.product_unit_id = data.product_unit_id;
    this.quantity = data.quantity;
    this.price = data.price;
    this.discount = data.discount;

    this.product = data.product;
    this.product_unit = data.product_unit;
  }

  static fromMap(data: any) {
    const result = new SalesInvoiceItemModel({
      id: data.id,
      product_id: data.product_id,
      product_unit_id: data.product_unit_id,
      quantity: Number(data.quantity),
      price: Number(data.price),
      discount: Number(data.discount),
      product:
        data.product == undefined
          ? undefined
          : ProductModel.fromMap(data.product),
      product_unit:
        data.product_unit == null
          ? null
          : data.product_unit == undefined
          ? undefined
          : ProductUnitModel.fromMap(data.product_unit),
    });

    console.log(result.product_unit);
    return result;
  }
}
