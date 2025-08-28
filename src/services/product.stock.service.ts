import { AdjustmentCaseRepository } from "../repositories/adjustment-case.repository";
import { GoodReceiptRepository } from "../repositories/good-receipt.repository";
import { ProductStockRepository } from "../repositories/product-stock.repository";
import { ProductRepository } from "../repositories/product.repository";
import { SalesInvoiceRepository } from "../repositories/sales-invoice.repository";
import { SalesReturnRepository } from "../repositories/sales-return.repository";

export class ProductStockService {
  private productStockRepository: ProductStockRepository;
  private goodReceiptRepository: GoodReceiptRepository;
  private adjustmentCaseRepository: AdjustmentCaseRepository;
  private salesInvoiceRepository: SalesInvoiceRepository;
  private saleReturnRepository: SalesReturnRepository;
  private productRepository: ProductRepository;

  constructor(
    productStockRepository: ProductStockRepository,
    goodReceiptRepository: GoodReceiptRepository,
    adjustmentCaseRepository: AdjustmentCaseRepository,
    salesInvoiceRepository: SalesInvoiceRepository,
    saleReturnRepository: SalesReturnRepository,
    productRepository: ProductRepository
  ) {
    this.productStockRepository = productStockRepository;
    this.goodReceiptRepository = goodReceiptRepository;
    this.adjustmentCaseRepository = adjustmentCaseRepository;
    this.salesInvoiceRepository = salesInvoiceRepository;
    this.saleReturnRepository = saleReturnRepository;
    this.productRepository = productRepository;
  }

  updateProductStock = async () => {
    console.info(`Fetching product data`);
    const products = await this.productRepository.fetchAll();
    const goodReceipts = await this.goodReceiptRepository.updateProductStock();
    const adjustmentCases =
      await this.adjustmentCaseRepository.updateProductStock();
    const salesInvoices =
      await this.salesInvoiceRepository.updateProductStock();
    const salesReturns = await this.saleReturnRepository.updateProductStock();

    console.info(`Product data obtained`);
    const updateProduct = products.map((product) => {
      const goodReceiptIndex = goodReceipts.findIndex(
        (gr) => gr.product_id === product.id
      );
      const adjustmentCaseIndex = adjustmentCases.findIndex(
        (ac) => ac.product_id === product.id
      );
      const salesInvoiceIndex = salesInvoices.findIndex(
        (si) => si.product_id === product.id
      );
      const salesReturnIndex = salesReturns.findIndex(
        (sr) => sr.product_id === product.id
      );

      const goodReceiptQuantity =
        goodReceiptIndex !== -1 ? goodReceipts[goodReceiptIndex].quantity : 0;
      const adjustmentCaseQuantity =
        adjustmentCaseIndex !== -1
          ? adjustmentCases[adjustmentCaseIndex].quantity
          : 0;
      const salesInvoiceQuantity =
        salesInvoiceIndex !== -1
          ? salesInvoices[salesInvoiceIndex].quantity
          : 0;
      const salesReturnQuantity =
        salesReturnIndex !== -1 ? salesReturns[salesReturnIndex].quantity : 0;
      return {
        id: product.id,
        stock:
          goodReceiptQuantity +
          adjustmentCaseQuantity -
          salesInvoiceQuantity +
          salesReturnQuantity,
      };
    });
    console.info(`Updating ${updateProduct.length} data`);

    await this.productStockRepository.updateMany(
      updateProduct.map((x) => {
        return {
          productID: x.id!,
          quantity: x.stock,
        };
      })
    );

    console.info(`Updated product stock`);
  };
}
