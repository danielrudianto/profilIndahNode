"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_helper_1 = require("../helper/database.helper");
class BillModel {
    /**
     * Fetch bill based on ID array
     * To check if bill is already returned
     * @param ids
     * @returns
     */
    static fetchByIDs(ids) {
        // Need to calculate previously returned quantity
        return database_helper_1.prisma.$queryRawUnsafe(`
      SELECT bill.id, bill_code_id, bill.quantity, 
      COALESCE(salesReturn.return_quantity, 0) AS return_quantity
      FROM bill
      LEFT JOIN (
        SELECT bill_id, SUM(quantity) AS return_quantity
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        WHERE sales_return_code.is_confirm = 1
        AND sales_return_code.is_delete = 0
        GROUP BY bill_id
      ) salesReturn
      ON bill.id = salesReturn.bill_id
      WHERE bill.id IN (${ids.join(",")})
    `);
    }
}
exports.default = BillModel;
//# sourceMappingURL=bill.model.js.map