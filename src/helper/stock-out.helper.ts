import { StockInModel } from "../model/stock-in.model";
import { IStockoutModel, StockOutModel } from "../model/stock-out.model";

class StockOutHelper {
  //   static calculateStockOut() {
  //     StockOutModel.fetchUnassignedStockOuts().then((result) => {
  //       for (let i = 0; i < result.length; i++) {
  //         const item_id = result[i].item_id;
  //         let quantity = Number(result[i].quantity);
  //         while (quantity > 0) {
  //           if (quantity <= 0) break;
  //           StockInModel.fetchByItemID(item_id).then(async (stockIn) => {
  //             if (!stockIn) {
  //               console.error(`No stock in found for item ID ${item_id}`);
  //               return;
  //             } else {
  //               const residue = Number(stockIn.residue);
  //               if (residue > quantity) {
  //                 // update the residue in stock_in to residue - quantity
  //                 await StockInModel.updateQuantity(
  //                   stockIn.id,
  //                   residue - quantity
  //                 );
  //                 quantity = 0; // all quantity is consumed
  //               } else {
  //                 // update the residue in stock_in to 0
  //                 await StockInModel.updateQuantity(stockIn.id, 0);
  //                 // update the stock out, add stock_in_id
  //                 await StockOutModel.assignStockInID(result[i].id, stockIn.id);
  //                 quantity -= residue; // reduce the quantity by the residue
  //               }
  //             }
  //           });
  //         }
  //       }
  //     });
  //   }
}

export default StockOutHelper;
