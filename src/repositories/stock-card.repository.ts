import { Prisma, PrismaClient } from "@prisma/client";
import { StockCardModel } from "../models/stock-card.model";
import { IStockCard } from "../interfaces/stock-card.interface";
import { DateHelper, formatDate } from "../utils/date.helper";

export class StockCardRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /*
    create() satuan pernah ada di sini — tanpa await dan tanpa return,
    sehingga PrismaPromise-nya tidak pernah dieksekusi. Tidak ada satu
    pun pemanggilnya; seluruh jalur hidup memakai createMany.
  */

  /*
    tx diisi ketika pemanggilnya sudah berada di dalam transaksi interaktif.

    Prisma TIDAK bisa menyarangkan transaksi: memanggil $transaction dari dalam
    $transaction lain akan membuka transaksi kedua pada koneksi yang berbeda,
    sehingga tulisannya berada di luar jangkauan pembatalan pemanggil — persis
    kebalikan dari yang diinginkan. Karena itu ketika tx ada, baris-barisnya
    ditulis berurutan memakai klien itu, tanpa membuka transaksi sendiri.
  */
  createMany(data: IStockCard[], tx?: Prisma.TransactionClient) {
    const baris = (x: IStockCard) => ({
      date: x.date,
      product_id: x.product_id,
      product_unit_id: x.product_unit_id,
      display_quantity: x.display_quantity,
      quantity: x.quantity,
      document_name: x.document_name,
      supplier_id: x.supplier_id,
      customer_id: x.customer_id,
      sales_invoice_id: x.sales_invoice_id,
      sales_invoice_code_id: x.sales_invoice_code_id,
      adjustment_case_id: x.adjustment_case_id,
      adjustment_case_code_id: x.adjustment_case_code_id,
      good_receipt_id: x.good_receipt_id,
      good_receipt_code_id: x.good_receipt_code_id,
      sales_return_id: x.sales_return_id,
      sales_return_code_id: x.sales_return_code_id,
      stock: null,
      created_at: x.created_at,
    });

    if (tx) {
      return Promise.all(
        data.map((x) => tx.stock_card.create({ data: baris(x) }))
      );
    }

    return this.prisma.$transaction(
      data.map((x) => this.prisma.stock_card.create({ data: baris(x) }))
    );
  }

  async fetchByID(id: number) {
    const result = await this.prisma.stock_card.findUnique({
      where: {
        id: id,
      },
    });

    if (!result) {
      return null;
    }

    return StockCardModel.fromMap(result);
  }

  async fetchMutation(data: {
    productID: number;
    date: Date;
    viewBy: "date" | "created";
  }) {
    if (data.viewBy === "date") {
      const previous = await this.prisma.stock_card.findFirst({
        where: {
          date: {
            lt: data.date,
          },
          product_id: data.productID,
        },
        orderBy: [
          {
            date: "desc",
          },
          {
            id: "desc",
          },
        ],
      });

      const current = await this.prisma.stock_card.findMany({
        where: {
          date: data.date,
          product_id: data.productID,
        },
        orderBy: [
          {
            id: "desc",
          },
        ],
        include: {
          customer: true,
          supplier: true,
          product_unit: true,
        },
      });

      return {
        data: current.map((x) => {
          return StockCardModel.fromMap(x);
        }),
        previous: previous == null ? 0 : Number(previous.stock),
      };
    } else if (data.viewBy === "created") {
      /*
        Stok awal = keadaan SEBELUM hari itu dimulai.

        DIHITUNG MUNDUR DARI STOK KINI, bukan dibaca dari kolom stock milik
        kartu. Kolom itu adalah saldo berjalan menurut TANGGAL DOKUMEN,
        sementara jendela di sini ditentukan TANGGAL INPUT — dan dua urutan
        itu berbeda begitu ada dokumen yang dimundurkan tanggalnya.

        Contohnya persis yang ditemukan di produksi: faktur bertanggal 29
        Agustus diinput 3 September. Di kartu ia duduk jauh di belakang
        dengan saldo berjalan 10, sementara baris terakhir yang diinput
        sebelum hari itu bersaldo 9 — maka laporan tanggal input 3 September
        menutup di 9 − 15 = −6, padahal stok barangnya 8.

        Mundur dari stok kini tidak bisa meleset begitu: berapa pun urutan
        dokumennya, stok kini dikurangi segala mutasi yang diinput SESUDAH
        hari itu adalah stok pada akhir hari itu, dan dikurangi lagi mutasi
        hari itu sendiri adalah stok awalnya.
      */
      const awalHari = new Date(
        data.date.getFullYear(),
        data.date.getMonth(),
        data.date.getDate()
      );
      const besok = new Date(
        data.date.getFullYear(),
        data.date.getMonth(),
        data.date.getDate() + 1
      );

      const [stokKini, sesudahHariItu] = await Promise.all([
        this.prisma.product_stock.findUnique({
          where: { id: data.productID },
          select: { stock: true },
        }),
        this.prisma.stock_card.aggregate({
          _sum: { quantity: true },
          where: {
            product_id: data.productID,
            created_at: { gte: besok },
          },
        }),
      ]);

      const current = await this.prisma.stock_card.findMany({
        where: {
          product_id: data.productID,
          AND: [
            { created_at: { lt: besok } },
            { created_at: { gte: awalHari } },
          ],
        },
        orderBy: [
          {
            id: "desc",
          },
        ],
        include: {
          customer: true,
          supplier: true,
          product_unit: true,
        },
      });

      const akhirHari =
        Number(stokKini?.stock ?? 0) -
        Number(sesudahHariItu._sum.quantity ?? 0);
      const mutasiHariItu = current.reduce(
        (jumlah, x) => jumlah + Number(x.quantity),
        0
      );

      return {
        data: current.map((x) => {
          return StockCardModel.fromMap(x);
        }),
        previous: akhirHari - mutasiHariItu,
      };
    }
  }

  async fetchPrevious(data: { product_id: number; date: Date; id: number }) {
    const result = await this.prisma.stock_card.findFirst({
      where: {
        product_id: data.product_id,
        stock: { not: null },
        OR: [
          { date: { lt: data.date } },
          { AND: [{ date: data.date }, { id: { lt: data.id } }] },
        ],
      },
      orderBy: [{ date: "desc" }, { id: "desc" }],
    });

    return result == null ? null : StockCardModel.fromMap(result);
  }

  async fetch(data: {
    sales_invoice_id: number | null;
    sales_invoice_code_id: number | null;
    good_receipt_id: number | null;
    good_receipt_code_id: number | null;
    adjustment_case_id: number | null;
    adjustment_case_code_id: number | null;
    sales_return_id: number | null;
    sales_return_code_id: number | null;
  }) {
    const entry = await this.prisma.stock_card.findFirst({
      where: {
        sales_invoice_id: data.sales_invoice_id,
        sales_invoice_code_id: data.sales_invoice_code_id,
        adjustment_case_id: data.adjustment_case_id,
        adjustment_case_code_id: data.adjustment_case_code_id,
        good_receipt_id: data.good_receipt_id,
        good_receipt_code_id: data.good_receipt_code_id,
        sales_return_id: data.sales_return_id,
        sales_return_code_id: data.sales_return_code_id,
      },
    });

    if (!entry) {
      return null;
    }

    return StockCardModel.fromMap(entry);
  }

  async fetchByProductID(data: {
    productID: number;
    page: number;
    pageSize: number;
  }) {
    const [result, count] = await this.prisma.$transaction([
      this.prisma.stock_card.findMany({
        where: {
          product_id: data.productID,
        },
        // Lawan transaksinya ikut: supplier untuk barang masuk, pelanggan
        // untuk barang keluar. Nama saja — kartunya bukan halaman kontak.
        //
        // product_unit ikut karena display_quantity TIDAK berarti apa-apa
        // tanpa satuannya. Ia mencatat jumlah dalam satuan DOKUMEN: dua roll
        // tersimpan sebagai 2, sementara quantity di sebelahnya 120 meter.
        // Tanpa relasi ini layar menggambar "-2" tanpa satuan, bersebelahan
        // dengan kolom saldo yang bersatuan meter — dan pembacanya
        // menyimpulkan stoknya berkurang dua meter.
        include: {
          supplier: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true } },
          product_unit: { select: { id: true, unit: true, conversion: true } },
        },
        orderBy: [
          {
            date: "desc",
          },
          {
            id: "desc",
          },
        ],
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
      }),
      this.prisma.stock_card.count({
        where: {
          product_id: data.productID,
        },
      }),
    ]);

    return {
      data: result.map((x) => {
        return StockCardModel.fromMap(x);
      }),
      count: count,
    };
  }

  /**
   * Menghitung ulang saldo berjalan sejak satu titik, dalam SATU pernyataan.
   *
   * Bentuk sebelumnya menarik seluruh baris yang terpengaruh lalu memanggil
   * UPDATE satu per satu, dengan `await` di dalam perulangan — jadi bukan
   * sekadar banyak kueri, melainkan banyak kueri BERURUTAN, satu pulang-pergi
   * jaringan per baris. Pada produk tersibuk di basis data ini kartunya
   * berjumlah 20.087; satu faktur bertanggal mundur bisa memicu belasan ribu
   * pulang-pergi sebelum kasirnya melihat konfirmasi.
   *
   * SUM(...) OVER (ORDER BY ...) menghitung saldo berjalan itu di dalam
   * MySQL. Tersedia sejak 8.0; basis data ini 8.0.46.
   *
   * `initial_stock` ditambahkan sebagai konstanta, bukan disatukan ke dalam
   * jendela: ia adalah saldo baris JANGKAR yang berada tepat sebelum rentang
   * ini dan sengaja tidak ikut dihitung ulang. Menyertakannya ke dalam
   * partisi akan menghitung kuantitasnya dua kali.
   *
   * Urutannya `date, id` — sama persis dengan bentuk lama. Kartu pada tanggal
   * yang sama diurutkan menurut id, dan itu satu-satunya yang membuat
   * saldonya deterministik ketika beberapa dokumen berbagi satu tanggal.
   */
  async reorderSince(data: {
    product_id: number;
    id: number;
    date: Date;
    initial_stock: number;
  }) {
    const sejakTanggal = DateHelper.convertDate(data.date, formatDate.YYYYMMDD);

    /*
      Syarat rentangnya identik dengan findMany yang digantikan: baris
      setelah tanggal jangkar, ditambah baris pada tanggal yang sama yang
      id-nya tidak lebih kecil dari jangkar.
    */
    await this.prisma.$executeRaw`
      UPDATE stock_card AS sc
      JOIN (
        SELECT id,
          ${data.initial_stock} + SUM(quantity) OVER (
            ORDER BY date ASC, id ASC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS saldo
        FROM stock_card
        WHERE product_id = ${data.product_id}
          AND (date > ${sejakTanggal}
               OR (date = ${sejakTanggal} AND id >= ${data.id}))
      ) AS hitung ON hitung.id = sc.id
      SET sc.stock = hitung.saldo
    `;
  }

  async delete(id: number) {
    const result = await this.prisma.stock_card.delete({
      where: {
        id: id,
      },
    });

    return result;
  }

  async deleteMany(
    data: {
      sales_invoice_id: number | null;
      sales_invoice_code_id: number | null;
      adjustment_case_id: number | null;
      adjustment_case_code_id: number | null;
      good_receipt_id: number | null;
      good_receipt_code_id: number | null;
      sales_return_id: number | null;
      sales_return_code_id: number | null;
    }[]
  ) {
    const deleteQuery = data.map((x) => {
      return this.prisma.stock_card.deleteMany({
        where: {
          sales_invoice_id: x.sales_invoice_id,
          sales_invoice_code_id: x.sales_invoice_code_id,
          adjustment_case_id: x.adjustment_case_id,
          adjustment_case_code_id: x.adjustment_case_code_id,
          good_receipt_id: x.good_receipt_id,
          good_receipt_code_id: x.good_receipt_code_id,
          sales_return_id: x.sales_return_id,
          sales_return_code_id: x.sales_return_code_id,
        },
      });
    });

    const result = await this.prisma.$transaction(deleteQuery);
    return result;
  }

  async startup() {
    /*
      Bangun ulang berarti MULAI DARI KOSONG. INSERT di bawah menyalin
      SEMUA dokumen tanpa memeriksa apa yang sudah ada — dijalankan pada
      basis data yang stock_card-nya sudah terisi, setiap mutasi jadi
      dobel dan saldo berjalannya ikut kacau. TRUNCATE, bukan DELETE:
      jutaan baris dihapusnya seketika dan id kembali dari satu.
    */
    await this.prisma.$executeRaw`TRUNCATE TABLE stock_card`;

    const result = await this.prisma.$queryRaw`
      INSERT INTO stock_card (product_id, product_unit_id, quantity, display_quantity, date, customer_id, supplier_id, document_name, sales_invoice_id, sales_invoice_code_id, adjustment_case_id, adjustment_case_code_id, good_receipt_id, good_receipt_code_id, sales_return_id, sales_return_code_id, stock, created_at)
      (
        SELECT * FROM (
        SELECT good_receipt.product_id, good_receipt.product_unit_id, good_receipt.quantity * IF(good_receipt.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, good_receipt.quantity AS display_quantity,
        good_receipt_code.date, NULL as customer_id, good_receipt_code.supplier_id, good_receipt_code.name AS document_name, NULL AS sales_invoice_id, NULL AS sales_invoice_code_id,
        NULL as adjustment_case_id, NULL AS adjustment_case_code_id, good_receipt.id AS good_receipt_id, good_receipt_code.id AS good_receipt_code_id, NULL AS sales_return_id, NULL AS sales_return_code_id, NULL AS stock,
        good_receipt_code.created_at
        FROM good_receipt
        JOIN product ON good_receipt.product_id = product.id
        LEFT JOIN product_unit ON good_receipt.product_unit_id = product_unit.id
        JOIN good_receipt_code ON good_receipt.good_receipt_code_id = good_receipt_code.id
          WHERE good_receipt_code.is_delete = 0
          
        UNION ALL
        SELECT adjustment_case.product_id, adjustment_case.product_unit_id, adjustment_case.quantity * IF(adjustment_case.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, adjustment_case.quantity AS display_quantity,
        adjustment_case_code.date, NULL as customer_id, NULL AS supplier_id, adjustment_case_code.name AS document_name, NULL AS sales_invoice_id, NULL AS sales_invoice_code_id,
        adjustment_case.id as adjustment_case_id, adjustment_case_code.id AS adjustment_case_code_id, NULL AS good_receipt_id, NULL AS good_receipt_code_id, NULL AS sales_return_id, NULL AS sales_return_code_id, NULL AS stock,
        adjustment_case_code.created_at
        FROM adjustment_case
        JOIN product ON adjustment_case.product_id = product.id
        LEFT JOIN product_unit ON adjustment_case.product_unit_id = product_unit.id
        JOIN adjustment_case_code ON adjustment_case.adjustment_case_code_id = adjustment_case_code.id
          WHERE adjustment_case_code.is_delete = 0
          
        UNION ALL
        SELECT sales_invoice.product_id, sales_invoice.product_unit_id, -1 * sales_invoice.quantity * IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, sales_invoice.quantity * -1 AS display_quantity,
        sales_invoice_code.date, sales_invoice_code.customer_id as customer_id, NULL AS supplier_id, sales_invoice_code.name AS document_name, sales_invoice.id AS sales_invoice_id, sales_invoice.sales_invoice_code_id AS sales_invoice_code_id,
        NULL as adjustment_case_id, NULL AS adjustment_case_code_id, NULL AS good_receipt_id, NULL AS good_receipt_code_id, NULL AS sales_return_id, NULL AS sales_return_code_id, NULL AS stock,
        sales_invoice_code.created_at
        FROM sales_invoice
        JOIN product ON sales_invoice.product_id = product.id
        LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        WHERE sales_invoice_code.is_delete = 0
        UNION ALL
        SELECT sales_invoice.product_id, sales_invoice.product_unit_id, sales_return.quantity * IF(sales_invoice.product_unit_id IS NULL, 1, product_unit.conversion) AS quantity, sales_return.quantity AS display_quantity,
        sales_return_code.date, sales_invoice_code.customer_id as customer_id, NULL AS supplier_id, sales_return_code.name AS document_name, sales_invoice.id AS sales_invoice_id, sales_invoice_code.id AS sales_invoice_code_id,
        NULL as adjustment_case_id, NULL AS adjustment_case_code_id, NULL AS good_receipt_id, NULL AS good_receipt_code_id, sales_return.id AS sales_return_id, sales_return_code.id AS sales_return_code_id, NULL AS stock,
        sales_return_code.created_at
        FROM sales_return
        JOIN sales_return_code ON sales_return.sales_return_code_id = sales_return_code.id
        JOIN sales_invoice ON sales_return.sales_invoice_id = sales_invoice.id
        JOIN sales_invoice_code ON sales_invoice.sales_invoice_code_id = sales_invoice_code.id
        JOIN product ON sales_invoice.product_id = product.id
        LEFT JOIN product_unit ON sales_invoice.product_unit_id = product_unit.id
          WHERE sales_return_code.is_delete = 0
        ) AS a
        ORDER BY product_id ASC, date ASC
      )
    `;

    return result;
  }

  /**
   * Menghitung ulang saldo seluruh produk yang punya kartu ber-stock NULL.
   *
   * Dipanggil saat aplikasi start. Bentuk sebelumnya, untuk SETIAP produk,
   * menarik seluruh kartunya lalu menyusun satu UPDATE per baris ke dalam
   * satu transaksi — pada basis data ini sekitar sejuta pernyataan setiap
   * kali proses dihidupkan, termasuk setiap deploy.
   *
   * Sekarang satu pernyataan per produk. Perhitungan saldonya sama persis
   * dengan reorderSince; lihat catatan panjang di sana.
   *
   * SENGAJA TIDAK satu pernyataan untuk seluruh tabel. Bentuk itu memang
   * jalan — menghitung ulang 1,13 juta baris memakan tiga setengah detik —
   * tetapi ia memegang kunci atas seluruh tabel selama itu, sementara start
   * aplikasi bisa terjadi kapan saja, termasuk di tengah jam toko. Per produk
   * berarti 4.886 pernyataan pendek yang bisa diselingi pekerjaan lain, bukan
   * satu penguncian panjang.
   */
  async reorder() {
    const productIDs = await this.prisma.stock_card.findMany({
      distinct: ["product_id"],
      select: { product_id: true },
      where: {
        stock: null,
      },
    });

    console.info(
      `[info]: Found ${productIDs.length} products that needs to be reorder`
    );

    for (let i = 0; i < productIDs.length; i++) {
      const product_id = productIDs[i].product_id;

      await this.prisma.$executeRaw`
        UPDATE stock_card AS sc
        JOIN (
          SELECT id,
            SUM(quantity) OVER (
              ORDER BY date ASC, id ASC
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS saldo
          FROM stock_card
          WHERE product_id = ${product_id}
        ) AS hitung ON hitung.id = sc.id
        SET sc.stock = hitung.saldo
      `;

      /*
        Dicatat per seratus produk, bukan per produk. Empat ribu delapan ratus
        baris log untuk pekerjaan yang kini berlangsung beberapa detik hanya
        menenggelamkan pesan lain yang justru perlu dibaca saat start.
      */
      if ((i + 1) % 100 === 0 || i + 1 === productIDs.length) {
        console.info(
          `[info]: Reordered ${i + 1}/${productIDs.length} product stock card`
        );
      }
    }

    console.info(`[info]: Reordering completed`);
  }

  async checkExistingByProductID(productID: number) {
    const stock = await this.prisma.stock_card.count({
      where: {
        product_id: productID,
      },
    });

    return stock > 0;
  }
}
