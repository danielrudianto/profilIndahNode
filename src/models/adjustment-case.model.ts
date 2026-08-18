import {
  IAdjustmentCaseCode,
  IAdjustmentCase,
} from "../interfaces/adjustment-case.interface";
import { prisma } from "../utils/database.helper";
import { UserViewModel } from "./user.model";
import { ProductModel } from "./product.model";
import { ProductUnitViewModel } from "./product-unit.model";
import { CompanyModel } from "./company.model";

class AdjustmentCaseModel {
  id?: number;
  name: string;
  date: Date;
  created_by?: number;
  created_at?: Date;
  is_confirm?: boolean;
  is_delete?: boolean;
  confirmed_by?: number | null;
  // Boleh null: dokumen yang belum dikonfirmasi memang tidak punya tanggal
  // konfirmasi, dan kolomnya nullable di basis data. Antarmuka
  // IAdjustmentCaseCode sudah mengakuinya; kelas ini sebelumnya tidak, dan
  // ketidakcocokan itu tertutup karena bidangnya selalu ditimpa new Date().
  confirmed_at?: Date | null;
  company_id: number | null;
  adjustment_case: IAdjustmentCase[];

  user_adjustment_case_code_created_byTouser?: UserViewModel;
  company?: CompanyModel | null;

  constructor(data: IAdjustmentCaseCode) {
    this.id = data.id;
    this.name = data.name;
    this.date = data.date;
    this.created_by = data.created_by;
    this.created_at = data.created_at;
    this.is_confirm = data.is_confirm;
    this.is_delete = data.is_delete;
    // Sebelumnya keduanya ditulis sebagai nilai tetap — `null` dan
    // `new Date()` — sehingga nilai yang dikirim fromMap selalu dibuang.
    // Akibatnya siapa yang menyetujui penyesuaian stok tidak pernah bisa
    // ditampilkan, dan tanggal konfirmasi selalu jam permintaan berlangsung,
    // bahkan untuk dokumen yang justru BELUM dikonfirmasi. Penyesuaian stok
    // mengubah nilai persediaan tanpa transaksi jual-beli, jadi jejak
    // persetujuannya adalah satu-satunya pengendalian atas dokumen itu.
    this.confirmed_by = data.confirmed_by ?? null;
    this.confirmed_at = data.confirmed_at;
    this.company_id = data.company_id;
    this.adjustment_case = data.adjustment_case || [];
    this.user_adjustment_case_code_created_byTouser =
      data.user_adjustment_case_code_created_byTouser;
    this.company = data.company;
  }

  static fromMap(data: any): AdjustmentCaseModel {
    return new AdjustmentCaseModel({
      id: data.id,
      name: data.name,
      date: data.date,
      created_by: data.created_by,
      created_at: data.created_at,
      is_confirm: data.is_confirm,
      is_delete: data.is_delete,
      confirmed_by: data.confirmed_by,
      confirmed_at: data.confirmed_at,
      company_id: data.company_id,
      company:
        data.company == undefined
          ? undefined
          : data.company == null
            ? null
            : CompanyModel.fromMap(data.company),
      adjustment_case:
        data.adjustment_case == undefined
          ? undefined
          : data.adjustment_case.map((ac: any) => ({
              id: ac.id,
              product_id: ac.product_id,
              product_unit_id: ac.product_unit_id,
              quantity: Number(ac.quantity),
              product: new ProductModel({
                id: ac.product.id,
                reference: ac.product.reference,
                description: ac.product.description,
                unit: ac.product.unit,
                product_brand_id: ac.product.product_brand_id,
                product_type_id: ac.product.product_type_id,
              }),
              product_unit:
                ac.product_unit == null
                  ? null
                  : new ProductUnitViewModel({
                      product_id: ac.product_id,
                      unit: ac.product_unit.unit,
                      conversion: Number(ac.product_unit.conversion),
                    }),
            })),
      user_adjustment_case_code_created_byTouser:
        data.user_adjustment_case_code_created_byTouser == null ||
        data.user_adjustment_case_code_created_byTouser == undefined
          ? undefined
          : UserViewModel.fromMap(
              data.user_adjustment_case_code_created_byTouser
            ),
    });
  }
}

export default AdjustmentCaseModel;
