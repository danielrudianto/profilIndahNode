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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = require("node-cron");
const app_1 = require("../app");
const item_model_1 = require("../model/item.model");
class SearchHelper {
}
_a = SearchHelper;
SearchHelper.scheduleData = () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("[info]: Indexing search data.");
    yield app_1.meili.index("item").deleteAllDocuments();
    yield app_1.meili.index("item").updateSettings({
        searchableAttributes: ["reference", "description"],
        rankingRules: ["words", "typo", "proximity", "attribute", "exactness"],
        distinctAttribute: "reference",
        synonyms: {
            "rel fe": ["Rel full extension"],
            shelf: ["rak"],
            knob: ["handle", "knop"],
            doble: ["double"],
            bracket: ["breket"],
            profile: ["profil"],
            hinge: ["engsel"],
            hing: ["engsel"],
            lis: ["list"],
            "lubang angin": ["lubang udara", "lubang hawa"],
            tacosheet: ["sheet"],
        },
        typoTolerance: {
            enabled: true,
            minWordSizeForTypos: {
                oneTypo: 4,
                twoTypos: 8,
            },
            disableOnAttributes: ["reference"],
        },
        pagination: {
            maxTotalHits: 50,
        },
    });
    item_model_1.ItemModel.fetchAll(new Date())
        .then((items) => __awaiter(void 0, void 0, void 0, function* () {
        yield app_1.meili.index("item").addDocumentsInBatches(items.map((x) => {
            return {
                id: x.id,
                reference: x.reference,
                description: x.description,
                brand: x.item_brand.name,
            };
        }));
        console.log("[info]: Indexing search data completed.");
    }))
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
});
exports.default = SearchHelper;
