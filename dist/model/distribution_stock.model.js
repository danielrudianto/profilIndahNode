"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DistributionStockModel {
    static truncateDistributionStockTable() {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.$queryRawUnsafe("TRUNCATE TABLE distribution_stock");
        });
    }
    static fillDistributionStockTable() {
        return __awaiter(this, void 0, void 0, function* () {
            yield prisma.stock_out_distribution.findMany({}).then((result) => __awaiter(this, void 0, void 0, function* () {
                yield prisma.distribution_stock.createMany({
                    data: result,
                });
            }));
        });
    }
    static download() {
        return prisma.$queryRawUnsafe(`
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
        select sum(stock_in.quantity * COALESCE(item_unit.conversion, 1) * value) AS value, SUM(stock_in.quantity  * COALESCE(item_unit.conversion, 1)) AS quantity, stock_in.item_id
          FROM stock_in
          LEFT JOIN item_unit
          ON stock_in.item_unit_id = item_unit.id
          GROUP BY stock_in.item_id
      ) AS valueIn
      ON item.id = valueIn.item_id
      WHERE item.is_delete = 0
      ORDER BY item_brand_id, reference ASC
    `);
    }
}
exports.default = DistributionStockModel;
