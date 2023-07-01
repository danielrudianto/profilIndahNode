import { schedule } from "node-cron";
import { meili } from "../app";
import { ItemModel } from "../model/item.model";

class SearchHelper {
  static scheduleData = async () => {
    await meili.index("item").deleteAllDocuments();
    await meili.index("item").updateSettings({
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
    ItemModel.fetchAll(new Date())
      .then(async (items) => {
        await meili.index("item").addDocumentsInBatches(
          items.map((x) => {
            return {
              id: x.id,
              reference: x.reference,
              description: x.description,
              brand: x.item_brand.name,
            };
          })
        );
      })
      .catch((error) => {
        console.log(error);
      });

    schedule("0 */6 * * *", () => {
      meili.index("item").deleteAllDocuments();
      ItemModel.fetchAll(new Date())
        .then((items) => {
          meili.index("item").addDocumentsInBatches(
            items.map((x) => {
              return {
                id: x.id,
                reference: x.reference,
                description: x.description,
                brand: x.item_brand.name,
              };
            })
          );
        })
        .catch((error) => {
          console.log(error);
        });
    });
  };
}

export default SearchHelper;
