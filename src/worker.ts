import { Job, Worker } from "bullmq";
import MeiliSearch from "meilisearch";
import mongoose from "mongoose";
import { mongoOverflowModel } from "./mongo-model/mongo-overflow.model";
import { mongoProductModel } from "./mongo-model/mongo-product.model";
import { mongoStockInModel } from "./mongo-model/mongo-stock-in.model";

const meili = new MeiliSearch({
  host: "http://localhost:7700",
  apiKey: "UTw9kRYvov_K4fd1mQnDFKpdcxXVevHPcVEPWWlTVSg",
});

const workerOptions = {
  connection: {
    host: "localhost",
    port: 6379,
  },
};

const url = "mongodb://127.0.0.1:27017";
const workerHandler = async (job: Job<any>) => {
  await mongoose.connect(url, {
    dbName: "ProfilIndah",
    autoCreate: true,
  });
  console.info("[info]: Connected with database");

  const name = job.name;
  switch (name) {
    case "insert-product":
      const insertProductRreference = job.data.reference;
      const insertProductDescription = job.data.description;
      const insertProductID = job.data.id;
      const insertProductUnit = job.data.unit;
      const insertProductBrand = job.data.item_brand.name;
      const insertProductType = job.data.item_type.name;
      const insertProductItemTypeID = job.data.itemTypeID;
      const insertProductItemBrandID = job.data.itemBrandID;

      await mongoProductModel.create({
        reference: insertProductRreference,
        description: insertProductDescription,
        itemID: insertProductID,
        unit: insertProductUnit,
        currentStock: 0,
        itemTypeID: insertProductItemTypeID,
        itemBrandID: insertProductItemBrandID,
      });

      await meili.index("item").addDocuments(
        [
          {
            id: insertProductID,
            reference: insertProductRreference,
            description: insertProductDescription,
            brand: insertProductBrand,
            brandID: insertProductItemBrandID,
            type: insertProductType,
            typeID: insertProductItemTypeID,
            is_active: true,
          },
        ],
        {
          primaryKey: "id",
        }
      );
      break;
    case "update-product":
      const updateProductRreference = job.data.reference;
      const updateProductDescription = job.data.description;
      const updateProductID = job.data.id;
      const updateProductUnit = job.data.unit;
      const updateProductBrand = job.data.item_brand.name;
      const updateProductType = job.data.item_type.name;
      const updateProductItemTypeID = job.data.itemTypeID;
      const updateProductItemBrandID = job.data.itemBrandID;

      const updateProduct = await mongoProductModel.findOne({
        itemID: updateProductID,
      });

      if (updateProduct) {
        updateProduct.reference = updateProductRreference;
        updateProduct.description = updateProductDescription;
        updateProduct.unit = updateProductUnit;
        updateProduct.itemTypeID = updateProductItemTypeID;
        updateProduct.itemBrandID = updateProductItemBrandID;
        await updateProduct.save();
      } else {
        await mongoProductModel.create({
          reference: updateProductRreference,
          description: updateProductDescription,
          itemID: updateProductID,
          unit: updateProductUnit,
          currentStock: 0,
          itemTypeID: updateProductItemTypeID,
          itemBrandID: updateProductItemBrandID,
        });
      }

      await meili.index("item").updateDocuments([
        {
          id: updateProductID,
          reference: updateProductRreference,
          description: updateProductDescription,
          brand: updateProductBrand,
          brandID: updateProductItemBrandID,
          type: updateProductType,
          typeID: updateProductItemTypeID,
          is_active: true,
        },
      ]);
      break;
    case "update-product-type":
      let updateProductTypeName = job.data.name;
      let updateProductTypeItemID = job.data.item as {
        id: number;
      }[];

      await meili.index("product").updateDocuments(
        updateProductTypeItemID.map((x) => {
          return {
            id: x.id,
            type: updateProductTypeName,
          };
        })
      );
      break;
    case "create-product-package":
      const createProductPackageID = job.data.id;
      const createProductPackageName = job.data.name;
      const createProductPackageDescription = job.data.description;
      const createProductPackagePackageContent = job.data
        .package_content as any[];
      await meili.index("package").addDocuments(
        [
          {
            id: createProductPackageID,
            name: createProductPackageName,
            description: createProductPackageDescription,
            product_content: createProductPackagePackageContent.map((y) => {
              return {
                quantity: y.quantity,
                item: {
                  reference: y.item.reference,
                  description: y.item.description,
                  unit: y.item.unit,
                },
                item_unit:
                  y.item_unit == null
                    ? null
                    : {
                        unit: y.item_unit.unit,
                        conversion: y.item_unit.conversion,
                      },
              };
            }),
          },
        ],
        {
          primaryKey: "id",
        }
      );
      break;
    case "update-product-package":
      const updateProductPackageID = job.data.id;
      const updateProductPackageName = job.data.name;
      const updateProductPackageDescription = job.data.description;

      await meili.index("package").updateDocuments(
        [
          {
            id: updateProductPackageID,
            name: updateProductPackageName,
            description: updateProductPackageDescription,
          },
        ],
        {
          primaryKey: "id",
        }
      );
    case "create-adjustment-case":
      const createAdjustmentCaseID = job.data.id;
      const createAdjustmentCaseCreatedAt = job.data.created_at;
      const createAdjustmentCaseName = job.data.name;
      const createAdjustmentCaseDate = job.data.date;
      const createAdjustmentEventItems = job.data.adjustment_case as any[];
      const createAdjustmentEventCompanyID = job.data.company_id;

      for (let i = 0; i < createAdjustmentEventItems.length; i++) {
        const createAdjustmentEventItem = createAdjustmentEventItems[i];
        const createAdjustmentEventItemID = createAdjustmentEventItem.item.id;
        const createAdjustmentEventItemQuantity =
          createAdjustmentEventItem.quantity;
        const createAdjustmentEventItemConversion =
          createAdjustmentEventItem.item_unit == null
            ? 1
            : createAdjustmentEventItem.item_unit.conversion;
        const createAdjustmentEventItemUnit =
          createAdjustmentEventItem.item_unit == null
            ? createAdjustmentEventItem.item.unit
            : createAdjustmentEventItem.item_unit.unit;

        const updateProduct = await mongoProductModel.findOne({
          itemID: createAdjustmentEventItemID,
        });

        if (updateProduct) {
          updateProduct.currentStock =
            updateProduct.currentStock +
            createAdjustmentEventItemQuantity *
              createAdjustmentEventItemConversion;

          updateProduct.stockCard.unshift({
            createdAt: createAdjustmentCaseCreatedAt,
            date: createAdjustmentCaseDate,
            document: createAdjustmentCaseName,
            opponent: "Internal",
            displayQuantity: createAdjustmentEventItemQuantity,
            quantity:
              createAdjustmentEventItemQuantity *
              createAdjustmentEventItemConversion,
            unit: createAdjustmentEventItemUnit,
            currentStock: 0,
            billID: null,
            billCodeID: null,
            adjustmentCaseID: createAdjustmentEventItem.id,
            adjustmentCaseCodeID: createAdjustmentCaseID,
            goodReceiptID: null,
            goodReceiptCodeID: null,
            salesReturnID: null,
            salesReturnCodeID: null,
          });

          await updateProduct.save();
        }

        if (createAdjustmentEventItemQuantity > 0) {
          // insert to stock card
          await mongoStockInModel.create({
            companyID: createAdjustmentEventCompanyID,
            adjustmentCaseID: createAdjustmentEventItem.id,
            adjustmentCaseCodeID: createAdjustmentCaseID,
            goodReceiptCodeID: null,
            goodReceiptID: null,
            date: createAdjustmentCaseDate,
            price: 0,
            quantity:
              createAdjustmentEventItemQuantity *
              createAdjustmentEventItemConversion,
            residue:
              createAdjustmentEventItemQuantity *
              createAdjustmentEventItemConversion,
            itemID: createAdjustmentEventItemID,
            stockOut: [],
          });
        } else {
          let quantity = createAdjustmentEventItemQuantity;
          while (quantity > 0) {
            if (quantity == 0) {
              break;
            }

            const stockIn = await mongoStockInModel
              .findOne({
                itemID: createAdjustmentEventItemID,
                residue: { $gt: 0 },
              })
              .sort({ date: 1 });

            if (stockIn) {
              const stockInResidue = stockIn.residue;
              if (stockInResidue > quantity) {
                stockIn.residue = stockInResidue - quantity;
                stockIn.stockOut.unshift({
                  adjustmentCaseID: createAdjustmentEventItem.id,
                  adjustmentCaseCodeID: createAdjustmentCaseID,
                  billID: null,
                  billCodeID: null,
                  date: createAdjustmentCaseDate,
                  displayQuantity: quantity,
                  quantity: quantity * createAdjustmentEventItemConversion,
                  unit: createAdjustmentEventItemUnit,
                });
                quantity = 0;
                await stockIn.save();
              } else {
                stockIn.stockOut.unshift({
                  adjustmentCaseID: createAdjustmentEventItem.id,
                  adjustmentCaseCodeID: createAdjustmentCaseID,
                  billID: null,
                  billCodeID: null,
                  date: createAdjustmentCaseDate,
                  displayQuantity: stockInResidue,
                  quantity:
                    stockInResidue * createAdjustmentEventItemConversion,
                  unit: createAdjustmentEventItemUnit,
                });
                quantity -= stockInResidue;
                stockIn.residue = 0;
                await stockIn.save();
              }
            } else {
              await mongoOverflowModel.create({
                itemID: createAdjustmentEventItemID,
                createdAt: createAdjustmentCaseCreatedAt,
                date: createAdjustmentCaseDate,
                document: createAdjustmentCaseName,
                opponent: "Internal",
                displayQuantity: quantity,
                quantity: quantity * createAdjustmentEventItemConversion,
                unit: createAdjustmentEventItemUnit,
                currentStock: 0,
                billID: null,
                billCodeID: null,
                adjustmentCaseID: createAdjustmentEventItem.id,
                adjustmentCaseCodeID: createAdjustmentCaseID,
                goodReceiptID: null,
                goodReceiptCodeID: null,
                salesReturnID: null,
                salesReturnCodeID: null,
              });

              quantity = 0;
            }
          }
        }
      }

      break;
    case "delete-adjustment-case":
      const deleteAdjustmentCaseID = job.data.id;
      const deleteAdjustmentCaseCreatedAt = job.data.created_at;
      const deleteAdjustmentCaseName = job.data.name;
      const deleteAdjustmentCaseDate = job.data.date;
      const deleteAdjustmentEventItems = job.data.adjustment_case as any[];
      const deleteAdjustmentEventCompanyID = job.data.company_id;

      for (let i = 0; i < deleteAdjustmentEventItems.length; i++) {}

      throw new Error("Method not implemented.");
      break;
    case "create-good-receipt":
      const createGoodReceiptID = job.data.id;
      const createGoodReceiptCreatedAt = job.data.created_at;
      const createGoodReceiptName = job.data.name;
      const createGoodReceiptDate = job.data.date;
      const createGoodReceiptItems = job.data.good_receipt as any[];
      const createGoodReceiptCompanyID = job.data.company_id;
      const createGoodReceiptSupplier = job.data.supplier;

      for (let i = 0; i < createGoodReceiptItems.length; i++) {
        const createGoodReceiptItem = createGoodReceiptItems[i];
        const createGoodReceiptItemID = createGoodReceiptItem.item.id;
        const createGoodReceiptItemQuantity = createGoodReceiptItem.quantity;
        const createGoodReceiptItemPrice = parseFloat(
          createGoodReceiptItem.price.toString()
        );
        const createGoodReceiptItemDiscount = parseFloat(
          createGoodReceiptItem.discount.toString()
        );
        const CreateGoodReceiptItemConversion =
          createGoodReceiptItem.item_unit == null
            ? 1
            : createGoodReceiptItem.item_unit.conversion;
        const createGoodReceiptItemUnit =
          createGoodReceiptItem.item_unit == null
            ? createGoodReceiptItem.item.unit
            : createGoodReceiptItem.item_unit.unit;

        const updateProduct = await mongoProductModel.findOne({
          itemID: createGoodReceiptItemID,
        });

        if (updateProduct) {
          updateProduct.currentStock +=
            createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion;

          updateProduct.stockCard.unshift({
            createdAt: createGoodReceiptCreatedAt,
            date: createGoodReceiptDate,
            document: createGoodReceiptName,
            opponent: createGoodReceiptSupplier.name,
            displayQuantity: createGoodReceiptItemQuantity,
            quantity:
              createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion,
            unit: createGoodReceiptItemUnit,
            billID: null,
            billCodeID: null,
            adjustmentCaseID: null,
            adjustmentCaseCodeID: null,
            goodReceiptID: createGoodReceiptItem.id,
            goodReceiptCodeID: createGoodReceiptID,
            salesReturnID: null,
            salesReturnCodeID: null,
          });

          await updateProduct.save();
        }

        await mongoStockInModel.create({
          companyID: createGoodReceiptCompanyID,
          adjustmentCaseID: null,
          adjustmentCaseCodeID: null,
          goodReceiptCodeID: createGoodReceiptID,
          goodReceiptID: createGoodReceiptItem.id,
          date: createGoodReceiptDate,
          price:
            (createGoodReceiptItemPrice - createGoodReceiptItemDiscount) *
            CreateGoodReceiptItemConversion,
          quantity:
            createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion,
          residue:
            createGoodReceiptItemQuantity * CreateGoodReceiptItemConversion,
          itemID: createGoodReceiptItemID,
          stockOut: [],
        });
      }
      break;
    case "create-purchase-invoice":
      console.log(job.data);
      const createPurchaseInvoiceID = job.data.id;
      const createPurchaseInvoiceCreatedAt = job.data.created_at;
      const createPurchaseInvoiceName = job.data.name;
      const createPurchaseInvoiceDate = job.data.date;
      const createPurchaseInvoiceItems = job.data.good_receipt as any[];
      const createPurchaseInvoiceCompanyID = job.data.company_id;
      const createPurchaseInvoiceSupplier = job.data.supplier;

      for (let i = 0; i < createPurchaseInvoiceItems.length; i++) {
        const createPurchaseInvoiceItem = createPurchaseInvoiceItems[i];
        const createPurchaseInvoiceItemID = createPurchaseInvoiceItem.item.id;
        const createPurchaseInvoiceItemQuantity =
          createPurchaseInvoiceItem.quantity;
        const createPurchaseInvoiceItemPrice = createPurchaseInvoiceItem.price;
        const createPurchaseInvoiceItemConversion =
          createPurchaseInvoiceItem.item_unit == null
            ? 1
            : createPurchaseInvoiceItem.item_unit.conversion;
        const createPurchaseInvoiceItemUnit =
          createPurchaseInvoiceItem.item_unit == null
            ? createPurchaseInvoiceItem.item.unit
            : createPurchaseInvoiceItem.item_unit.unit;

        const updateProduct = await mongoProductModel.findOne({
          itemID: createPurchaseInvoiceItemID,
        });

        if (updateProduct) {
          updateProduct.currentStock =
            updateProduct.currentStock +
            createPurchaseInvoiceItemQuantity *
              createPurchaseInvoiceItemConversion;

          updateProduct.stockCard.unshift({
            createdAt: createPurchaseInvoiceCreatedAt,
            date: createPurchaseInvoiceDate,
            document: createPurchaseInvoiceName,
            opponent: createPurchaseInvoiceSupplier.name,
            displayQuantity: createPurchaseInvoiceItemQuantity,
            quantity:
              createPurchaseInvoiceItemQuantity *
              createPurchaseInvoiceItemConversion,
            unit: createPurchaseInvoiceItemUnit,
            billID: null,
            billCodeID: null,
            adjustmentCaseID: null,
            adjustmentCaseCodeID: null,
            goodReceiptID: createPurchaseInvoiceItem.id,
            goodReceiptCodeID: createPurchaseInvoiceID,
            salesReturnID: null,
            salesReturnCodeID: null,
          });

          await updateProduct.save();
        }

        await mongoStockInModel.create({
          companyID: createPurchaseInvoiceCompanyID,
          adjustmentCaseID: null,
          adjustmentCaseCodeID: null,
          goodReceiptCodeID: createPurchaseInvoiceID,
          goodReceiptID: createPurchaseInvoiceItem.id,
          date: createPurchaseInvoiceDate,
          price: createPurchaseInvoiceItemPrice,
          quantity:
            createPurchaseInvoiceItemQuantity *
            createPurchaseInvoiceItemConversion,
          residue:
            createPurchaseInvoiceItemQuantity *
            createPurchaseInvoiceItemConversion,
          itemID: createPurchaseInvoiceItemID,
          stockOut: [],
        });
      }
      break;
    case "confirm-purchase-invoice":
      const confirmPurchaseInvoiceGoodReceipts = job.data.good_receipt;
      const confirmPurchaseInvoiceDiscount = job.data.discount;
      let confirmPurchaseInvoiceTotal = 0;

      for (let i = 0; i < confirmPurchaseInvoiceGoodReceipts.length; i++) {
        confirmPurchaseInvoiceTotal +=
          confirmPurchaseInvoiceGoodReceipts[i].price *
          confirmPurchaseInvoiceGoodReceipts[i].quantity;
      }

      // Distribute discount to each item
      for (let i = 0; i < confirmPurchaseInvoiceGoodReceipts.length; i++) {
        const confirmPurchaseInvoiceGoodReceipt =
          confirmPurchaseInvoiceGoodReceipts[i];
        const confirmPurchaseInvoiceGoodReceiptID =
          confirmPurchaseInvoiceGoodReceipt.id;
        const confirmPurchaseInvoiceGoodReceiptPrice =
          confirmPurchaseInvoiceGoodReceipt.price;
        const confirmPurchaseInvoiceGoodReceiptDiscount =
          (confirmPurchaseInvoiceGoodReceiptPrice /
            confirmPurchaseInvoiceTotal) *
          confirmPurchaseInvoiceDiscount;
        const confirmPurchaseInvoiceFinalPrice =
          confirmPurchaseInvoiceGoodReceiptPrice -
          confirmPurchaseInvoiceGoodReceiptDiscount;

        // Update stock in, update the price
        const updateStockIn = await mongoStockInModel.findOne({
          goodReceiptID: confirmPurchaseInvoiceGoodReceiptID,
        });

        if (updateStockIn) {
          updateStockIn.price = confirmPurchaseInvoiceFinalPrice;
          await updateStockIn.save();
        }
      }

      break;
    case "delete-good-receipt":
      break;
    case "create-sales-return":
      const createSalesReturnDate = new Date(job.data.date);
      const createSalesReturnID = job.data.id;
      const createSalesReturnName = job.data.name;
      const createSalesReturnCreatedAt = job.data.created_at;
      const createSalesReturnItems = job.data.sales_return as any[];

      for (let i = 0; i < createSalesReturnItems.length; i++) {
        const createSalesReturnItemID = createSalesReturnItems[i].id;
        const createSalesReturnBill = createSalesReturnItems[i].bill;
        const createSalesReturnBillID = createSalesReturnBill.id;
        const createSalesReturnCustomer =
          createSalesReturnBill.bill_code.customer == null
            ? "Retail customer"
            : createSalesReturnBill.bill_code.customer.name;
        const createSalesReturnItemQuantity =
          createSalesReturnItems[i].quantity;
        if (createSalesReturnBill.package_code != null) {
          for (
            let n = 0;
            n < createSalesReturnBill.package_code.package_content.length;
            n++
          ) {
            const updateProduct = await mongoProductModel.findOne({
              itemID:
                createSalesReturnBill.package_code.package_content[n].item.id,
            });

            const createSalesReturnItem =
              createSalesReturnBill.package_code.package_content[n];

            let createSalesReturnItemQuantityEdit =
              createSalesReturnItemQuantity *
                createSalesReturnItem.quantity *
                createSalesReturnItem.item_unit ==
              null
                ? 1
                : createSalesReturnItem.item_unit.conversion;

            if (!updateProduct) {
              throw Error("Product not found");
            }

            updateProduct.stockCard.unshift({
              createdAt: createSalesReturnCreatedAt,
              date: createSalesReturnDate,
              document: createSalesReturnName,
              opponent: createSalesReturnCustomer,
              displayQuantity:
                createSalesReturnItemQuantity * createSalesReturnItem.quantity,
              quantity: createSalesReturnItemQuantityEdit,
              unit:
                createSalesReturnItem.item_unit == null
                  ? createSalesReturnItem.item.unit
                  : createSalesReturnItem.item_unit.unit,
              currentStock: 0,
              billID: createSalesReturnBill.id,
              billCodeID: createSalesReturnBill.bill_code.id,
              adjustmentCaseID: null,
              adjustmentCaseCodeID: null,
              goodReceiptID: null,
              goodReceiptCodeID: null,
              salesReturnID: createSalesReturnItemID,
              salesReturnCodeID: createSalesReturnID,
            });

            updateProduct.currentStock += createSalesReturnItemQuantityEdit;
            await updateProduct.save();

            while (createSalesReturnItemQuantityEdit > 0) {
              const stockIns = await mongoStockInModel
                .findOne({
                  stockOut: {
                    $elemMatch: {
                      itemID: createSalesReturnItem.item.id,
                      billID: createSalesReturnBillID,
                      quantity: {
                        $gt: 0,
                      },
                    },
                  },
                })
                .sort({
                  date: -1,
                });

              if (!stockIns) {
                throw Error("Stock in not found");
              }

              const stockOutIndex = stockIns.stockOut.findIndex(
                (stockOut) => stockOut.billID == createSalesReturnBillID
              );

              if (stockOutIndex == -1) {
                throw Error("Stock out not found");
              }

              if (
                createSalesReturnItemQuantityEdit >
                stockIns.stockOut[stockOutIndex].quantity
              ) {
                stockIns.stockOut[stockOutIndex].quantity = 0;
                stockIns.residue += createSalesReturnItemQuantityEdit;
                createSalesReturnItemQuantityEdit -=
                  stockIns.stockOut[stockOutIndex].quantity;

                await stockIns.save();
              } else {
                stockIns.stockOut[stockOutIndex].quantity -=
                  createSalesReturnItemQuantityEdit;
                stockIns.residue += createSalesReturnItemQuantityEdit;
                createSalesReturnItemQuantityEdit = 0;

                await stockIns.save();
              }
            }
          }
        } else {
          const updateProduct = await mongoProductModel.findOne({
            itemID: createSalesReturnBill.item.id,
          });

          if (!updateProduct) {
            throw Error("Product not found");
          }

          updateProduct.stockCard.unshift({
            createdAt: createSalesReturnCreatedAt,
            date: createSalesReturnDate,
            document: createSalesReturnName,
            opponent: createSalesReturnCustomer,
            displayQuantity: createSalesReturnItemQuantity,
            quantity:
              createSalesReturnItemQuantity *
              (createSalesReturnBill.item_unit == null
                ? 1
                : createSalesReturnBill.item_unit.conversion),
            unit:
              createSalesReturnBill.item_unit == null
                ? createSalesReturnBill.item.unit
                : createSalesReturnBill.item_unit.unit,
            currentStock: 0,
            billID: createSalesReturnBill.id,
            billCodeID: createSalesReturnBill.bill_code.id,
            adjustmentCaseID: null,
            adjustmentCaseCodeID: null,
            goodReceiptID: null,
            goodReceiptCodeID: null,
            salesReturnID: createSalesReturnItemID,
            salesReturnCodeID: createSalesReturnID,
          });

          updateProduct.currentStock +=
            createSalesReturnItemQuantity *
            (createSalesReturnBill.item_unit == null
              ? 1
              : createSalesReturnBill.item_unit.conversion);
          await updateProduct.save();

          let createSalesReturnItemQuantityEdit = createSalesReturnItemQuantity;
          while (createSalesReturnItemQuantityEdit > 0) {
            console.log(
              `Current quantity: ${createSalesReturnItemQuantityEdit}`
            );
            if (createSalesReturnItemQuantityEdit == 0) {
              break;
            }

            const stockIns = await mongoStockInModel
              .findOne({
                stockOut: {
                  $elemMatch: {
                    billID: createSalesReturnBillID,
                    quantity: {
                      $gt: 0,
                    },
                  },
                },
              })
              .sort({
                date: -1,
              });

            if (!stockIns) {
              throw Error("Stock in not found");
            }

            console.log(`[info]: Stock in found.`);

            const stockOutIndex = stockIns.stockOut.findIndex(
              (stockOut) => stockOut.billID == createSalesReturnBillID
            );

            if (stockOutIndex == -1) {
              throw Error("Stock out not found");
            }

            console.log(`[info]: Stock out found.`);

            if (
              createSalesReturnItemQuantityEdit >
              stockIns.stockOut[stockOutIndex].quantity
            ) {
              console.log(
                `[info]: Quantity is greater than stock out quantity.`
              );
              stockIns.stockOut[stockOutIndex].quantity = 0;
              stockIns.residue += createSalesReturnItemQuantityEdit;
              createSalesReturnItemQuantityEdit -=
                stockIns.stockOut[stockOutIndex].quantity;

              await stockIns.save();
            } else {
              console.log(
                `[info]: Quantity is less than or equal to stock out quantity.`
              );
              stockIns.stockOut[stockOutIndex].quantity -=
                createSalesReturnItemQuantityEdit;
              stockIns.residue += createSalesReturnItemQuantityEdit;
              createSalesReturnItemQuantityEdit = 0;

              await stockIns.save();
              break;
            }
          }
        }
      }
      break;
    case "delete-sales-return":
      const deleteSalesReturnItems = job.data.sales_return as any[];
      for (let i = 0; i < deleteSalesReturnItems.length; i++) {
        // We need to delete every stock card that has sales return id
        const deleteSalesReturnItemID = deleteSalesReturnItems[i].id;

        const deleteSalesReturnItem = deleteSalesReturnItems[i];
        const deleteSalesReturnItemQuantity = parseFloat(
          deleteSalesReturnItem.sales_return.quantity
        );
        if (deleteSalesReturnItem.sales_return.bill.package_code != null) {
          for (
            let n = 0;
            n <
            deleteSalesReturnItem.sales_return.bill.package_code.package_content
              .length;
            n++
          ) {
            const deleteSalesReturnItemItemID =
              deleteSalesReturnItem.sales_return.bill.package_code
                .package_content[n].item.id;
            const deleteSalesReturnItemItemQuantity =
              parseFloat(
                deleteSalesReturnItem.sales_return.bill.package_code.package_content[
                  n
                ].quantity.toString()
              ) *
              (deleteSalesReturnItem.sales_return.bill.package_content[n]
                .item_unit == null
                ? 1
                : parseFloat(
                    deleteSalesReturnItem.sales_return.bill.package_content[
                      n
                    ].item_unit.conversion.toString()
                  )) *
              parseFloat(deleteSalesReturnItemQuantity.toString());

            await mongoProductModel.findOneAndUpdate(
              {
                itemID: deleteSalesReturnItemItemID,
              },
              {
                $pull: {
                  stockCard: {
                    salesReturnID: deleteSalesReturnItemID,
                  },
                },
                $set: {
                  currentStock: {
                    $inc: deleteSalesReturnItemItemQuantity,
                  },
                },
              }
            );
          }
        } else if (deleteSalesReturnItem.sales_return.bill.item_id != null) {
          await mongoProductModel.findOneAndUpdate(
            {
              itemID: deleteSalesReturnItem.sales_return.bill.item_id,
            },
            {
              $pull: {
                stockCard: {
                  salesReturnID: deleteSalesReturnItemID,
                },
              },
              $set: {
                currentStock: {
                  $inc: deleteSalesReturnItemQuantity,
                },
              },
            }
          );
        }
      }

      break;
    case "create-sales-invoice":
      const createSalesInvoiceID = job.data.id;
      const createSalesInvoiceCreatedAt = job.data.created_at;
      const createSalesInvoiceDate = new Date(job.data.date);
      const createSalesInvoiceName = job.data.name;
      const createSalesInvoiceItems = job.data.bill;
      const createSalesInvoiceCustomer = job.data.customer;

      const createSalesInvoiceDelivery = parseFloat(
        job.data.delivery.toString()
      );
      const createSalesInvoiceService = parseFloat(job.data.service.toString());
      const createSalesInvoiceDiscount = parseFloat(
        job.data.discount.toString()
      );

      let createSalesInvoiceTotal = 0;
      // We need to calculate the total price of the bill
      for (let i = 0; i < createSalesInvoiceItems.length; i++) {
        createSalesInvoiceTotal +=
          (createSalesInvoiceItems[i].price -
            createSalesInvoiceItems[i].discount) *
          createSalesInvoiceItems[i].quantity;
      }

      const createSalesInvoiceNetTotal =
        createSalesInvoiceTotal +
        createSalesInvoiceService -
        createSalesInvoiceDiscount +
        createSalesInvoiceDelivery;

      const createSalesInvoiceInsertItems: any[] = [];

      for (let i = 0; i < createSalesInvoiceItems.length; i++) {
        const createSalesInvoiceItem = createSalesInvoiceItems[i];

        if (createSalesInvoiceItem.package_code != null) {
          const createSalesInvoicePackagePrice = createSalesInvoiceItem.price;
          const createSalesInvoicePackageDiscount =
            createSalesInvoiceItem.discount;
          const createSalesInvoicePackageQuantity =
            createSalesInvoiceItem.quantity;
          const createSalesInvoicePackageFinalPrice =
            ((createSalesInvoicePackagePrice -
              createSalesInvoicePackageDiscount) *
              createSalesInvoiceTotal) /
            createSalesInvoiceNetTotal;
          const createSalesInvoicePackageContent =
            createSalesInvoiceItem.package_content as any[];
          const createSalesInvoicePackageContentValue =
            createSalesInvoicePackageContent.reduce((a, b) => {
              return a + b.quantity * (b.price - b.discount);
            }, 0);

          for (let n = 0; n < createSalesInvoicePackageContent.length; n++) {
            const createSalesInvoicePackageContentItem =
              createSalesInvoicePackageContent[n];
            const createSalesInvoiceItemID = createSalesInvoiceItem.id;
            const createSalesInvoiceItemItemID = createSalesInvoiceItem.item_id;
            const createSalesInvoiceItemQuantity =
              createSalesInvoicePackageContentItem.quantity;
            const createSalesInvoiceItemPrice =
              createSalesInvoicePackageContentItem.price;
            const createSalesInvoiceItemDiscount =
              createSalesInvoicePackageContentItem.discount;
            const createSalesInvoiceItemUnit =
              createSalesInvoicePackageContentItem.unit;
            const createSalesInvoiceItemConversion =
              createSalesInvoicePackageContentItem.item_unit == null
                ? 1
                : createSalesInvoiceItem.item_unit.conversion;
            const finalUnitPrice =
              ((createSalesInvoiceItemPrice - createSalesInvoiceItemDiscount) *
                createSalesInvoicePackageFinalPrice) /
              (createSalesInvoicePackageContentValue *
                createSalesInvoiceItemConversion);

            const updateProduct = await mongoProductModel.findOne({
              itemID: createSalesInvoiceItemItemID,
            });

            if (updateProduct) {
              updateProduct.currentStock =
                updateProduct.currentStock -
                createSalesInvoiceItemQuantity *
                  createSalesInvoiceItemConversion;

              updateProduct.stockCard.unshift({
                createdAt: createSalesInvoiceCreatedAt,
                date: createSalesInvoiceDate,
                document: createSalesInvoiceName,
                opponent:
                  createSalesInvoiceCustomer == null
                    ? "Retail customer"
                    : createSalesInvoiceCustomer.name,
                displayQuantity: createSalesInvoiceItemQuantity * -1,
                quantity:
                  createSalesInvoiceItemQuantity *
                  createSalesInvoiceItemConversion *
                  createSalesInvoicePackageQuantity *
                  -1,
                unit: createSalesInvoiceItemUnit,
                billID: createSalesInvoiceID,
                billCodeID: createSalesInvoiceID,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                goodReceiptID: null,
                goodReceiptCodeID: null,
                salesReturnID: null,
                salesReturnCodeID: null,
              });

              await updateProduct.save();

              createSalesInvoiceInsertItems.push({
                quantity:
                  createSalesInvoiceItemQuantity *
                  createSalesInvoiceItemConversion *
                  createSalesInvoicePackageQuantity,
                date: createSalesInvoiceDate,
                value: finalUnitPrice,
                billID: createSalesInvoiceItemID,
                billCodeID: createSalesInvoiceID,
                adjustmentCaseID: null,
                adjustmentCaseCodeID: null,
                itemID: createSalesInvoiceItemItemID,
              });
            }
          }
        } else {
          const createSalesInvoiceItemID = createSalesInvoiceItem.id;
          const createSalesInvoiceItemItemID = createSalesInvoiceItem.item_id;
          const createSalesInvoiceItemQuantity =
            createSalesInvoiceItem.quantity;
          const createSalesInvoiceItemPrice = createSalesInvoiceItem.price;
          const createSalesInvoiceItemDiscount =
            createSalesInvoiceItem.discount;
          const createSalesInvoiceItemUnit =
            createSalesInvoiceItem.item_unit == null
              ? createSalesInvoiceItem.item.unit
              : createSalesInvoiceItem.item_unit.unit;
          const createSalesInvoiceItemConversion =
            createSalesInvoiceItem.item_unit == null
              ? 1
              : createSalesInvoiceItem.item_unit.conversion;

          const finalUnitPrice =
            ((createSalesInvoiceItemPrice - createSalesInvoiceItemDiscount) *
              createSalesInvoiceNetTotal) /
            (createSalesInvoiceTotal * createSalesInvoiceItemConversion);
          const updateProduct = await mongoProductModel.findOne({
            itemID: createSalesInvoiceItemItemID,
          });

          if (updateProduct) {
            updateProduct.currentStock =
              updateProduct.currentStock -
              createSalesInvoiceItemQuantity * createSalesInvoiceItemConversion;

            updateProduct.stockCard.unshift({
              createdAt: createSalesInvoiceCreatedAt,
              date: createSalesInvoiceDate,
              document: createSalesInvoiceName,
              opponent:
                createSalesInvoiceCustomer == null
                  ? "Retail customer"
                  : createSalesInvoiceCustomer.name,
              displayQuantity: createSalesInvoiceItemQuantity * -1,
              quantity:
                createSalesInvoiceItemQuantity *
                createSalesInvoiceItemConversion *
                -1,
              unit: createSalesInvoiceItemUnit,
              billID: createSalesInvoiceItemID,
              billCodeID: createSalesInvoiceID,
              adjustmentCaseID: null,
              adjustmentCaseCodeID: null,
              goodReceiptID: null,
              goodReceiptCodeID: null,
              salesReturnID: null,
              salesReturnCodeID: null,
            });

            await updateProduct.save();

            createSalesInvoiceInsertItems.push({
              quantity:
                createSalesInvoiceItemQuantity *
                createSalesInvoiceItemConversion,
              date: createSalesInvoiceDate,
              value: finalUnitPrice,
              billID: createSalesInvoiceItemID,
              billCodeID: createSalesInvoiceID,
              adjustmentCaseID: null,
              adjustmentCaseCodeID: null,
              itemID: createSalesInvoiceItemItemID,
            });
          }
        }
      }

      for (let i = 0; i < createSalesInvoiceInsertItems.length; i++) {
        const createSalesInvoiceInsertItem = createSalesInvoiceInsertItems[i];
        const createSalesInvoiceItemID = createSalesInvoiceInsertItem.itemID;
        let createSalesInvoiceItemQuantity =
          createSalesInvoiceInsertItem.quantity;
        while (createSalesInvoiceItemQuantity > 0) {
          if (createSalesInvoiceItemQuantity == 0) {
            break;
          }

          // Find stock in from the oldest
          const stockIn = await mongoStockInModel
            .findOne({
              itemID: createSalesInvoiceItemID,
              residue: { $gt: 0 },
            })
            .sort({
              date: 1,
            });

          if (stockIn) {
            if (stockIn.residue > createSalesInvoiceItemQuantity) {
              stockIn.residue =
                stockIn.residue - createSalesInvoiceItemQuantity;
              stockIn.stockOut.unshift({
                ...createSalesInvoiceInsertItem,
                quantity: createSalesInvoiceItemQuantity,
              });
              await stockIn.save();
              createSalesInvoiceItemQuantity = 0;
            } else {
              stockIn.stockOut.unshift(createSalesInvoiceInsertItem);

              createSalesInvoiceItemQuantity =
                createSalesInvoiceItemQuantity - stockIn.residue;
              stockIn.residue = 0;
              await stockIn.save();
            }
          } else {
            await mongoOverflowModel.create(createSalesInvoiceInsertItem);
            createSalesInvoiceItemQuantity = 0;
            break;
          }
        }
      }
      break;
    case "delete-sales-invoice":
      const deleteSalesInvoiceID = job.data.id;
      const deleteSalesInvoiceItems = job.data.bill;

      for (let i = 0; i < deleteSalesInvoiceItems.length; i++) {
        if (deleteSalesInvoiceItems[i].item_id != null) {
          const quantity = deleteSalesInvoiceItems[i].quantity;
          const conversion =
            deleteSalesInvoiceItems[i].item_unit == null
              ? 1
              : parseFloat(deleteSalesInvoiceItems[i].item_unit.conversion);
          const updateProduct = await mongoProductModel.findOne({
            itemID: deleteSalesInvoiceItems[i].item_id,
          });

          if (updateProduct) {
            updateProduct.currentStock += quantity * conversion;
            // Remove from stock card
            const stockCardIndex = updateProduct.stockCard.findIndex(
              (item) =>
                item.billID == deleteSalesInvoiceItems[i].id &&
                item.billCodeID == deleteSalesInvoiceID &&
                item.salesReturnCodeID == null &&
                item.salesReturnID == null
            );

            if (stockCardIndex != -1) {
              updateProduct.stockCard.splice(stockCardIndex, 1);
            }

            await updateProduct.save();
          }
        } else if (deleteSalesInvoiceItems[i].package_code_id != null) {
        }
      }
      break;
    case "rearrage-stock-card":
      const productID = job.data;
      const product = await mongoProductModel.findOne({
        itemID: productID,
      });

      if (product) {
        // Arrange stock card, from the newest to the oldest
        // And then, calculate the current stock for each row
        const stockCard = product.stockCard.sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        let currentStock = 0;
        for (let i = 0; i < stockCard.length; i++) {
          stockCard[i].currentStock += stockCard[i].quantity;
          currentStock += stockCard[i].quantity;
        }

        // Lastly, reverse the stock card
        product.stockCard = stockCard.reverse();
        await product.save();
      }
      break;
  }
};

const worker = new Worker("queue", workerHandler, workerOptions);

worker.on("failed", (job, err) => {
  console.error(`[error]: ${job!.id} has failed with ${err.message}`);
});

worker.on("completed", (job, _) => {
  console.log(`[info]: Job #${job!.id} has completed.`);
});

worker.on("error", (err) => {
  console.error(`[error]: ${err.message}`);
});

console.info("[info]: Worker started!");
