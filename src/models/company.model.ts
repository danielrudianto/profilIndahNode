import { ICompany } from "../interfaces/company.interface";
import { UserViewModel } from "./user.model";

export class CompanyModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  created_by: number;
  is_delete?: boolean = false;
  can_delete?: boolean;
  created_at?: Date;
  updated_by?: number;
  updated_at?: Date;
  deleted_by?: number;
  deleted_at?: Date;

  user_company_deleted_byTouser?: UserViewModel;

  constructor(data: ICompany) {
    this.name = data.name;
    this.address = data.address;
    this.npwp = data.npwp;
    this.created_by = data.created_by;
    this.is_delete = data.is_delete || false;
    this.can_delete = data.can_delete;
    // Sebelumnya ditulis `new Date()`, sehingga nilai yang dikirim pemanggil
    // selalu dibuang dan setiap perusahaan tampak dibuat pada detik permintaan
    // HTTP berlangsung — pengurutan dan penyaringan berdasarkan tanggal jadi
    // tidak berarti. Seluruh pemanggil di company.repository.ts memang sudah
    // mengirim created_at, jadi nilainya tinggal dipakai.
    this.created_at = data.created_at;
    this.updated_by = data.updated_by;
    this.updated_at = data.updated_at;
    this.deleted_by = data.deleted_by;
    this.deleted_at = data.deleted_at;

    this.user_company_deleted_byTouser = data.user_company_deleted_byTouser;

    if (data.id) {
      this.id = data.id;
    }
  }

  /**
   * Bentuk model dari satu baris basis data.
   *
   * `id`, `can_delete`, dan `user_company_deleted_byTouser` sebelumnya tidak
   * ikut dikirim ke konstruktor walau ketiganya diterima di sana. Akibat yang
   * paling terasa dari `id`: setiap perusahaan sampai ke frontend tanpa kunci
   * apa pun, sehingga tombol ubah dan hapus tidak punya acuan baris mana yang
   * dimaksud. `can_delete` sudah dihitung repository lalu terbuang, dan nama
   * penghapus tidak pernah bisa ditampilkan — hanya nomornya.
   */
  static fromMap(data: any) {
    return new CompanyModel({
      id: data.id,
      name: data.name,
      address: data.address,
      npwp: data.npwp,
      created_by: data.created_by,
      created_at: data.created_at,
      is_delete: data.is_delete,
      can_delete: data.can_delete,
      updated_by: data.updated_by,
      updated_at: data.updated_at,
      deleted_by: data.deleted_by,
      deleted_at: data.deleted_at,
      user_company_deleted_byTouser: data.user_company_deleted_byTouser,
    });
  }
}
