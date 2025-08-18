import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime";
import { IStockCard, StockCardModel } from "../model/stock-card.model";

export class StockCardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  create(data: IStockCard) {
    this.prisma.stock_card.create({
      data: {
        date: data.date,
        product_id: data.product_id,
        product_unit_id: data.product_unit_id,
        display_quantity: data.display_quantity,
        quantity: data.quantity,
        document_name: data.document_name,
        supplier_id: data.supplier_id,
        customer_id: data.customer_id,
        sales_invoice_id: data.sales_invoice_id,
        sales_invoice_code_id: data.sales_invoice_code_id,
        adjustment_case_id: data.adjustment_case_id,
        adjustment_case_code_id: data.adjustment_case_code_id,
        good_receipt_id: data.good_receipt_id,
        good_receipt_code_id: data.good_receipt_code_id,
        sales_return_id: data.sales_return_id,
        sales_return_code_id: data.sales_return_code_id,
        stock: null,
        created_at: data.created_at,
      },
    });
  }

  createMany(data: IStockCard[]) {
    return this.prisma.$transaction(
      data.map((x) => {
        return this.prisma.stock_card.create({
          data: {
            date: x.date,
            product_id: x.product_id,
            product_unit_id: x.product_unit_id,
            display_quantity: x.display_quantity,
            quantity: x.quantity,
            document_name: x.document_name,
            supplier_id: x.supplier_id,
            customer_id: x.customer_id,
            sales_invoice_id: x.sales_invoice_id,
            sales_invoice_code_id: x.sales_invoice_code_id,
            adjustment_case_id: x.adjustment_case_id,
            adjustment_case_code_id: x.adjustment_case_code_id,
            good_receipt_id: x.good_receipt_id,
            good_receipt_code_id: x.good_receipt_code_id,
            sales_return_id: x.sales_return_id,
            sales_return_code_id: x.sales_return_code_id,
            stock: null,
            created_at: x.created_at,
          },
        });
      })
    );
  }

  async fetchByID(id: number) {
    const result = await this.prisma.stock_card.findUnique({
      where: {
        id: id,
      },
    });

    if (!result) {
      return null;
    }

    return StockCardModel.fromMap(result);
  }

  async fetchMutation(data: {
    productID: number;
    date: Date;
    viewBy: "date" | "created";
  }) {
    try {
      if (data.viewBy === "date") {
        const previous = await this.prisma.stock_card.findFirst({
          where: {
            date: {
              lt: data.date,
            },
          },
          orderBy: [
            {
              date: "desc",
            },
            {
              id: "desc",
            },
          ],
        });

        const current = await this.prisma.stock_card.findMany({
          where: {
            date: data.date,
          },
          orderBy: [
            {
              id: "desc",
            },
          ],
          include: {
            customer: true,
            supplier: true,
            product_unit: true,
          },
        });

        return {
          data: current.map((x) => {
            return StockCardModel.fromMap(x);
          }),
          previous: previous == null ? 0 : previous.stock,
        };
      } else if (data.viewBy === "created") {
        const previous = await this.prisma.stock_card.findFirst({
          where: {
            AND: [
              {
                created_at: {
                  lt: new Date(
                    data.date.getFullYear(),
                    data.date.getMonth(),
                    data.date.getDate() + 1
                  ),
                },
              },
              {
                created_at: {
                  gte: new Date(
                    data.date.getFullYear(),
                    data.date.getMonth(),
                    data.date.getDate()
                  ),
                },
              },
            ],
          },
          orderBy: [
            {
              created_at: "desc",
            },
            {
              id: "desc",
            },
          ],
        });

        const current = await this.prisma.stock_card.findMany({
          where: {
            AND: [
              {
                created_at: {
                  lt: new Date(
                    data.date.getFullYear(),
                    data.date.getMonth(),
                    data.date.getDate() + 1
                  ),
                },
              },
              {
                created_at: {
                  gte: new Date(
                    data.date.getFullYear(),
                    data.date.getMonth(),
                    data.date.getDate()
                  ),
                },
              },
            ],
          },
          orderBy: [
            {
              id: "desc",
            },
          ],
          include: {
            customer: true,
            supplier: true,
            product_unit: true,
          },
        });

        return {
          data: current.map((x) => {
            return StockCardModel.fromMap(x);
          }),
          previous: previous == null ? 0 : previous.stock,
        };
      }
    } catch (error) {
      throw error;
    }
  }

  async fetchPrevious(data: { product_id: number; date: Date; id: number }) {
    const result = await this.prisma.stock_card.findFirst({
      where: {
        product_id: data.product_id,
        stock: { not: null },
        OR: [
          { date: { lt: data.date } },
          { AND: [{ date: data.date }, { id: { lt: data.id } }] },
        ],
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    return result == null ? null : StockCardModel.fromMap(result);
  }

  async fetch(data: {
    sales_invoice_id: number | null;
    sales_invoice_code_id: number | null;
    good_receipt_id: number | null;
    good_receipt_code_id: number | null;
    adjustment_case_id: number | null;
    adjustment_case_code_id: number | null;
    sales_return_id: number | null;
    sales_return_code_id: number | null;
  }) {
    const entry = await this.prisma.stock_card.findFirst({
      where: {
        sales_invoice_id: data.sales_invoice_id,
        sales_invoice_code_id: data.sales_invoice_code_id,
        adjustment_case_id: data.adjustment_case_id,
        adjustment_case_code_id: data.adjustment_case_code_id,
        good_receipt_id: data.good_receipt_id,
        good_receipt_code_id: data.good_receipt_code_id,
        sales_return_id: data.sales_return_id,
        sales_return_code_id: data.sales_return_code_id,
      },
    });

    if (!entry) {
      return null;
    }

    return StockCardModel.fromMap(entry);
  }

  async fetchByProductID(data: {
    productID: number;
    page: number;
    pageSize: number;
  }) {
    const [result, count] = await this.prisma.$transaction([
      this.prisma.stock_card.findMany({
        where: {
          product_id: data.productID,
        },
        orderBy: [
          {
            date: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
      }),
      this.prisma.stock_card.count({
        where: {
          product_id: data.productID,
        },
      }),
    ]);

    return {
      data: result.map((x) => {
        return StockCardModel.fromMap(x);
      }),
      count: count,
    };
  }

  async reorderSince(data: {
    product_id: number;
    id: number;
    date: Date;
    initial_stock: number;
  }) {
    const unupdatedStockCards = await this.prisma.stock_card.findMany({
      where: {
        product_id: data.product_id,
        OR: [
          { date: { gt: data.date } },
          { AND: [{ date: data.date }, { id: { gte: data.id } }] },
        ],
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
    });

    let initial_stock = data.initial_stock;
    for (let i = 0; i < unupdatedStockCards.length; i++) {
      const id = unupdatedStockCards[i].id;
      const quantity = Number(unupdatedStockCards[i].quantity);
      const final_quantity = initial_stock + quantity;
      const result = await this.prisma.stock_card.update({
        where: {
          id: id,
        },
        data: {
          stock: final_quantity,
        },
      });

      initial_stock += quantity;
    }
  }

  async delete(id: number) {
    try {
      const result = await this.prisma.stock_card.delete({
        where: {
          id: id,
        },
      });

      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteMany(
    data: {
      sales_invoice_id: number | null;
      sales_invoice_code_id: number | null;
      adjustment_case_id: number | null;
      adjustment_case_code_id: number | null;
      good_receipt_id: number | null;
      good_receipt_code_id: number | null;
      sales_return_id: number | null;
      sales_return_code_id: number | null;
    }[]
  ) {
    try {
      const deleteQuery = data.map((x) => {
        return this.prisma.stock_card.deleteMany({
          where: {
            sales_invoice_id: x.sales_invoice_id,
            sales_invoice_code_id: x.sales_invoice_code_id,
            adjustment_case_id: x.adjustment_case_id,
            adjustment_case_code_id: x.adjustment_case_code_id,
            good_receipt_id: x.good_receipt_id,
            good_receipt_code_id: x.good_receipt_code_id,
            sales_return_id: x.sales_return_id,
            sales_return_code_id: x.sales_return_code_id,
          },
        });
      });

      const result = await this.prisma.$transaction(deleteQuery);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async startup() {
    const result = await this.prisma.$queryRaw`
      INSERT INTO stock_card (product_id, product_unit_id, quantity, display_quantity, date, customer_id, supplier_id, document_name, sales_invoice_id, sales_invoice_code_id, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id, sales_return_id, sales_return_code_id, stock, created_at)
      (
        SELECT * FROM (
        SELECT good_receipt.product_id, good_receipt.product_unit_id, good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, good_receipt.quantity AS display_quantity,
        good_receipt_code.date, NULL as customer_id, good_receipt_code.supplier_id, good_receipt_code.name AS document_name, NULL AS sales_invoice_id, NULL AS sales_invoice_code_id,
        NULL as adjustment_case_id, NULL AS adjustment_case_code_id, good_receipt.id AS good_receipt_id, good_receipt_code.id AS good_receipt_code_id, NULL AS sales_return_id, NULL AS sales_return_code_id, NULL AS stock,
        good_receipt_code.created_at
        FROM good_receipt
        JOIN product ON good_receipt.product_id = product.id
        LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          WHERE good_receipt_code.is_delete = 0
          
        UNION ALL
        SELECT adjustment_case.product_id, adjustment_case.product_unit_id, adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, adjustment_case.quantity AS display_quantity,
        adjustment_case_code.date, NULL as customer_id, NULL AS supplier_id, adjustment_case_code.name AS document_name, NULL AS sales_invoice_id, NULL AS sales_invoice_code_id,
        adjustment_case.id as adjustment_case_id, adjustment_case_code.id AS adjustment_case_code_id, NULL AS good_receipt_id, NULL AS good_receipt_code_id, NULL AS sales_return_id, NULL AS sales_return_code_id, NULL AS stock,
        adjustment_case_code.created_at
        FROM adjustment_case
        JOIN product ON adjustment_case.product_id = product.id
        LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
          WHERE adjustment_case_code.is_delete = 0
          
        UNION ALL
        SELECT sales_invoice.product_id, sales_invoice.product_unit_id, -1 * sales_invoice.quantity * IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, sales_invoice.quantity * -1 AS display_quantity,
        sales_invoice_code.date, sales_invoice_code.customer_id as customer_id, NULL AS supplier_id, sales_invoice_code.name AS document_name, sales_invoice.id AS sales_invoice_id, sales_invoice.sales_invoice_code_id AS sales_invoice_code_id,
        NULL as adjustment_case_id, NULL AS adjustment_case_code_id, NULL AS good_receipt_id, NULL AS good_receipt_code_id, NULL AS sales_return_id, NULL AS sales_return_code_id, NULL AS stock,
        sales_invoice_code.created_at
        FROM sales_invoice
        JOIN product ON sales_invoice.product_id = product.id
        LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        UNION ALL
        SELECT sales_invoice.product_id, sales_invoice.product_unit_id, sales_return.quantity * IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, sales_return.quantity AS display_quantity,
        sales_return_code.date, sales_invoice_code.customer_id as customer_id, NULL AS supplier_id, sales_return_code.name AS document_name, sales_invoice.id AS sales_invoice_id, sales_invoice_code.id AS sales_invoice_code_id,
        NULL as adjustment_case_id, NULL AS adjustment_case_code_id, NULL AS good_receipt_id, NULL AS good_receipt_code_id, sales_return.id AS sales_return_id, sales_return_code.id AS sales_return_code_id, NULL AS stock,
        sales_return_code.created_at
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        JOIN sales_invoice ON sales_return.sales_invoice_id = sales_invoice.id
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        JOIN product ON sales_invoice.product_id = product.id
        LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
          WHERE sales_return_code.is_delete = 0
        ) AS a
        ORDER BY product_id ASC, date ASC
      )
    `;

    return result;
  }

  async reorder() {
    try {
      const productIDs = await this.prisma.stock_card.findMany({
        distinct: ["product_id"],
        where: {
          stock: null,
        },
      });

      console.info(
        `[info]: Found ${productIDs.length} products that needs to be reorder`
      );

      for (let i = 0; i < productIDs.length; i++) {
        console.info(
          `[info]: Start reordering ${i + 1}/${
            productIDs.length
          } product stock card`
        );
        const product_id = productIDs[i].product_id;

        const stockCards = await this.prisma.stock_card.findMany({
          where: {
            product_id: product_id,
          },
          orderBy: [
            {
              date: "asc",
            },
            {
              id: "asc",
            },
          ],
        });

        let initialQuantity = 0;
        const updateQuery = [];

        for (let j = 0; j < stockCards.length; j++) {
          initialQuantity += Number(stockCards[j].quantity);
          updateQuery.push(
            this.prisma.stock_card.update({
              where: {
                id: stockCards[j].id,
              },
              data: {
                stock: initialQuantity,
              },
            })
          );
        }

        await this.prisma.$transaction(updateQuery);

        console.info(
          `[info]: Done reordering ${i + 1}/${
            productIDs.length
          } product stock card`
        );
      }

      console.info(`[info]: Reordering completed`);
    } catch (error) {
      throw error;
    }
  }

  async checkExistingByProductID(productID: number) {
    try {
      const stock = await this.prisma.stock_card.count({
        where: {
          product_id: productID,
        },
      });

      return stock > 0;
    } catch (error) {
      throw error;
    }
  }
}
