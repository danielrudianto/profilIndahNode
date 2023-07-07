import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class DistributionStockModel {
  static async truncateDistributionStockTable() {
    await prisma.$queryRawUnsafe("TRUNCATE TABLE distribution_stock");
  }

  static async fillDistributionStockTable() {
    await prisma.stock_out_distribution.findMany({}).then(async (result) => {
      await prisma.distribution_stock.createMany({
        data: result,
      });
    });
  }

  static download() {
    return prisma.$queryRawUnsafe<any[]>(`
      SELECT item.reference, item.description, item.unit, item_brand_id, item_brand.name AS item_brand_name, item_type.name AS item_type_name, (COALESCE(valueIn.quantity, 0) - COALESCE(valueOut.quantity, 0)) AS quantity, (COALESCE(valueIn.value, 0) - COALESCE(valueOut.value, 0)) AS value
      FROM item
      JOIN item_brand ON item.item_brand_id = item_brand.id
      JOIN item_type ON item.item_type_id = item_type.id
      LEFT JOIN (
        select sum(distribution_stock.quantity * value) AS value, SUM(distribution_stock.quantity) AS quantity, distribution_stock.item_id
          FROM distribution_stock
          GROUP BY distribution_stock.item_id
      ) AS valueOut
      ON item.id = valueOut.item_id
      LEFT JOIN (
        select sum(stock_in.quantity * value) AS value, SUM(stock_in.quantity) AS quantity, stock_in.item_id
          FROM stock_in
          GROUP BY stock_in.item_id
      ) AS valueIn
      ON item.id = valueIn.item_id
      WHERE item.is_delete = 0
      ORDER BY item_brand_id, reference ASC
    `);
  }
}

export default DistributionStockModel;
