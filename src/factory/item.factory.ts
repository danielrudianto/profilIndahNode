import ErrorList from "../assets/error_list";

export enum itemFactoryType {
  Reference,
  References,
  ID,
  IDs,
  Search,
}

export class ItemFactory {
  fetch(type: itemFactoryType, data: any) {
    switch (type) {
      case itemFactoryType.Reference:
        if (typeof data == "string") {
        }

        throw Error(ErrorList["Parameter error"]);
      case itemFactoryType.References:
        // Check if data is array of string
        if (
          Array.isArray(data) &&
          data.length > 0 &&
          data.every((x) => typeof x == "string")
        ) {
        }

        throw Error(ErrorList["Parameter error"]);
      case itemFactoryType.ID:
        if (typeof data == "number") {
        }

        throw Error(ErrorList["Parameter error"]);
      case itemFactoryType.IDs:
        if (
          Array.isArray(data) &&
          data.length > 0 &&
          data.every((x) => typeof x == "number")
        ) {
        }

        throw Error(ErrorList["Parameter error"]);
      case itemFactoryType.Search:
        break;
    }
  }
}
