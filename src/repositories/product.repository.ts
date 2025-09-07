import { PrismaClient } from "@prisma/client";
import { IPriceProduct, IProduct, ProductModel } from "../model/product.model";
import { ProductBrandViewModel } from "../model/product-brand.model";
import { ProductTypeViewModel } from "../model/product-type.model";
import { IFetchCommon, IFetchCommonResult } from "../interface/fetch.interface";
import { queue } from "../helper/queue.helper";

export class ProductRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async create(data: IProduct): Promise<ProductModel> {
    try {
      const result = await this.prisma.product.create({
        data: {
          reference: data.reference,
          description: data.description,
          product_brand_id: data.product_brand_id,
          product_type_id: data.product_type_id,
          created_by: data.created_by!,
          created_at: data.created_at,
          unit: data.unit,
          sales_price: data.sales_price,
          purchase_price: data.purchase_price,
          sales_discount: data.sales_discount,
          purchase_discount: data.purchase_discount,
          minimum_stock: data.minimum_stock,
        },
      });

      return new ProductModel({
        id: result.id,
        reference: result.reference,
        description: result.description,
        product_brand_id: result.product_brand_id,
        product_type_id: result.product_type_id,
        created_by: result.created_by,
        created_at: result.created_at,
        unit: result.unit,
      });
    } catch (error) {
      throw error;
    }
  }

  async updateSalesPrice(data: IPriceProduct[]): Promise<void> {
    try {
      const updateData = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.product_unit_id != null) {
          updateData.push(
            this.prisma.product_unit.update({
              data: {
                sales_price: item.price,
                sales_discount: item.discount,
              },
              where: {
                id: item.product_unit_id,
              },
            })
          );
        } else {
          updateData.push(
            this.prisma.product.update({
              data: {
                sales_price: item.price,
                sales_discount: item.discount,
              },
              where: {
                id: item.product_id,
              },
            })
          );
        }
      }

      // prisma transaction
      const result = await this.prisma.$transaction(updateData);
    } catch (error) {
      throw error;
    }
  }

  async updatePurchasePrice(data: IPriceProduct[]): Promise<void> {
    try {
      const updateData = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item.product_unit_id != null) {
          updateData.push(
            this.prisma.product_unit.update({
              data: {
                purchase_price: item.price,
                purchase_discount: item.discount,
              },
              where: {
                id: item.product_unit_id,
              },
            })
          );
        } else {
          updateData.push(
            this.prisma.product.update({
              data: {
                purchase_price: item.price,
                purchase_discount: item.discount,
              },
              where: {
                id: item.product_id,
              },
            })
          );
        }
      }

      // prisma transaction
      await this.prisma.$transaction(updateData);
    } catch (error) {
      throw error;
    }
  }

  async update(data: IProduct): Promise<ProductModel> {
    try {
      const result = await this.prisma.product.update({
        where: { id: data.id },
        data: {
          reference: data.reference,
          description: data.description,
          product_brand_id: data.product_brand_id,
          product_type_id: data.product_type_id,
          created_by: data.created_by!,
          created_at: data.created_at,
          unit: data.unit,
          sales_price: data.sales_price,
          purchase_price: data.purchase_price,
          sales_discount: data.sales_discount,
          purchase_discount: data.purchase_discount,
          minimum_stock: data.minimum_stock,
        },
        include: {
          product_brand: true,
          product_type: true,
        },
      });

      return ProductModel.fromMap(result);
    } catch (error) {
      console.error(`[error]: Error while updating product: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async toggleActive(
    productID: number,
    currentStatus: boolean
  ): Promise<ProductModel> {
    try {
      const result = await this.prisma.product.update({
        where: {
          id: productID,
        },
        data: {
          is_active: !currentStatus,
        },
      });

      await queue.add("product-updated", {
        id: productID,
      });

      return ProductModel.fromMap(result);
    } catch (error) {
      console.error(
        `[error]: Error while toggling product active status: ${error}`
      );
      throw new Error("Internal server error");
    }
  }

  async fetchByID(productID: number): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.findUnique({
        where: {
          id: productID,
        },
        include: {
          product_brand: true,
          product_type: true,
          product_unit: true,
        },
      });

      if (!result) return null;

      return ProductModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async fetchByIDs(productIDs: number[]): Promise<ProductModel[]> {
    try {
      const result = await this.prisma.product.findMany({
        where: {
          id: {
            in: productIDs,
          },
        },
        include: {
          product_brand: true,
          product_type: true,
        },
      });

      return result.map((x) => {
        return ProductModel.fromMap(x);
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchAutocomplete(keyword: string) {
    try {
      const result = await this.prisma.product.findMany({
        select: {
          id: true,
          reference: true,
        },
        where: {
          is_active: true,
          OR: [
            { reference: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        },
      });

      return result.map((item) => {
        return {
          id: item.id,
          name: item.reference,
        };
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchByReference(reference: string): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.findFirst({
        where: { reference },
      });

      if (!result) return null;

      return new ProductModel({
        id: result.id,
        reference: result.reference,
        description: result.description,
        product_brand_id: result.product_brand_id,
        product_type_id: result.product_type_id,
        created_by: result.created_by,
        created_at: result.created_at,
        unit: result.unit,
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchSales(
    data: IFetchCommon
  ): Promise<IFetchCommonResult<ProductModel>> {
    try {
      const [result, count] = await Promise.all([
        this.prisma.product.findMany({
          where: {
            OR: [
              {
                reference: {
                  contains: data.keyword,
                },
              },
              {
                description: {
                  contains: data.keyword,
                },
              },
            ],
            is_delete: false,
          },
          include: {
            product_type: true,
            product_brand: true,
          },
          take: data.pageSize,
          skip: (data.page - 1) * data.pageSize,
        }),
        this.prisma.product.count({
          where: {
            OR: [
              {
                reference: {
                  contains: data.keyword,
                },
              },
              {
                description: {
                  contains: data.keyword,
                },
              },
            ],
            is_delete: false,
          },
        }),
      ]);

      return {
        data: result.map((x) => {
          return ProductModel.fromMap(x);
        }),
        count: count,
      };
    } catch (error) {
      throw error;
    }
  }

  async fetchSalesPriceByID(id: number): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.findUnique({
        where: {
          id: id,
        },
        include: {
          product_brand: true,
          product_type: true,
          product_unit: true,
        },
      });

      if (!result) {
        return null;
      }

      return ProductModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async fetchPromotion(data: {
    brands: number[];
    startsWith: string[];
    endsWith: string[];
    contains: string[];
    doesNotStartWith: string[];
    doesNotEndWith: string[];
    doesNotContain: string[];
  }): Promise<number[]> {
    const filter: any[] = [];

    try {
      const productIDs = await this.prisma.product.findMany({
        where: {
          product_brand_id: {
            in: data.brands,
          },
          AND: [
            data.startsWith.length > 0
              ? {
                  OR: data.startsWith.map((x) => ({
                    reference: {
                      startsWith: x,
                    },
                  })),
                }
              : {},
            data.endsWith.length > 0
              ? {
                  OR: data.endsWith.map((x) => ({
                    reference: {
                      endsWith: x,
                    },
                  })),
                }
              : {},
            data.contains.length > 0
              ? {
                  OR: data.contains.map((x) => ({
                    reference: {
                      contains: x,
                    },
                  })),
                }
              : {},
            data.doesNotStartWith.length > 0
              ? {
                  NOT: {
                    OR: data.doesNotStartWith.map((x) => ({
                      reference: {
                        startsWith: x,
                      },
                    })),
                  },
                }
              : {},
            data.doesNotEndWith.length > 0
              ? {
                  NOT: {
                    OR: data.doesNotEndWith.map((x) => ({
                      reference: {
                        endsWith: x,
                      },
                    })),
                  },
                }
              : {},
            data.doesNotContain.length > 0
              ? {
                  NOT: {
                    OR: data.doesNotContain.map((x) => ({
                      reference: {
                        contains: x,
                      },
                    })),
                  },
                }
              : {},
          ],
        },
        select: {
          id: true,
        },
      });

      return productIDs.map((x) => {
        return x.id;
      });
    } catch (error) {
      throw error;
    }
  }

  async fetchOutputReport(data: {
    brand: number[];
    type: number[];
    group: "brand" | "type";
    month: number;
    year: number;
  }) {
    try {
      const [result, brands, types] = await this.prisma.$transaction([
        this.prisma.$queryRawUnsafe<any[]>(
          `
            SELECT 
              product.id, 
              product.reference, 
              product.description, 
              product_brand.name AS product_brand_name,
              product_type.name AS product_type_name, 
              product.unit, 
              product.product_brand_id, 
              product.product_type_id,
              COALESCE(goodReceiptCount.quantity, 0) AS goodReceiptQuantity,
              COALESCE(adjustmentCountPlus.quantity, 0) AS adjustmentQuantityPlus,
              COALESCE(adjustmentCountMinus.quantity, 0) AS adjustmentQuantityMinus,
              COALESCE(salesInvoiceCount.quantity, 0) AS salesInvoiceQuantity,
              COALESCE(salesReturnCount.quantity, 0) AS salesReturnQuantity
            FROM product
            JOIN product_brand ON product.product_brand_id = product_brand.id
            JOIN product_type ON product.product_type_id = product_type.id
            
            LEFT JOIN (
              SELECT SUM(good_receipt.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, 
                    good_receipt.product_id
              FROM good_receipt
              JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
              LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
              WHERE good_receipt_code.is_delete = 0
              AND MONTH(good_receipt_code.date) = ${data.month} 
              AND YEAR(good_receipt_code.date) = ${data.year}
              GROUP BY good_receipt.product_id
            ) AS goodReceiptCount ON product.id = goodReceiptCount.product_id
            
            LEFT JOIN (
              SELECT SUM(adjustment_case.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, 
                    adjustment_case.product_id
              FROM adjustment_case
              JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
              LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
              WHERE adjustment_case_code.is_delete = 0
              AND MONTH(adjustment_case_code.date) = ${data.month} 
              AND YEAR(adjustment_case_code.date) = ${data.year}
              AND adjustment_case.quantity > 0
              GROUP BY adjustment_case.product_id
            ) AS adjustmentCountPlus ON product.id = adjustmentCountPlus.product_id
            
            LEFT JOIN (
              SELECT SUM(adjustment_case.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, 
                    adjustment_case.product_id
              FROM adjustment_case
              JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
              LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
              WHERE adjustment_case_code.is_delete = 0
              AND MONTH(adjustment_case_code.date) = ${data.month} 
              AND YEAR(adjustment_case_code.date) = ${data.year}
              AND adjustment_case.quantity < 0
              GROUP BY adjustment_case.product_id
            ) AS adjustmentCountMinus ON product.id = adjustmentCountMinus.product_id
            
            LEFT JOIN (
              SELECT SUM(sales_invoice.quantity * COALESCE(product_unit.conversion, 1)) * -1 AS quantity, 
                    sales_invoice.product_id
              FROM sales_invoice
              LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
              JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
              WHERE sales_invoice_code.is_delete = 0
              AND MONTH(sales_invoice_code.date) = ${data.month} 
              AND YEAR(sales_invoice_code.date) = ${data.year}
              GROUP BY sales_invoice.product_id
            ) AS salesInvoiceCount ON product.id = salesInvoiceCount.product_id
            
            LEFT JOIN (
              SELECT SUM(sales_return.quantity * COALESCE(product_unit.conversion, 1)) AS quantity, 
                    sales_invoice.product_id
              FROM sales_return
              JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
              JOIN sales_invoice ON sales_return.sales_invoice_id = sales_invoice.id
              LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
              WHERE sales_return_code.is_delete = 0
              AND MONTH(sales_return_code.date) = ${data.month} 
              AND YEAR(sales_return_code.date) = ${data.year}
              GROUP BY sales_invoice.product_id
            ) AS salesReturnCount ON product.id = salesReturnCount.product_id
            
            WHERE product_brand.id IN (${data.brand.join(",")}) 
            AND product_type.id IN (${data.type.join(",")})
            AND product.is_delete = 0
          `
        ),
        this.prisma.product_brand.findMany({
          where: {
            id: {
              in: data.brand,
            },
          },
        }),
        this.prisma.product_type.findMany({
          where: {
            id: {
              in: data.type,
            },
          },
        }),
      ]);

      return {
        data: result.map((x) => {
          return {
            id: x.id,
            reference: x.reference,
            description: x.description,
            unit: x.unit,
            product_brand: {
              id: x.product_brand_id,
              name: x.product_brand_name,
            },
            product_type: {
              id: x.product_type_id,
              name: x.product_type_name,
            },
            report: {
              good_receipt: Number(x.goodReceiptQuantity),
              adjustment_case_found: Number(x.adjustmentQuantityPlus),
              adjustment_case_lost: Number(x.adjustmentQuantityMinus),
              sales_return: Number(x.salesReturnQuantity),
              sales_invoice: Number(x.salesInvoiceQuantity),
            },
          };
        }),
        brands: brands.map((x) => {
          return ProductBrandViewModel.fromMap(x);
        }),
        types: types.map((x) => {
          return ProductTypeViewModel.fromMap(x);
        }),
      };
    } catch (error) {
      throw error;
    }
  }

  async delete(
    productID: number,
    userID: number
  ): Promise<ProductModel | null> {
    try {
      const result = await this.prisma.product.update({
        where: { id: productID },
        data: { is_delete: true, deleted_at: new Date(), deleted_by: userID },
        include: {
          product_brand: true,
          product_type: true,
        },
      });

      if (!result) {
        return null;
      }

      return ProductModel.fromMap(result);
    } catch (error) {
      throw error;
    }
  }

  async fetchAll(): Promise<ProductModel[]> {
    try {
      const results = await this.prisma.product.findMany({
        include: {
          product_brand: true,
          product_type: true,
          product_unit: true,
        },
      });

      return results.map((item) => ProductModel.fromMap(item));
    } catch (error) {
      throw error;
    }
  }
}
