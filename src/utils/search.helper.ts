import { Request, Response } from "express";
import { meili } from "./meili.helper";
import { prisma } from "./database.helper";
import { ProductRepository } from "../repositories/product.repository";

class SearchHelper {
  private productRepository: ProductRepository;
  constructor(productRepository: ProductRepository) {
    this.productRepository = productRepository;
  }

  static createIndex = async (req: Request, res: Response) => {
    await meili.deleteIndexIfExists("item");
    await meili.deleteIndexIfExists("customer");
    await meili.deleteIndexIfExists("package");
    await meili.deleteIndexIfExists("product");
    await meili.deleteIndexIfExists("products");

    // await meili.createIndex("item", {
    //   primaryKey: "id",
    // });
    // await meili.createIndex("customer");
    // await meili.createIndex("package");

    await meili.index("product").updateSettings({
      searchableAttributes: [
        "reference",
        "description",
        "product_brand",
        "product_type",
      ],
      rankingRules: ["words", "typo", "proximity", "attribute", "exactness"],
      filterableAttributes: [
        "is_active",
        "product_brand_id",
        "product_type_id",
      ],
      distinctAttribute: "id",
      synonyms: {
        "rel fe": ["Rel full extension"],
        shelf: ["rak"],
        knob: ["handle", "knop"],
        double: ["doble", "dobel", "dubel", "dobel", "dubbel"],
        "double bracket": ["doble bracket", "dobel bracket", "dubel bracket"],
        bracket: ["breket"],
        profile: ["profil", "profill"],
        hinge: ["engsel"],
        hing: ["engsel"],
        lis: ["list"],
        "lubang angin": ["lubang udara", "lubang hawa"],
        tacosheet: ["sheet", "sheeting", "shit"],
        sss: ["stainless steel"],
        ss: ["stainless steel"],
        bb: ["ball bearing"],
        "ball bearing": ["bb"],
      },
      typoTolerance: {
        enabled: true,
      },
    });

    return res.status(200).send({
      message: "Create index success",
    });
  };

  fillProducts = async (req: Request, res: Response) => {
    const products = await this.productRepository.fetchAll();
    try {
      await meili.index("product").addDocuments(products);
      console.log("[info]: Indexing products completed.");
      return res.status(200).send({
        message: "Indexing products completed",
      });
    } catch (error) {
      console.error(`[error]: Error while indexing products. ${error}`);
      return res.status(500).send({
        message: "Error while indexing products",
      });
    }
  };

  static getTasks = async (req: Request, res: Response) => {
    return res.status(200).send(await meili.getTask(15));
  };

