"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = require("node-cron");
const app_1 = require("../app");
const item_model_1 = require("../model/item.model");
class SearchHelper {
}
SearchHelper.scheduleData = () => {
    app_1.meili.index("item").deleteAllDocuments();
    app_1.meili.index("item").updateSettings({
        filterableAttributes: ["brand"],
    });
    app_1.meili
        .index("item")
        .updateRankingRules([
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
    ]);
    item_model_1.ItemModel.fetchAll(new Date())
        .then((items) => {
        app_1.meili.index("item").addDocumentsInBatches(items.map((x) => {
            return {
                id: x.id,
                reference: x.reference,
                description: x.description,
                brand: x.item_brand.name,
            };
        }));
    })
        .catch((error) => {
        console.log(error);
    });
    (0, node_cron_1.schedule)("0 */6 * * *", () => {
        app_1.meili.index("item").deleteAllDocuments();
        item_model_1.ItemModel.fetchAll(new Date())
            .then((items) => {
            app_1.meili.index("item").addDocumentsInBatches(items.map((x) => {
                return {
                    id: x.id,
                    reference: x.reference,
                    description: x.description,
                    brand: x.item_brand.name,
                };
            }));
        })
            .catch((error) => {
            console.log(error);
        });
    });
};
exports.default = SearchHelper;
