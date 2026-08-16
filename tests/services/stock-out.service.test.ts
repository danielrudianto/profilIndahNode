import { StockOutService } from "../../src/services/stock-out.service";

/**
 * Inti alokasi FIFO penetapan HPP, diuji terhadap repository tiruan di
 * memori. Tiruannya meniru semantik transaksi assign() yang asli: baris
 * stock_out asli memegang jatah pertama, jatah berikutnya menjadi baris
 * baru, kekurangan stok menjadi baris menunggak, dan residue tiap lapisan
 * berkurang sebesar jatahnya.
 *
 * Uji ini lahir dari audit yang menemukan HPP salah di jalur hidup; tiap
 * skenarionya adalah kegagalan yang pernah mungkin terjadi. Jangan dilonggarkan.
 */

interface BarisUji {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  date: Date;
  sales_invoice_id: number | null;
  sales_invoice_code_id: number | null;
  adjustment_case_id: number | null;
  adjustment_case_code_id: number | null;
  stock_in_id: number | null;
}

function buatDunia(
  stockOuts: { quantity: number }[],
  lapisan: { residue: number }[]
) {
  const so: BarisUji[] = stockOuts.map((x, i) => ({
    id: i + 1,
    product_id: 1,
    quantity: x.quantity,
    price: 0,
    date: new Date("2026-08-02"),
    sales_invoice_id: null,
    sales_invoice_code_id: null,
    adjustment_case_id: null,
    adjustment_case_code_id: null,
    stock_in_id: null,
  }));
  const si = lapisan.map((x, i) => ({
    id: 100 + i,
    product_id: 1,
    residue: x.residue,
    quantity: x.residue,
  }));
  const barisBaru: { quantity: number; stock_in_id: number | null }[] = [];

  const stockOutRepo = {
    fetchUnassigned: async () => so.filter((x) => x.stock_in_id == null),
    assign: async (data: any) => {
      const asli = so.find((x) => x.id === data.stockOut.id)!;
      asli.quantity = data.plan[0].quantity;
      asli.stock_in_id = data.plan[0].stock_in_id;
      for (const jatah of data.plan.slice(1)) {
        barisBaru.push({
          quantity: jatah.quantity,
          stock_in_id: jatah.stock_in_id,
        });
      }
      for (const jatah of data.plan) {
        const lapis = si.find((x) => x.id === jatah.stock_in_id)!;
        lapis.residue =
          Math.round((lapis.residue - jatah.quantity) * 100) / 100;
      }
      if (data.sisa > 0) {
        barisBaru.push({ quantity: data.sisa, stock_in_id: null });
      }
    },
  };
  const stockInRepo = {
    fetchManyUnfilled: async (ids: number[]) =>
      si
        .filter((x) => ids.includes(x.product_id) && x.residue > 0)
        .sort((a, b) => a.id - b.id),
  };

  return {
    so,
    si,
    barisBaru,
    svc: new StockOutService(stockOutRepo as any, stockInRepo as any),
  };
}

describe("StockOutService.calculateStockOut", () => {
  it("membelah penjualan lintas lapisan mengikuti FIFO", async () => {
    const d = buatDunia(
      [{ quantity: 410 }],
      [{ residue: 300 }, { residue: 500 }]
    );
    await d.svc.calculateStockOut();

    expect(d.so[0].quantity).toBe(300);
    expect(d.so[0].stock_in_id).toBe(100);
    expect(d.barisBaru).toEqual([{ quantity: 110, stock_in_id: 101 }]);
    expect(d.si.map((x) => x.residue)).toEqual([0, 390]);
  });

  it("menjaga total kuantitas saat stok kurang: sisanya menunggak", async () => {
    const d = buatDunia([{ quantity: 400 }], [{ residue: 290 }]);
    await d.svc.calculateStockOut();

    expect(d.so[0].quantity).toBe(290);
    expect(d.barisBaru).toEqual([{ quantity: 110, stock_in_id: null }]);
    const total =
      d.so[0].quantity + d.barisBaru.reduce((a, b) => a + b.quantity, 0);
    expect(total).toBe(400);
  });

  it("melewati kuantitas nol atau negatif tanpa menyentuh apa pun", async () => {
    const d = buatDunia([{ quantity: -5 }], [{ residue: 100 }]);
    await d.svc.calculateStockOut();

    expect(d.so[0].stock_in_id).toBeNull();
    expect(d.si[0].residue).toBe(100);
  });

  it("tidak melahirkan baris hantu dari pecahan float (0.1 × 3)", async () => {
    const d = buatDunia(
      [{ quantity: 0.3 }],
      [{ residue: 0.1 }, { residue: 0.1 }, { residue: 0.1 }]
    );
    await d.svc.calculateStockOut();

    expect(d.barisBaru.filter((x) => x.stock_in_id == null)).toHaveLength(0);
    expect(d.si.every((x) => x.residue === 0)).toBe(true);
  });

  it("membiarkan penjualan menunggak utuh ketika tidak ada lapisan", async () => {
    const d = buatDunia([{ quantity: 50 }], []);
    await d.svc.calculateStockOut();

    expect(d.so[0].stock_in_id).toBeNull();
    expect(d.so[0].quantity).toBe(50);
  });

  it("membagi satu lapisan untuk dua penjualan berurutan", async () => {
    const d = buatDunia(
      [{ quantity: 200 }, { quantity: 200 }],
      [{ residue: 300 }]
    );
    await d.svc.calculateStockOut();

    expect(d.so[0].quantity).toBe(200);
    expect(d.so[0].stock_in_id).toBe(100);
    expect(d.so[1].quantity).toBe(100);
    expect(d.so[1].stock_in_id).toBe(100);
    expect(d.barisBaru).toEqual([{ quantity: 100, stock_in_id: null }]);
    expect(d.si[0].residue).toBe(0);
  });
});
