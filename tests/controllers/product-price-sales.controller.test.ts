FAIL tests/controllers/product-price-sales.controller.test.ts
  ● GET / — daftar produk untuk pengisian harga jual › CACAT: pageSize menjadi NaN bila LIMIT tidak diset

    expect(jest.fn()).toHaveBeenCalledWith(...expected)

    Expected: ObjectContaining {"pageSize": NaN}
    Received: {"keyword": "", "page": 1, "pageSize": 10}

    Number of calls: 1

      173 |     await request(app(repo)).get("/");
      174 |
    > 175 |     expect(repo.fetchSales).toHaveBeenCalledWith(
          |                             ^
      176 |       expect.objectContaining({ pageSize: NaN })
      177 |     );
      178 |   });

      at Object.<anonymous> (tests/controllers/product-price-sales.controller.test.ts:175:29)

PASS tests/utils/date.helper.tahun.test.ts
PASS tests/controlle