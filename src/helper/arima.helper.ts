import { mongoProductModel } from "../mongo-model/mongo-product.model";

const ARIMA = require("arima");

interface IArima {
  month: number;
  year: number;
  output: number;
}

export class ArimaHelper {
  // Calculate the minimum and maximum stock using ARIMA
  // https://www.npmjs.com/package/arima
  // https://www.npmjs.com/package/arima#arimaforecast
  static async predict() {
    const products = await mongoProductModel.aggregate([
      { $unwind: "$stockCard" },
      // Match records with billID and quantity < 0
      {
        $match: {
          "stockCard.billID": { $exists: true },
          "stockCard.adjustmentCaseID": { $eq: null },
          "stockCard.quantity": { $lt: 0 },
          "stockCard.date": { $gte: new Date("2023-01-01T00:00:00.000Z") },
        },
      },
      // Project the necessary fields
      {
        $project: {
          itemID: "$itemID",
          monthsSinceStart: {
            $subtract: [
              { $month: "$stockCard.date" },
              { $month: new Date("2023-01-01T00:00:00.000Z") },
            ],
          },
          quantity: "$stockCard.quantity",
        },
      },
      // Match to exclude the current month's result
      { $match: { monthsSinceStart: { $ne: new Date().getMonth() } } },
      // Group by itemID and monthsSinceStart and calculate the total quantity
      {
        $group: {
          _id: { itemID: "$itemID", monthsSinceStart: "$monthsSinceStart" },
          totalQuantity: { $sum: "$quantity" },
        },
      },
      // Project to reshape the output
      {
        $project: {
          _id: 0,
          itemID: "$_id.itemID",
          monthDistance: "$_id.monthsSinceStart",
          totalQuantity: 1,
        },
      },
      // Sort by itemID and monthDistance
      { $sort: { itemID: 1, monthDistance: 1 } },
      // Group again by itemID and push the results into an array
      {
        $group: {
          _id: "$itemID",
          monthlyOutputs: {
            $push: {
              monthDistance: "$monthDistance",
              totalQuantity: "$totalQuantity",
            },
          },
        },
      },
      // Project to reshape the final output
      {
        $project: {
          _id: 0,
          itemID: "$_id",
          monthlyOutputs: 1,
        },
      },
      // Sort by itemID
      { $sort: { itemID: 1 } },
    ]);

    // Determine the ARIMA parameters
    // Starting with the p parameter

    const arima = new ARIMA({
      auto: false,
      p: 1,
      d: 1,
      q: 1,
      transpose: true,
      verbose: false,
    });

    // Calculate the distance between this month and January 2023
    const monthDistance =
      (new Date().getFullYear() - 2023) * 12 + new Date().getMonth();

    for (let i = 0; i < 15; i++) {
      // First we need to fill the empty months with 0
      const product = products[i];
      const monthlyOutputs = product.monthlyOutputs;
      for (let j = 0; j < monthDistance; j++) {
        // Check if the monthDistance is already in the array
        const index = monthlyOutputs.findIndex(
          (monthlyOutput: any) => monthlyOutput.monthDistance === j
        );

        // If the monthDistance is not in the array, insert it
        if (index === -1) {
          monthlyOutputs.push({ monthDistance: j, totalQuantity: 0 });
        } else {
          monthlyOutputs[index].totalQuantity =
            -1 * monthlyOutputs[index].totalQuantity;
        }
      }

      // Sort the array by monthDistance
      monthlyOutputs.sort((a: any, b: any) => {
        return a.monthDistance - b.monthDistance;
      });

      // Make the monthlyOutpus array into a 1D array containing only the totalQuantity
      const monthlyOutputs1D = monthlyOutputs.map(
        (monthlyOutput: any) => monthlyOutput.totalQuantity
      );

      console.log(`[monthlyOutputs1D]: ${product.itemID} ${monthlyOutputs1D}`);

      // Calculate the minimum and maximum stock using ARIMA
      const arimaTrain = arima.train(monthlyOutputs1D);
      console.log(arimaTrain);

      const arimaResult = arimaTrain.predict(1);
      console.log(`[ARIMA]: ${product.itemID} ${arimaResult}`);

      // Insert the result into the database
      const arimaResultObject: IArima = {
        month: new Date().getMonth() + i + 1,
        year: new Date().getFullYear(),
        output: arimaResult[0],
      };

      console.log(
        `[calculated ARIMA]: ${product.itemID} ${arimaResultObject.output}`
      );
    }
  }
}
