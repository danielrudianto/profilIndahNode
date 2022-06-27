import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class BillModel {
  static countItemByReference(reference: string) {
    return prisma.bill.count({
      where: {
        item: {
          reference: reference,
        },
      },
    });
  }

  static countByCustomerId(customer_id: number){
    return prisma.bill_code.count({
      where:{
        customer_id: customer_id,
        is_delete: false
      }
    })
  }

  static countByCustomerIds(customer_ids: number[]){
    return prisma.bill_code.groupBy({
      by: ["customer_id"],
      where:{
        customer_id: {
          in: customer_ids
        },
        is_delete: false
      },
      _count: true
    })
  }
}

export default BillModel;
