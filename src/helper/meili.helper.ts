import MeiliSearch from "meilisearch";
import dotenv from "dotenv";
import { ProductRepository } from "../repositories/product.repository";
import { prisma } from "./database.helper";
dotenv.config(); // Load environment variables from .env file

console.log(process.env.MEILISEARCH_MASTER_KEY);

export const meili = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: process.env.MEILISEARCH_MASTER_KEY!,
});

const INDEX_UID = "product"; // Change this to your desired index UID
const CUSTOMER_INDEX_UID = "customer"; // Example for another index, if needed

// const productRepository = new ProductRepository(prisma);

export const initializeMeiliSearch = async () => {
  if (!process.env.MEILISEARCH_MASTER_KEY) {
    console.warn(
      "MEILISEARCH_MASTER_KEY is not set. MeiliSearch operations requiring an API key might fail."
    );
    // Depending on your app's needs, you might want to throw an error here
    // if the API key is absolutely essential for startup.
  }
  console.log("Starting MeiliSearch setup...");
  try {
    // 1. Check if the index exists
    // Getting an index that doesn't exist throws an error, which we can catch.
    try {
      await meili.getIndex(INDEX_UID);
      console.log(`Index "${INDEX_UID}" already exists.`);
    } catch (error: any) {
      if (error.code === "index_not_found") {
        console.log(`Index "${INDEX_UID}" not found. Creating index...`);
        // 2. Create the index if it doesn't exist
        // You can specify a primary key during creation if you know it.
        // Common primary key is 'id'.
        const task = await meili.createIndex(INDEX_UID, { primaryKey: "id" });
        await meili.waitForTask(task.taskUid); // Wait for the task to complete
        console.log(`Index "${INDEX_UID}" created successfully.`);

        // 3. Optional: Set up initial settings like filterable/sortable attributes
        // This is a good place to ensure your index has basic settings.
        console.log(
          `Setting up initial attributes for index "${INDEX_UID}"...`
        );
        const settingsTask = await meili.index(INDEX_UID).updateSettings({
          filterableAttributes: [
            "product_brand_id",
            "product_type_id",
            "is_active" /* add other common filters */,
          ],
          sortableAttributes: [
            "created_at",
            "reference",
            "description" /* add other common sort fields */,
          ],
          // Add other settings like rankingRules, searchableAttributes if needed
        });
        await meili.waitForTask(settingsTask.taskUid);
        console.log(
          `Initial attributes for index "${INDEX_UID}" have been set.`
        );
      } else {
        // Different error, re-throw or handle
        throw error;
      }
    }

    try {
      await meili.getIndex(CUSTOMER_INDEX_UID);
      console.log(`Index "${CUSTOMER_INDEX_UID}" already exists.`);
    } catch (error: any) {
      if (error.code === "index_not_found") {
        console.log(
          `Index "${CUSTOMER_INDEX_UID}" not found. Creating index...`
        );
        const task = await meili.createIndex(CUSTOMER_INDEX_UID, {
          primaryKey: "id",
        });
        await meili.waitForTask(task.taskUid);
        console.log(`Index "${CUSTOMER_INDEX_UID}" created successfully.`);

        // Set up initial settings for the customer index
        console.log(
          `Setting up initial attributes for index "${CUSTOMER_INDEX_UID}"...`
        );

        console.log(
          `Initial attributes for index "${CUSTOMER_INDEX_UID}" have been set.`
        );
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("Error during MeiliSearch initialization:", error);
    // Depending on how critical MeiliSearch is, you might want to:
    // - Log the error and continue
    // - Exit the application: process.exit(1);
  }
};

initializeMeiliSearch();