  /**
   * Sync product, customer, or package data to meilisearch
   * @param req
   * @param res
   */
  static syncMasterData = async (req: Request, res: Response) => {
    // switch (mode) {
    //   case syncMode.Product:
    //     // await meili.createIndex("item");
    //     await meili.index("item").updateSettings({
    //       searchableAttributes: ["reference", "description", "brand", "type"],
    //       rankingRules: [
    //         "words",
    //         "typo",
    //         "proximity",
    //         "attribute",
    //         "exactness",
    //       ],
    //       filterableAttributes: ["is_active", "itemBrandID", "itemTypeID"],
    //       distinctAttribute: "id",
    //       synonyms: {
    //         "rel fe": ["Rel full extension"],
    //         shelf: ["rak"],
    //         knob: ["handle", "knop"],
    //         double: ["doble", "dobel", "dubel", "dobel", "dubbel", "dubbel"],
    //         "double bracket": [
    //           "doble bracket",
    //           "dobel bracket",
    //           "dubel bracket",
    //         ],
    //         bracket: ["breket"],
    //         profile: ["profil"],
    //         hinge: ["engsel"],
    //         hing: ["engsel"],
    //         lis: ["list"],
    //         "lubang angin": ["lubang udara", "lubang hawa"],
    //         tacosheet: ["sheet"],
    //         sss: ["stainless steel"],
    //         ss: ["stainless steel"],
    //         bb: ["ball bearing"],
    //         "ball bearing": ["bb"],
    //       },
    //       typoTolerance: {
    //         enabled: true,
    //       },
    //     });
    //     await meili.index("item").deleteAllDocuments();
    //     ItemModel.fetchAll(new Date())
    //       .then(async (items) => {
    //         meili
    //           .index("item")
    //           .addDocuments([
    //             ...items.map((x) => {
    //               return {
    //                 id: x.id,
    //                 reference: x.reference,
    //                 description: x.description,
    //                 brand: x.item_brand.name,
    //                 type: x.item_type.name,
    //                 itemBrandID: x.item_brand_id,
    //                 itemTypeID: x.item_type_id,
    //                 is_active: x.is_active ? 1 : 0,
    //               };
    //             }),
    //           ])
    //           .then((result) => {
    //             return res.status(200).send({
    //               message: "Sync product success",
    //             });
    //           })
    //           .catch((error) => {
    //             console.error(
    //               `[error]: Error on indexing search data. ${error} `
    //             );
    //           });
    //       })
    //       .catch((error) => {
    //         console.log(`[error]: Error while indexing search data. ${error}`);
    //         return res.status(500).send(error);
    //       });
    //     break;
    //   case syncMode.Customer:
    //     await meili.index("customer").deleteAllDocuments();
    //     CustomerModel.fetch("", 0, 0, fetchMode.All)!
    //       .then(async (customers) => {
    //         await meili.index("customer").addDocumentsInBatches(
    //           (customers as any[]).map((x) => {
    //             return {
    //               id: x.id,
    //               name: x.name,
    //               address: x.address,
    //               phone: x.phone,
    //               email: x.email,
    //               pic: x.pic,
    //             };
    //           })
    //         );
    //             console.log("[info]: Sync product NoSQL completed.");
    //             return res.status(200).send({
    //               message: "Sync product NoSQL success",
    //             });
    //           })
    //           .catch((error) => {
    //             console.error(`[error]: Error on sync product NoSQL. ${error}`);
    //             return res.status(500).send(error);
    //           });
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on deleting product NoSQL. ${error}`);
    //         return res.status(500).send(error);
    //       });
    //         console.log("[info]: Sync product NoSQL completed.");
    //         return res.status(200).send({
    //           message: "Sync product NoSQL success",
    //         });
    //       })
    //       .catch((error) => {
    //         console.error(`[error]: Error on sync product NoSQL. ${error}`);
    //         return res.status(500).send(error);
    //       });
    //     break;
    // }
  };

  /**
   * Reset stock in data
   * @param req
   * @param res
   */
  static syncProductIn = async (req: Request, res: Response) => {
    prisma
      .$queryRawUnsafe<any[]>(
        `SELECT adjustment_case_code.company_id AS companyID, adjustment_case.id AS adjustmentCaseID, adjustment_case_code.id AS adjustmentCaseCodeID, 
        NULL AS goodReceiptID, NULL AS goodReceiptCodeID,
        adjustment_case_code.date, (adjustment_case.price / COALESCE(item_unit.conversion, 1)) AS price, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) AS quantity, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) AS residue, adjustment_case.item_id AS itemID, 
        adjustment_case_code.created_at,
        NULL AS supplier_id
        FROM adjustment_case
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
        LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
        WHERE adjustment_case_code.is_delete = 0
        AND adjustment_case.quantity > 0
        UNION ALL 
        SELECT good_receipt_code.company_id AS companyID, NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID, 
        good_receipt.id AS goodReceiptID, good_receipt_code.id AS goodReceiptCodeID,
        good_receipt_code.date, IF(total.value = 0, 0, 
        (good_receipt.price - good_receipt.discount) * (total.value - purchase_invoice.discount) / (total.value * COALESCE(item_unit.conversion, 1))) AS price, 
        good_receipt.quantity * COALESCE(item_unit.conversion, 1) AS quantity, good_receipt.quantity * COALESCE(item_unit.conversion, 1) AS residue,
        good_receipt.item_id AS itemID,
        good_receipt_code.created_at,
        good_receipt_code.supplier_id AS supplier_id
        FROM good_receipt
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
        JOIN purchase_invoice ON good_receipt_code.id = purchase_invoice.good_receipt_code_id
        LEFT JOIN item_unit ON good_receipt.item_unit_id = item_unit.id
        JOIN (
          SELECT SUM(good_receipt.quantity * (good_receipt.price - good_receipt.discount)) AS value, good_receipt.good_receipt_code_id
            FROM good_receipt
            GROUP BY good_receipt_code_id
        ) AS total
        ON good_receipt_code.id = total.good_receipt_code_id
        WHERE purchase_invoice.is_delete = 0
        AND good_receipt_code.is_delete = 0`
      )
      .then(async (result) => {
        return res.status(200).send({
          message: "Stock in sync success",
        });
      });
  };

  /**
   * Reset stock out data
   * @param req
   * @param res
   */
  static syncProductOutCalculation = async (req: Request, res: Response) => {
    const stockOuts = await prisma.$queryRawUnsafe<any[]>(
      `
        SELECT * FROM 
        (
          # Adjustment case
          SELECT 
          NULL AS billID, NULL as billCodeID,
          adjustment_case.id AS adjustmentCaseID, adjustment_case_code.id AS adjustmentCaseCodeID,
          adjustment_case_code.date, adjustment_case.quantity * COALESCE(item_unit.conversion, 1) * -1 AS quantity,
          adjustment_case.item_id AS itemID,
          0 AS value
          FROM adjustment_case
          JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
          LEFT JOIN item_unit ON adjustment_case.item_unit_id = item_unit.id
          WHERE adjustment_case_code.is_delete = 0
          AND adjustment_case.quantity < 0
          UNION ALL
          # Bill
          SELECT 
          bill.id AS billID, bill_code.id as billCodeID,
          NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
          bill_code.date, (bill.quantity - COALESCE(sr.quantity, 0)) * COALESCE(item_unit.conversion, 1) AS quantity,
          bill.item_id AS itemID,
          IF(total.value = 0, 0, (bill.price - bill.discount) * (total.value + bill_code.service + bill_code.delivery - bill_code.discount) / (total.value * COALESCE(item_unit.conversion, 1))) AS value
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
          ) AS sr
          ON sr.bill_id = bill.id
          JOIN (
            SELECT SUM((bill.price - bill.discount) * (bill.quantity - COALESCE(sra.quantity, 0))) AS value, bill.bill_code_id
              FROM bill
            LEFT JOIN (
              SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
              FROM sales_return
              JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
              WHERE sales_return_code.is_delete = 0
              GROUP BY sales_return.bill_id
            )  AS sra
            ON bill.id = sra.bill_id
              GROUP BY bill.bill_code_id
          ) AS total
          ON bill_code.id = total.bill_code_id
          WHERE bill_code.is_delete = 0
          AND bill.item_id IS NOT NULL
          UNION ALL
          # Bill with package
          SELECT 
          bill.id AS billID, bill_code.id as billCodeID,
          NULL AS adjustmentCaseID, NULL AS adjustmentCaseCodeID,
          bill_code.date, (package_content.quantity * bill.quantity - COALESCE(sr.quantity, 0)) * COALESCE(item_unit.conversion, 1) AS quantity,
          package_content.item_id AS itemID,
          IF(total.value = 0, 0, IF(pv.value = 0, 0, ((package_content.price - package_content.discount) / pv.value) * (bill.price - bill.discount) * (total.value + bill_code.service + bill_code.delivery - bill_code.discount) / (total.value * COALESCE(item_unit.conversion, 1)))) AS value
          FROM bill
          JOIN bill_code ON bill.bill_code_id = bill_code.id
          JOIN package_code ON bill.package_code_id = package_code.id
          JOIN package_content ON package_code.id = package_content.package_code_id
          JOIN item ON package_content.item_id = item.id
          LEFT JOIN item_unit ON bill.item_unit_id = item_unit.id
          LEFT JOIN (
          SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
          ) AS sr
          ON sr.bill_id = bill.id
          JOIN (
          SELECT SUM((bill.price - bill.discount) * (bill.quantity - COALESCE(sra.quantity, 0))) AS value, bill.bill_code_id
            FROM bill
          LEFT JOIN (
            SELECT SUM(sales_return.quantity) AS quantity, sales_return.bill_id
            FROM sales_return
            JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
            WHERE sales_return_code.is_delete = 0
            GROUP BY sales_return.bill_id
          )  AS sra
          ON bill.id = sra.bill_id
            GROUP BY bill.bill_code_id
          ) AS total
          ON bill_code.id = total.bill_code_id
          JOIN (
          SELECT SUM(package_content.quantity * (package_content.price - package_content.discount)) AS value, package_content.package_code_id
          FROM package_content
          GROUP BY package_code_id
          ) AS pv
          ON package_code.id = pv.package_code_id
          WHERE bill_code.is_delete = 0
        ) AS a
        ORDER BY a.date ASC
      `
    );

    // for (let i = 0; i < stockOuts.length; i++) {
    //   // Create loading bar in console log
    //   const progress = Math.round((i / stockOuts.length) * 100);
    //   const loadingBar = new Array(Math.round(progress / 10)).fill("=");
    //   console.info(
    //     `Stock out sync progress: ${loadingBar.join("")} ${progress}% ${i}/${
    //       stockOuts.length
    //     }`
    //   );

    return res.status(200).send({
      message: "Stock out sync success",
    });
  };
}

export default SearchHelper;
