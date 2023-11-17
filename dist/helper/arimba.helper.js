"use strict";
const ARIMA = require("arima");
class ArimaHelper {
    // Calculate the minimum and maximum stock using ARIMA
    // https://www.npmjs.com/package/arima
    // https://www.npmjs.com/package/arima#arimaforecast
    predict(stockCard) {
        const arima = new ARIMA({
            auto: false,
            p: 1,
            d: 1,
            q: 1,
            transpose: true,
            verbose: true,
        });
        const data = stockCard.map((item) => item.output);
        arima.setOrder(1, 1, 1);
        arima.setMode("forecast");
        arima.setMethod("MLE");
        arima.setSeasonalOrder(0, 0, 0, 0);
        arima.setParams({
            method: "BFGS",
            maxiter: 100,
            epsilon: 1e-8,
            length: 100,
            order: 1,
            verbose: true,
        });
        arima.fit(data);
        const forecast = arima.forecast(1);
        return forecast;
    }
}
//# sourceMappingURL=arimba.helper.js.map