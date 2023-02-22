import { schedule } from "node-cron";
import { meili } from "../app";
import { ItemModel } from "../model/item.model";

class SearchHelper {
  static scheduleData = () => {
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
