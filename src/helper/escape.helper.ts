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

export function translateKeyword(keyword: any): string {
  if (!keyword) {
    return "";
  }

  return decodeURIComponent(keyword);
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
