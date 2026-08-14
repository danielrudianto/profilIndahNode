export function mysql_real_escape_string(string: string) {
  return string.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
    switch (char) {
      case "\0":
        return "\\0";
      case "\x08":
        return "\\b";
      case "\x09":
        return "\\t";
      case "\x1a":
        return "\\z";
      case "\n":
        return "\\n";
      case "\r":
        return "\\r";
      case '"':
      case "'":
      case "\\":
      case "%":
        return "\\" + char; // prepends a backslash to backslash, percent,
      // and double/single quotes
      default:
        return char;
    }
  });
}

/**
 * Kata kunci pencarian dari req.query.
 *
 * decodeURIComponent MELEMPAR URIError bila tanda persen tidak diikuti dua
 * digit heksadesimal. Nilai ini datang langsung dari pengguna pada tiga puluh
 * dua pemanggilan, dan pada dua puluh empat di antaranya berada DI LUAR blok
 * try. Karena handler-nya async, lemparan itu menjadi promise yang ditolak
 * yang tidak ditangani Express — dan Node menghentikan prosesnya. Satu
 * pengguna mengetik "%" di kolom pencarian mana pun sudah cukup untuk
 * mematikan seluruh server.
 *
 * Sekarang teks yang penyandiannya cacat dipakai apa adanya. Mencari "%"
 * memang paling masuk akal diartikan sebagai mencari aksara "%" itu sendiri,
 * bukan sebagai galat.
 */
export function translateKeyword(keyword: any): string {
  if (!keyword) {
    return "";
  }

  try {
    return decodeURIComponent(keyword);
  } catch {
    return String(keyword);
  }
}

export function translatePage(page: any): number {
  if (!page) {
    return 1;
  }

  const pageNumber = Number(page);
  if (isNaN(pageNumber)) {
    return 1;
  }

  if (pageNumber < 1) {
    return 1;
  }

  return Math.floor(pageNumber);
}

export function translateNPWP(npwp: any): string | null {
  if (!npwp) {
    return null;
  }

  const npwpString = npwp.toString();
  if (npwpString.length !== 15 && npwpString.length !== 16) {
    return null;
  }

  return npwpString;
}

export function translateDate(date: any): Date {
  if (!date || date == null) {
    return new Date();
  }

  if (typeof date === "string") {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return new Date();
    }
    return parsedDate;
  }

  return date;
}

export function translateSalesName(sales: string | null): string | null {
  if (sales != null && sales.length > 0) {
    return sales.toUpperCase();
  }

  return null;
}

export function translateFaktur(faktur: any): string | null {
  if (!faktur || faktur == null) {
    return null;
  }

  const fakturString = faktur.toString();
  if (fakturString.length !== 16) {
    return null;
  }

  return fakturString;
}

export function translatePageSize(pageSize: any): number {
  if (!pageSize) {
    return 10; // Default page size
  }

  const size = Number(pageSize);
  if (isNaN(size) || size < 1 || size > 100) {
    return 10; // Default page size if invalid
  }

  return Math.floor(size);
}
