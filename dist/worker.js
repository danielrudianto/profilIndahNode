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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const mongoose_1 = __importDefault(require("mongoose"));
const mongo_product_model_1 = require("./mongo-model/mongo-product.model");
const workerOptions = {
    connection: {
        host: "localhost",
        port: 6379,
    },
};
const url = "mongodb://127.0.0.1:27017";
const workerHandler = (job) => __awaiter(void 0, void 0, void 0, function* () {
    yield mongoose_1.default.connect(url, {
        dbName: "ProfilIndah",
        autoCreate: true,
    });
    console.log("[info]: Connected with database");
    const name = job.name;
    switch (name) {
        case "insert-product":
            let insertProductRreference = job.data.reference;
            let insertProductDescription = job.data.description;
            let insertProductID = job.data.id;
            let insertProductUnit = job.data.unit;
            let insertProductItemTypeID = job.data.itemTypeID;
            let insertProductItemBrandID = job.data.itemBrandID;
            yield mongo_product_model_1.mongoProductModel.create({
                reference: insertProductRreference,
                description: insertProductDescription,
                itemID: insertProductID,
                unit: insertProductUnit,
                currentStock: 0,
                itemTypeID: insertProductItemTypeID,
                itemBrandID: insertProductItemBrandID,
            });
            break;
        case "update-product":
            let updateProductRreference = job.data.reference;
            let updateProductDescription = job.data.description;
            let updateProductID = job.data.id;
            let updateProductUnit = job.data.unit;
            let updateProductItemTypeID = job.data.itemTypeID;
            let updateProductItemBrandID = job.data.itemBrandID;
            const updateProduct = yield mongo_product_model_1.mongoProductModel.findOne({
                itemID: updateProductID,
            });
            if (updateProduct) {
                updateProduct.reference = updateProductRreference;
                updateProduct.description = updateProductDescription;
                updateProduct.unit = updateProductUnit;
                updateProduct.itemTypeID = updateProductItemTypeID;
                updateProduct.itemBrandID = updateProductItemBrandID;
                yield updateProduct.save();
            }
            break;
        case "insert-stock":
            // 1. Insert to stock card
            // 2. Update current stock
            // 3. Calculate distribution
            break;
        case "delete-stock":
            // 1. Delete from stock card
            // 2. Update current stock
            // 3. Redistribute stock
            break;
    }
});
const worker = new bullmq_1.Worker("queue", workerHandler, workerOptions);
worker.on("failed", (job, err) => {
    console.error(`[error]: ${job.id} has failed with ${err.message}`);
});
worker.on("completed", (job, _) => {
    console.log(`[info]: Job #${job.id} has completed.`);
});
worker.on("error", (err) => {
    console.error(`[error]: ${err.message}`);
});
console.log("Worker started!");
