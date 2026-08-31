import { Prisma, PrismaClient } from "@prisma/client";
import { IFetchCommonResult } from "../interfaces/fetch.interface";

import { ProductBrandModel } from "../models/product-brand.model";
import { ProductTypeModel } from "../models/product-type.model";
import { ProductModel } from "../models/product.model";
import { toPositiveInt } from "../utils/sql.helper";
import { DateHelper, formatDate } from "../utils/date.helper";

export class ProductStockRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async incrementStock(productID: number, quantity: number) {
    try {
      //update or insert stock
      const result = await this.prisma.product_stock.upsert({
        where: { id: productID },
        update: {
          stock: {
            increment: quantity,
          },
        },
        create: {
          id: productID,
          stock: quantity,
        },
      });
    } catch (error) {
      console.error(`[error]: Error on incrementing stock: ${error}`);
      throw new Error("Internal server error");
    }
  }

  /**
   * Menghitung barang yang stoknya bermasalah, untuk chip ringkasan 15a.
   *
   * Kedua keadaannya SALING LEPAS dan definisinya diambil dari kueri yang
   * sudah dipakai fetchProblematicStock dan fetchInadequateStock — bukan
   * ditulis ulang di sini. Menipis berarti di bawah ambangnya sendiri tetapi
   * belum minus; minus berarti sudah di bawah nol. Sebuah barang tidak pernah
   * terhitung dua kali.
   *
   * Ambangnya adalah product.minimum_stock, kolom yang memang sudah ada — jadi
   * tidak ada angka baru yang perlu ditebak atau ditanyakan.
   *
   * Ditulis sebagai raw query TANPA satu pun interpolasi: Prisma tidak bisa
   * membandingkan dua kolom pada tabel berbeda lewat findMany.
   */
  async countConditions(): Promise<{ low: number; negative: number }> {
    const hasil = await this.prisma.$queryRaw<
      { low: bigint; negative: bigint }[]
    >`
      SELECT
        SUM(
          CASE
            WHEN COALESCE(product_stock.stock, 0) >= 0
             AND COALESCE(product_stock.stock, 0) < GREATEST(product.minimum_stock, COALESCE(product.minimum_stock_recommendation, 0))
            THEN 1 ELSE 0
          END
        ) AS low,
        SUM(
          CASE WHEN COALESCE(product_stock.stock, 0) < 0 THEN 1 ELSE 0 END
        ) AS negative
      FROM product
      LEFT JOIN product_stock ON product_stock.id = product.id
      WHERE product.is_delete = 0
    `;

    if (hasil.length === 0) {
      return { low: 0, negative: 0 };
    }

    return {
      low: Number(hasil[0].low ?? 0),
      negative: Number(hasil[0].negative ?? 0),
    };
  }

  /**
   * Stok DAN kedua ambangnya, untuk sederet produk.
   *
   * Ambangnya ikut diambil dari basis data, bukan dibaca dari dokumen
   * Meilisearch yang menyertai baris ini. Dua sebab:
   *
   * minimum_stock_recommendation ditulis pekerjaan batch lewat `UPDATE
   * product SET ...` mentah, yang tidak pernah menyentuh indeks — jadi nilai
   * di indeks selalu ketinggalan, kalau pun ada di sana.
   *
   * Dan keadaan sebuah baris ("menipis"/"minus") harus dihitung dari ambang
   * yang SAMA dengan yang dipakai penyaring dan penghitung chip. Ketika
   * lencananya dihitung dari minimum_stock saja sementara penyaringnya
   * memakai GREATEST(minimum_stock, rekomendasi), daftar "menipis"
   * menampilkan baris tanpa lencana menipis — persis seperti yang terjadi.
   */
  async fetchStock(productID: number[]) {
    try {
      const [stocks, ambang] = await Promise.all([
        this.prisma.product_stock.findMany({
          where: {
            id: {
              in: productID,
            },
          },
          select: {
            id: true,
            stock: true,
          },
        }),
        this.prisma.product.findMany({
          where: {
            id: {
              in: productID,
            },
          },
          select: {
            id: true,
            minimum_stock: true,
            minimum_stock_recommendation: true,
          },
        }),
      ]);

      const petaAmbang = new Map(ambang.map((x) => [x.id, x]));

      return stocks.map((stock) => {
        const a = petaAmbang.get(stock.id);
        return {
          id: stock.id,
          stock: stock.stock,
          minimum_stock: Number(a?.minimum_stock ?? 0),
          minimum_stock_recommendation:
            a?.minimum_stock_recommendation == null
              ? null
              : Number(a.minimum_stock_recommendation),
        };
      });
    } catch (error) {
      console.error(`[error]: Error on fetching stock: ${error}`);
      throw new Error("Internal server error");
    }
  }

  async fetchStockByProductID(id: number[]) {
    const stock = await this.prisma.product_stock.findMany({
      where: {
        id: {
          in: id,
        },
      },
    });

    return stock.map((x) => {
      return {
        product_id: x.id,
        stock: Number(x.stock),
      };
    });
  }

  async fetchProblematicStock(data: {
    page: number;
    pageSize: number;
    keyword: string;
    brands: number[];
    types: number[];
  }): Promise<IFetchCommonResult<ProductModel>> {
    let where = {
      product_stock: {
        stock: {
          lt: 0,
        },
      },
      is_delete: false,
    };

    if (data.brands.length > 0) {
      (where as any).product_brand = {
        id: {
          in: data.brands,
        },
      };
    }

    if (data.types.length > 0) {
      (where as any).product_type = {
        id: {
          in: data.types,
        },
      };
    }

    if (data.keyword.length > 0) {
      (where as any).OR = [
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
      ];
    }
    const [result, count] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where: where,
        include: {
          product_brand: true,
          product_type: true,
          product_stock: true,
        },
        take: data.pageSize,
        skip: (data.page - 1) * data.pageSize,
        orderBy: [
          {
            reference: "asc",
          },
        ],
      }),
      this.prisma.product.count({
        where: where,
      }),
    ]);

    return {
      data: result.map((x) => {
        return ProductModel.fromMap(x);
      }),
      count: count,
    };
  }

  async fetchInadequateWarehouse(data: {
    page: number;
    pageSize: number;
    keyword: string;
  }) {
    const [result, count] = await this.prisma.$transaction([
      this.prisma.$queryRaw<any[]>`
        SELECT product.id, COALESCE(product_stock.stock) AS stock 
        FROM product
        LEFT JOIN product_stock ON product.id = product_stock.id
        WHERE COALESCE(product_stock.stock, 0) < GREATEST(product.minimum_stock, COALESCE(product.minimum_stock_recommendation, 0))
        AND COALESCE(product_stock.stock, 0) >= 0
        LIMIT ${data.pageSize}
        OFFSET ${(data.page - 1) * data.pageSize}
      `,
      this.prisma.$queryRaw<any[]>`
        SELECT COUNT(product.id) AS count 
        FROM product
        LEFT JOIN product_stock ON product.id = product_stock.id
        WHERE COALESCE(product_stock.stock, 0) < GREATEST(product.minimum_stock, COALESCE(product.minimum_stock_recommendation, 0))
        AND COALESCE(product_stock.stock, 0) >= 0
        LIMIT ${data.pageSize}
        OFFSET ${(data.page - 1) * data.pageSize}
      `,
    ]);

    return {
      data: result.map((x) => {
        return {
          id: x.id,
          product_stock: {
            stock: Number(x.stock),
          },
        };
      }),
      count:
        count.length == 0 ? 0 : count[0] == null ? 0 : Number(count[0].count),
    };
  }

  async fetchInadequateStock(data: {
    page: number;
    pageSize: number;
    keyword: string;
    brands: number[];
    types: number[];
  }) {
    // Saringan merek/tipe akhirnya benar-benar dipakai: dulu controller
    // meneruskannya tetapi SQL-nya tidak pernah membaca, jadi dialog
    // saringan di halaman lama diam-diam tidak berbuat apa-apa. Kosong
    // berarti semua. Nilainya dikirim lewat placholder ? — yang
    // diinterpolasi hanya deretan tanda tanyanya.
    const saringanMerek =
      data.brands.length > 0
        ? `AND product.product_brand_id IN (${data.brands
            .map(() => "?")
            .join(",")})`
        : "";
    const saringanTipe =
      data.types.length > 0
        ? `AND product.product_type_id IN (${data.types
            .map(() => "?")
            .join(",")})`
        : "";
    const nilaiSaringan = [...data.brands, ...data.types];

    const [result, count] = await this.prisma.$transaction([
      this.prisma.$queryRawUnsafe<any[]>(
        `
          SELECT product.*, COALESCE(product_stock.stock, 0) AS stock, product_brand.name AS brand_name, product_type.name AS type_name,
          product_brand.created_by AS brand_created_by, product_type.created_by AS type_created_by
          FROM product
          LEFT JOIN product_stock ON product_stock.id = product.id
          JOIN product_brand ON product.product_brand_id = product_brand.id
          JOIN product_type ON product.product_type_id = product_type.id
          WHERE product.is_delete = 0
          AND COALESCE(product_stock.stock,0) < GREATEST(product.minimum_stock, COALESCE(product.minimum_stock_recommendation, 0))
          AND COALESCE(product_stock.stock, 0) >= 0
          ${saringanMerek}
          ${saringanTipe}
          AND (
            product.reference LIKE ?
            OR product.description LIKE ?
          )
          ORDER BY product.reference ASC
          LIMIT ${toPositiveInt(data.pageSize, 10)}
          OFFSET ${
            toPositiveInt(data.page, 1) * toPositiveInt(data.pageSize, 10) -
            toPositiveInt(data.pageSize, 10)
          }
        `,
        ...nilaiSaringan,
        `%${data.keyword ?? ""}%`,
        `%${data.keyword ?? ""}%`
      ),
      // LEFT JOIN + COALESCE, sama persis dengan query datanya: dengan
      // JOIN biasa, barang yang belum punya baris product_stock muncul
      // di halaman tetapi tidak pernah terhitung — paginasinya bohong.
      this.prisma.$queryRawUnsafe<any[]>(
        `
          SELECT COUNT(product.id) AS count
          FROM product
          LEFT JOIN product_stock ON product_stock.id = product.id
          WHERE product.is_delete = 0
          AND COALESCE(product_stock.stock, 0) < GREATEST(product.minimum_stock, COALESCE(product.minimum_stock_recommendation, 0))
          AND COALESCE(product_stock.stock, 0) >= 0
          ${saringanMerek}
          ${saringanTipe}
          AND (
            product.reference LIKE ?
            OR product.description LIKE ?
          )
        `,
        ...nilaiSaringan,
        `%${data.keyword ?? ""}%`,
        `%${data.keyword ?? ""}%`
      ),
    ]);

    let formattedCount = 0;
    if (count == undefined || count.length == 0) {
      formattedCount = 0;
    } else {
      formattedCount = Number(count[0].count);
    }
    return {
      data: result.map((x) => {
        return new ProductModel({
          id: x.id,
          reference: x.reference,
          description: x.description,
          product_brand_id: x.product_brand_id,
          product_type_id: x.product_type_id,
          created_at: new Date(x.created_at),
          created_by: x.created_by,
          minimum_stock: Number(x.minimum_stock),
          minimum_stock_recommendation:
            x.minimum_stock_recommendation == null
              ? null
              : Number(x.minimum_stock_recommendation),
          unit: x.unit,
          product_brand: new ProductBrandModel({
            id: x.product_brand_id,
            name: x.brand_name,
            created_by: x.brand_created_by,
          }),
          product_type: new ProductTypeModel({
            id: x.product_type_id,
            name: x.type_name,
            created_by: x.type_created_by,
          }),
          product_stock: {
            product_id: x.id,
            stock: Number(x.stock),
          },
        });
      }),
      count: formattedCount,
    };
  }

  /*
    tx diisi ketika pemanggilnya sudah berada di dalam transaksi interaktif.

    Prisma TIDAK bisa menyarangkan transaksi: memanggil $transaction dari dalam
    $transaction lain membuka transaksi kedua pada koneksi berbeda, sehingga
    tulisannya lolos dari pembatalan pemanggil. Ketika tx ada, upsert-nya
    dijalankan berurutan memakai klien itu.

    Urutannya sengaja berurutan, bukan Promise.all: baris product_stock adalah
    titik rebutan paling ramai di jalur ini, dan menembakkan banyak upsert
    sekaligus ke dalam satu transaksi memperbesar peluang deadlock antar
    permintaan yang menyentuh produk yang sama.
  */
  /**
   * MENIMPA stok, bukan menambahnya.
   *
   * Pasangan updateMany di bawah, dan pembedanya menyangkut angka yang dilihat
   * orang setiap hari. updateMany memakai `increment` karena pemanggilnya —
   * faktur, penyesuaian, setoran — menyampaikan SELISIH: barang keluar lima,
   * stok berkurang lima.
   *
   * Hitung ulang menyeluruh menyampaikan hal yang berbeda: bukan selisih,
   * melainkan berapa stok itu SEHARUSNYA menurut seluruh dokumen. Menambahkan
   * angka itu ke nilai yang sudah ada melipatduakan stok setiap barang —
   * diam-diam, tanpa galat, dan hanya ketahuan kalau ada yang menghitung
   * fisiknya di gudang.
   *
   * Karena itu keduanya dipisah namanya, bukan dibedakan lewat sebuah
   * bendera: pemanggil yang keliru memilih tidak akan pernah tahu ia keliru.
   */
  replaceMany = async (
    items: { productID: number; quantity: number }[],
    tx?: Prisma.TransactionClient
  ) => {
    const argumen = (item: { productID: number; quantity: number }) => ({
      where: { id: item.productID },
      create: { id: item.productID, stock: item.quantity },
      update: { stock: item.quantity },
    });

    if (tx) {
      const hasil = [];
      for (const item of items) {
        hasil.push(await tx.product_stock.upsert(argumen(item)));
      }
      return hasil;
    }

    return this.prisma.$transaction(
      items.map((item) => this.prisma.product_stock.upsert(argumen(item)))
    );
  };

  updateMany = async (
    items: { productID: number; quantity: number }[],
    tx?: Prisma.TransactionClient
  ) => {
    const argumen = (item: { productID: number; quantity: number }) => ({
      where: { id: item.productID },
      create: { id: item.productID, stock: item.quantity },
      update: { stock: { increment: item.quantity } },
    });

    if (tx) {
      const hasil = [];
      for (const item of items) {
        hasil.push(await tx.product_stock.upsert(argumen(item)));
      }
      return hasil;
    }

    return this.prisma.$transaction(
      items.map((item) => this.prisma.product_stock.upsert(argumen(item)))
    );
  };

  /*
    Stok penutup bulan sebelumnya per produk — kartu stok terakhir
    (tanggal lalu id tertinggi) sampai hari terakhir bulan lalu.

    Dulu satu findFirst PER PRODUK dalam satu transaksi: ribuan query
    berurutan sekali buka laporan, lalu dicari lagi dengan findIndex
    O(n²). Kini satu query greatest-per-group di atas indeks
    (product_id, date, id), hasilnya dipetakan lewat Map.
  */
  fetchOutputReport = async (data: {
    product_id: number[];
    month: number;
    year: number;
  }) => {
    const batas = new Date(data.year, data.month - 1, 0);

    const result = await this.prisma.$queryRaw<any[]>`
      SELECT sc.product_id, sc.stock
      FROM stock_card sc
      JOIN (
        SELECT s2.product_id, MAX(s2.id) AS id
        FROM stock_card s2
        JOIN (
          SELECT product_id, MAX(date) AS tanggal
          FROM stock_card
          WHERE date <= ${DateHelper.convertDate(batas, formatDate.YYYYMMDD)}
          GROUP BY product_id
        ) puncak ON puncak.product_id = s2.product_id
          AND puncak.tanggal = s2.date
        GROUP BY s2.product_id
      ) pilih ON pilih.id = sc.id
    `;

    const stokPerProduk = new Map<number, number>(
      result.map((x) => [Number(x.product_id), Number(x.stock)])
    );

    return data.product_id.map((x) => {
      return {
        product_id: x,
        stock: stokPerProduk.get(x) ?? 0,
      };
    });
  };
}
