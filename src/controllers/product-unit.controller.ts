import { Request, Response } from "express";
import { ProductUnitRepository } from "../repositories/product-unit.repository";
import { ProductRepository } from "../repositories/product.repository";
import ErrorList from "../constants/error-list.constant";
import { queue } from "../utils/queue.helper";

/**
 * Satuan tambahan sebuah barang — tambah bebas, ubah terkunci.
 *
 * Aturannya tiga, dan ketiganya berpangkal pada satu fakta: dokumen lama
 * tidak menyimpan hasil konversinya sendiri, hanya menunjuk satuan.
 *
 *   1. TAMBAH selalu boleh — satuan baru belum ditunjuk siapa pun.
 *   2. UBAH nama selalu boleh; conversion hanya selama satuannya belum
 *      pernah dipakai. Sesudah itu terkunci selamanya — mengubahnya
 *      menggeser seluruh riwayat stok dan HPP tanpa jejak.
 *   3. HAPUS sungguhan hanya untuk yang belum terpakai; yang sudah,
 *      dinonaktifkan supaya riwayatnya tetap utuh.
 */
export class ProductUnitController {
  private productUnitRepository: ProductUnitRepository;
  private productRepository: ProductRepository;

  constructor(
    productUnitRepository: ProductUnitRepository,
    productRepository: ProductRepository
  ) {
    this.productUnitRepository = productUnitRepository;
    this.productRepository = productRepository;
  }

  /** Daftar satuan sebuah barang, dengan penanda terpakai per baris. */
  fetchByProduct = async (req: Request, res: Response) => {
    const productID = Number(req.params.id);

    try {
      const product = await this.productRepository.fetchByID(productID);
      if (!product || product.is_delete) {
        return res.status(404).send(ErrorList["Product not found"]);
      }

      const units = await this.productUnitRepository.fetchByItemID(productID);
      const hasil = [];
      for (const unit of units) {
        if (unit.is_delete) continue;
        hasil.push({
          ...unit,
          dipakai: await this.productUnitRepository.terpakai(unit.id!),
        });
      }

      return res.status(200).send(hasil);
    } catch (error) {
      console.error(`[error]: Error on fetching product units ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  create = async (req: Request, res: Response) => {
    const productID = Number(req.params.id);

    try {
      const product = await this.productRepository.fetchByID(productID);
      if (!product || product.is_delete) {
        return res.status(404).send(ErrorList["Product not found"]);
      }

      const result = await this.productUnitRepository.createOne({
        product_id: productID,
        unit: req.body.unit,
        conversion: req.body.conversion,
        sales_price: req.body.sales_price ?? 0,
        sales_discount: req.body.sales_discount ?? 0,
        purchase_price: req.body.purchase_price ?? 0,
        purchase_discount: req.body.purchase_discount ?? 0,
        created_by: req.body.userId,
        created_at: new Date(),
      });

      /* Meilisearch menyimpan satuan barang; indeksnya ikut diperbarui. */
      await queue.add("product-updated", { id: productID });

      return res.status(201).send(result);
    } catch (error) {
      console.error(`[error]: Error on creating product unit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  update = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    try {
      const unit = await this.productUnitRepository.fetchByID(id);
      if (!unit || unit.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const dipakai = await this.productUnitRepository.terpakai(id);
      const konversiBerubah =
        req.body.conversion !== undefined &&
        Number(req.body.conversion) !== Number(unit.conversion);

      /*
        409, bukan 400: permintaannya sah, keadaan satuannya saja yang
        sudah mengunci. Nama tetap boleh diganti kapan pun — ia hanya
        label, tidak ikut dihitung apa pun.
      */
      if (dipakai && konversiBerubah) {
        return res.status(409).send(ErrorList["No changes"]);
      }

      const result = await this.productUnitRepository.update(id, {
        unit: req.body.unit,
        conversion: konversiBerubah ? Number(req.body.conversion) : undefined,
      });

      await queue.add("product-updated", { id: unit.product_id });

      return res.status(200).send(result);
    } catch (error) {
      console.error(`[error]: Error on updating product unit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  delete = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const userID = req.body.userId;

    try {
      const unit = await this.productUnitRepository.fetchByID(id);
      if (!unit || unit.is_delete) {
        return res.status(404).send(ErrorList["Not found"]);
      }

      const dipakai = await this.productUnitRepository.terpakai(id);
      if (dipakai) {
        await this.productUnitRepository.deactivate(id, userID);
      } else {
        await this.productUnitRepository.hardDelete(id);
      }

      await queue.add("product-updated", { id: unit.product_id });

      /* Pemanggil diberi tahu jalannya: hilang sungguhan atau nonaktif. */
      return res.status(200).send({ id: id, deactivated: dipakai });
    } catch (error) {
      console.error(`[error]: Error on deleting product unit ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };
}

export default ProductUnitController;
