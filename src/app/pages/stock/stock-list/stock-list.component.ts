import { Component, OnInit } from '@angular/core';
import { NgIf, NgFor, NgClass, DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';

import { ListPageComponent } from 'src/app/components/list-page/list-page.component';
import { AlertService } from 'src/app/services/alert.service';
import { ApiService } from 'src/app/services/api.service';
import { StockListReportComponent } from '../stock-list-report/stock-list-report.component';
import { TabelKosongComponent } from 'src/app/components/tabel-kosong/tabel-kosong.component';

/**
 * Daftar stok.
 *
 * KEADAANNYA HIDUP DI QUERY PARAM, bukan di dalam komponen ini. Itu bukan
 * kerumitan yang tersisa dari versi lama, melainkan yang membuat kartu stok
 * bisa ditutup dan pengguna kembali ke halaman, kata kunci, dan nomor halaman
 * yang sama persis. Maka setiap perubahan pencarian atau halaman menavigasi
 * lebih dulu, dan pengambilan datanya dipicu oleh queryParams — bukan
 * dipanggil langsung dari penanganan tombolnya.
 */
@Component({
  selector: 'app-stock-list',
  templateUrl: './stock-list.component.html',
  styleUrls: ['./stock-list.component.scss'],
  imports: [
    TabelKosongComponent,
    ListPageComponent,
    NgIf,
    NgFor,
    NgClass,
    DecimalPipe,
    TranslatePipe,
  ],
})
export class StockListComponent implements OnInit {
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private apiService: ApiService,
    private alertService: AlertService,
  ) {}

  isLoading: boolean = true;
  dataSource: any[] = [];
  dataCount: number = 0;
  page: number = 1;
  pageSize: number = 10;
  kataKunci: string = '';

  /**
   * Saringan keadaan: '' (semua), 'low' (menipis), atau 'negative' (minus).
   *
   * Ikut disimpan di query param bersama kata kunci dan halaman, supaya
   * "stok minus, halaman 2" bisa ditautkan dan ditengok kembali sama persis.
   */
  kondisi: string = '';

  /** Penghitung untuk kedua chip; datang dari server. */
  ringkasan: { low: number; negative: number } = { low: 0, negative: 0 };

  ngOnInit(): void {
    this.route.queryParams.subscribe(() => {
      this.fetchProducts();
    });
  }

  fetchProducts() {
    this.isLoading = true;

    const q = this.route.snapshot.queryParams;
    this.page = Number(q['page'] ?? 1);
    this.pageSize = Number(q['pageSize'] ?? 10);
    this.kataKunci = q['keyword'] ?? '';
    this.kondisi = q['condition'] ?? '';

    this.apiService
      .get('product-stock', {
        page: this.page,
        pageSize: this.pageSize,
        keyword: this.kataKunci,
        condition: this.kondisi,
      })
      .subscribe({
        next: (data: any) => {
          this.dataSource = data.data;
          this.dataCount = data.count;
          if (data.summary) {
            this.ringkasan = data.summary;
          }
        },
        error: (error) => {
          this.alertService.showError(error);
        },
      })
      .add(() => {
        this.isLoading = false;
      });
  }

  cari(kata: string) {
    this.navigasi({
      keyword: kata,
      page: 1,
      pageSize: this.pageSize,
      condition: this.kondisi,
    });
  }

  bukaHalaman(halaman: number) {
    this.navigasi({
      keyword: this.kataKunci,
      page: halaman,
      pageSize: this.pageSize,
      condition: this.kondisi,
    });
  }

  gantiUkuran(ukuran: number) {
    /* Kembali ke halaman satu: halaman 7 dari 10 baris tidak ada isinya lagi
       ketika ukurannya menjadi 50. */
    this.navigasi({
      keyword: this.kataKunci,
      page: 1,
      pageSize: ukuran,
      condition: this.kondisi,
    });
  }

  private navigasi(queryParams: {
    keyword: string;
    page: number;
    pageSize: number;
    condition?: string;
  }) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  /**
   * Menyalakan atau mematikan satu chip keadaan.
   *
   * Menekan chip yang sedang menyala mematikannya kembali; tanpa itu,
   * satu-satunya jalan melihat seluruh katalog adalah memuat ulang halaman.
   * Selalu kembali ke halaman satu — halaman 5 dari daftar penuh hampir pasti
   * tidak ada isinya begitu daftarnya menyusut jadi tiga baris.
   */
  toggleKondisi(pilihan: string) {
    const baru = this.kondisi === pilihan ? '' : pilihan;
    this.navigasi({
      keyword: this.kataKunci,
      page: 1,
      pageSize: this.pageSize,
      condition: baru,
    });
  }

  /** Stok sebuah baris; tidak semua barang punya catatan stok. */
  stok(item: any): number {
    return Number(item.product_stock?.stock ?? 0);
  }

  /**
   * Ambang "menipis" sebuah barang.
   *
   * YANG LEBIH BESAR di antara ambang yang diset orang dan ambang yang
   * dihitung sistem — persis GREATEST(minimum_stock,
   * COALESCE(minimum_stock_recommendation, 0)) yang dipakai server untuk
   * menyaring daftar dan menghitung chip.
   *
   * Dulu di sini hanya minimum_stock. Barang yang ambang manualnya belum
   * diisi tetapi punya rekomendasi ikut tersaring "menipis" oleh server,
   * lalu digambar TANPA lencana menipis oleh layar — daftar yang isinya
   * membantah judulnya sendiri.
   */
  private ambang(item: any): number {
    return Math.max(
      this.minimumManual(item),
      this.rekomendasi(item) ?? 0,
    );
  }

  /** Ambang yang diset orang; 0 berarti belum pernah diisi. */
  minimumManual(item: any): number {
    return Number(item.minimum_stock ?? 0);
  }

  /**
   * Ambang hasil hitungan sistem, atau null.
   *
   * null BUKAN nol. Produk dengan kurang dari tiga hari penjualan di jendela
   * sengaja tidak diberi rekomendasi oleh pekerjaan batch — datanya belum
   * cukup untuk dipercaya. Menggambarnya sebagai "0" akan menyatakan sesuatu
   * yang tidak pernah dihitung.
   */
  rekomendasi(item: any): number | null {
    const nilai = item.minimum_stock_recommendation;
    return nilai == null ? null : Number(nilai);
  }

  /**
   * Mana di antara kedua angka itu yang SEDANG BERLAKU.
   *
   * Kolomnya menampilkan dua angka, dan tanpa penanda keduanya tampak setara
   * — padahal yang menentukan sebuah baris "menipis" hanya yang lebih tinggi.
   * Baris berambang manual 0 dan saran 252 akan terbaca "minimumnya nol" lalu
   * dilencanai Menipis: daftar yang membantah dirinya sendiri, persis bug
   * yang dulu diperbaiki pada perhitungan pill-nya.
   *
   * Maka yang berlaku digambar penuh dan yang tidak diredupkan. Tidak ada
   * lencana tambahan per baris: pada 4.886 produk, penanda yang muncul di
   * setiap baris berhenti menjadi penanda.
   */
  manualBerlaku(item: any): boolean {
    const manual = this.minimumManual(item);
    return manual > 0 && manual >= (this.rekomendasi(item) ?? 0);
  }

  rekomendasiBerlaku(item: any): boolean {
    const saran = this.rekomendasi(item);
    return saran != null && saran > this.minimumManual(item);
  }

  /**
   * Keadaan sebuah baris, atau '' bila stoknya cukup.
   *
   * Dihitung DI SINI dari stok dan kedua ambang yang semuanya sudah ikut
   * terkirim — bukan diminta sebagai satu ruas jadi. Ambangnya sama persis
   * dengan yang dipakai server menghitung chip, jadi angka pada chip dan pill
   * pada barisnya tidak bisa saling bertentangan.
   */
  kondisiBaris(item: any): string {
    const jumlah = this.stok(item);
    if (jumlah < 0) {
      return 'negative';
    }

    const ambang = this.ambang(item);
    return ambang > 0 && jumlah < ambang ? 'low' : '';
  }

  kunciKondisi(item: any): string {
    return this.kondisiBaris(item) === 'negative'
      ? 'stock-list__status__negative'
      : 'stock-list__status__low';
  }

  kelasPill(item: any): string {
    return this.kondisiBaris(item) === 'negative' ? 'pill--merah' : 'pill--amber';
  }

  ikonPill(item: any): string {
    return this.kondisiBaris(item) === 'negative'
      ? 'ph-arrow-down'
      : 'ph-warning';
  }

  /** Huruf pertama referensi, untuk avatar bundar pada kolom Barang. */
  inisial(referensi: string): string {
    return (referensi ?? '?').trim().charAt(0).toUpperCase() || '?';
  }

  lacakBarang = (_: number, item: any): number => item.id;

  openDialog(dialogType: string, id: number) {
    if (dialogType == 'mutation') {
      this.dialog.open(StockListReportComponent, {
        data: {
          id: id,
        },
      });
    }

    if (dialogType == 'card') {
      const url = this.router.url;

      this.router.navigate(['Card', id], {
        relativeTo: this.route,
        queryParams: {
          backLocation: url,
        },
      });
    }
  }

  /**
   * Membatalkan pencarian dari blok kosong.
   *
   * Ruasnya dikosongkan DAN diteruskan ke pengambilan data lewat jalur yang
   * sama dengan mengetik di kotak pencarian, supaya kotak, daftar, dan
   * alamat tidak bisa menyatakan tiga hal berbeda.
   */
  resetPencarian(): void {
    this.cari('');
  }
}
