import { ProductStockService } from "../../src/services/product.stock.service";

/**
 * Hitung ulang stok menyeluruh harus MENIMPA, bukan menambah.
 *
 * Cacat aslinya: updateProductStock menghitung stok yang seharusnya menurut
 * seluruh dokumen, lalu menyerahkannya ke updateMany yang memakai `increment`.
 * Pada basis data yang product_stock-nya sudah berisi — yaitu setiap basis
 * data yang pernah dipakai — hasilnya melipatduakan stok tiap barang, tanpa
 * satu pun galat, dan hanya ketahuan bila ada yang menghitung fisiknya.
 */
describe("ProductStockService.updateProductStock", () => {
  const layanan = () => {
    const productStock = {
      replaceMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue([]),
    };
    const service = new ProductStockService(
      productStock as never,
      { updateProductStock: jest.fn().mockResolvedValue([]) } as never,
      { updateProductStock: jest.fn().mockResolvedValue([]) } as never,
      { updateProductStock: jest.fn().mockResolvedValue([]) } as never,
      { updateProductStock: jest.fn().mockResolvedValue([]) } as never,
      { fetchAll: jest.fn().mockResolvedValue([{ id: 1 }]) } as never
    );
    return { service, productStock };
  };

  it("memakai replaceMany, bukan updateMany", async () => {
    const { service, productStock } = layanan();

    await service.updateProductStock();

    expect(productStock.replaceMany).toHaveBeenCalledTimes(1);
    /* Yang menambah, bukan menimpa — dan itu yang dulu melipatduakan stok. */
    expect(productStock.updateMany).not.toHaveBeenCalled();
  });

  it("menghitung stok dari selisih dokumen", async () => {
    const productStock = {
      replaceMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    };
    const service = new ProductStockService(
      productStock as never,
      {
        updateProductStock: jest
          .fn()
          .mockResolvedValue([{ product_id: 1, quantity: 100 }]),
      } as never,
      {
        updateProductStock: jest
          .fn()
          .mockResolvedValue([{ product_id: 1, quantity: 5 }]),
      } as never,
      {
        updateProductStock: jest
          .fn()
          .mockResolvedValue([{ product_id: 1, quantity: 30 }]),
      } as never,
      {
        updateProductStock: jest
          .fn()
          .mockResolvedValue([{ product_id: 1, quantity: 2 }]),
      } as never,
      { fetchAll: jest.fn().mockResolvedValue([{ id: 1 }]) } as never
    );

    await service.updateProductStock();

    /* terima 100 + temuan 5 - jual 30 + retur 2 = 77 */
    expect(productStock.replaceMany).toHaveBeenCalledWith([
      { productID: 1, quantity: 77 },
    ]);
  });
});
