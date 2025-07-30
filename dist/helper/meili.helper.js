"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeMeiliSearch = exports.meili = void 0;
const meilisearch_1 = __importDefault(require("meilisearch"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load environment variables from .env file
exports.meili = new meilisearch_1.default({
    host: "http://localhost:7700",
    apiKey: process.env.MEILISEARCH_MASTER_KEY,
});
const INDEX_UID = "product"; // Change this to your desired index UID
const initializeMeiliSearch = async () => {
    if (!process.env.MEILISEARCH_MASTER_KEY) {
        console.warn("MEILISEARCH_MASTER_KEY is not set. MeiliSearch operations requiring an API key might fail.");
        // Depending on your app's needs, you might want to throw an error here
        // if the API key is absolutely essential for startup.
    }
    console.log("Starting MeiliSearch setup...");
    try {
        const product = await exports.meili.getIndex("product");
        if (product) {
            console.info("Product database already exists.");
        }
        else {
            const createProduct = await exports.meili.createIndex("product", {
                primaryKey: "id",
            });
            await exports.meili.waitForTask(createProduct.taskUid);
            const productSettingTask = await exports.meili.index("product").updateSettings({
                filterableAttributes: [
                    "product_brand_id",
                    "product_type_id",
                    "is_active",
                    "is_delete",
                ],
                sortableAttributes: ["created_at", "reference", "description"],
            });
            await exports.meili.waitForTask(productSettingTask.taskUid);
            console.log("Product database initialized");
        }
        const productPackage = await exports.meili.getIndex("package");
        if (productPackage) {
            console.info("Package database already exists.");
        }
        else {
            const createProductPackage = await exports.meili.createIndex("package", {
                primaryKey: "id",
            });
            await exports.meili.waitForTask(createProductPackage.taskUid);
            const productPackageSettingTask = await exports.meili
                .index("package")
                .updateSettings({
                filterableAttributes: ["is_delete"],
                sortableAttributes: ["name", "description"],
            });
            await exports.meili.waitForTask(productPackageSettingTask.taskUid);
            console.log("Package database initialized");
        }
    }
    catch (error) {
        console.error("Error during MeiliSearch initialization:", error);
        throw error;
    }
};
exports.initializeMeiliSearch = initializeMeiliSearch;
(0, exports.initializeMeiliSearch)();
//# sourceMappingURL=meili.helper.js.map