class BillModel {
  final int id;
  final String name;
  final DateTime date;
  final BillCustomerModel? customer;
  final List<BillItemModel> bill;

  BillModel({
    required this.id,
    required this.name,
    required this.date,
    required this.customer,
    required this.bill,
  });
}

class BillCustomerModel {
  final int id;
  final String name;

  BillCustomerModel({
    required this.id,
    required this.name,
  });
}

class BillItemModel {
  final ItemModel item;
  final ItemUnitModel? unit;
  final double quantity;

  BillItemModel({
    required this.item,
    required this.unit,
    required this.quantity,
  });
}

class ItemModel {
  final int id;
  final String reference;
  final String description;
  final String unit;
  final ItemTypeModel type;
  final ItemBrandModel brand;

  ItemModel({
    required this.id,
    required this.reference,
    required this.description,
    required this.unit,
    required this.type,
    required this.brand,
  });
}

class ItemUnitModel {
  final String unit;
  final double conversion;

  ItemUnitModel({
    required this.unit,
    required this.conversion,
  });
}

class ItemTypeModel {
  final int id;
  final String name;

  ItemTypeModel({
    required this.id,
    required this.name,
  });
}

class ItemBrandModel {
  final int id;
  final String name;

  ItemBrandModel({
    required this.id,
    required this.name,
  });
}
