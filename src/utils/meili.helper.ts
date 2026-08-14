import MeiliSearch from "meilisearch";
import dotenv from "dotenv";
dotenv.config(); // Load environment variables from .env file

export const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_MASTER_KEY!,
});

const INDEX_UID = "product"; // Change this to your desired index UID

export const initializeMeiliSearch = async () => {
  if (!process.env.MEILISEARCH_MASTER_KEY) {
    console.warn(
      "MEILISEARCH_MASTER_KEY is not set. MeiliSearch operations requiring an API key might fail."
    );
    // Depending on your app's needs, you might want to throw an error here
    // if the API key is absolutely essential for startup.
  }
  console.info("Starting MeiliSearch setup...");
  try {
    const product = await meili.getIndex("product");
    console.info("Product database already exists.");
  } catch (error: any) {
    if (error.code === "index_not_found") {
      console.info("Product index does not exist, creating it...");

      const createProduct = await meili.createIndex("product", {
        primaryKey: "id",
      });

      await meili.waitForTask(createProduct.taskUid);
      const productSettingTask = await meili.index("product").updateSettings({
        filterableAttributes: [
          "product_brand_id",
          "product_type_id",
          "is_active",
          "is_delete",
        ],
        sortableAttributes: ["created_at", "reference", "description"],
      });
      await meili.waitForTask(productSettingTask.taskUid);
      console.info("Product database initialized");
    } else {
      console.error(`[error]: Error initializing product index: ${error}`);
      throw error;
    }
  }

  try {
    const productPackage = await meili.getIndex("package");
    console.info("Package database already exists.");
  } catch (error: any) {
    if (error.code === "index_not_found") {
      console.info("Package index does not exist, creating it...");

      const createProductPackage = await meili.createIndex("package", {
        primaryKey: "id",
      });

      await meili.waitForTask(createProductPackage.taskUid);
      const productPackageSettingTask = await meili
        .index("package")
        .updateSettings({
          filterableAttributes: ["is_delete"],
          sortableAttributes: ["name", "description"],
        });
      await meili.waitForTask(productPackageSettingTask.taskUid);
      console.info("Package database initialized");
    } else {
      console.error(`[error]: Error initializing package index: ${error}`);
      throw error;
    }
  }
};

initializeMeiliSearch();
