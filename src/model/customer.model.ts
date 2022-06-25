import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class CustomerModel {
  id?: number;
  name: string;
  address: string;
  npwp: string | null;
  pic: string;
  phone_number: string;
  created_by: number;
  created_at: Date;

  constructor(
    name: string,
    address: string,
    npwp: string | null,
    pic: string,
    phone_number: string,
    created_by: number,
    id: number | null = null
  ) {
    if (id != null) {
      this.id = id;
    }

    this.name = name;
    this.address = address;
    this.npwp = npwp;
    this.pic = pic;
    this.phone_number = phone_number;
    this.created_by = created_by;
    this.created_at = new Date();
  }

  create() {
    return prisma.customer.create({
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        pic: this.pic,
        phone_number: this.phone_number,
        created_by: this.created_by,
        created_at: this.created_at,
      },
    });
  }

  update() {
    return prisma.customer.update({
      where: {
        id: this.id,
      },
      data: {
        name: this.name,
        address: this.address,
        npwp: this.npwp,
        pic: this.pic,
        phone_number: this.phone_number,
        created_by: this.created_by,
        created_at: this.created_at,
      },
    });
  }

  static delete(id: number, created_by: number) {
    return prisma.customer.update({
      where: {
        id: id,
      },
      data: {
        is_delete: true,
        deleted_by: created_by,
      },
    });
  }

  static checkDeleteById(id: number) {
    let validation = false;

    prisma
      .$transaction([
        prisma.bill_code.count({
          where: {
            customer_id: id,
          },
        }),
        prisma.customer.findUnique({
          where: {
            id: id,
          },
        }),
      ])
      .then((result) => {
        if (result[0] == 0 && !result[1]?.is_delete) {
          validation = true;
        }
      });

    return validation;
  }

  static fetchAutocomplete(keyword: string) {
    return prisma.$transaction([
      prisma.customer.findMany({
        where: {
          is_delete: false,
          OR: [
            {
              name: {
                contains: keyword,
              },
            },
            {
              address: {
                contains: keyword,
              },
            },
            {
              npwp: {
                contains: keyword,
              },
            },
            {
              pic: {
                contains: keyword,
              },
            },
            {
              phone_number: {
                contains: keyword,
              },
            },
          ],
        },
        orderBy: {
          name: "asc",
        },
        take: 5,
      }),
      prisma.customer.count({
        where: {
          is_delete: false,
        },
      }),
    ]);
  }

  static fetch(keyword: string, offset: number, limit: number) {
    if (keyword == "") {
      return prisma.$transaction([
        prisma.customer.findMany({
          where: {
            is_delete: false,
          },
          orderBy: {
            name: "asc",
          },
          select: {
            id: true,
            name: true,
            address: true,
            npwp: true,
            pic: true,
            phone_number: true,
            user_customer_created_byTouser: {
              select: {
                name: true,
              },
            },
            created_at: true,
          },
          skip: offset,
          take: limit,
        }),
        prisma.customer.count({
          where: {
            is_delete: false,
          },
        }),
      ]);
    } else {
      return prisma.$transaction([
        prisma.customer.findMany({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                address: {
                  contains: keyword,
                },
              },
              {
                npwp: {
                  contains: keyword,
                },
              },
              {
                pic: {
                  contains: keyword,
                },
              },
              {
                phone_number: {
                  contains: keyword,
                },
              },
            ],
          },
          orderBy: {
            name: "asc",
          },
          skip: offset,
          take: limit,
        }),
        prisma.customer.count({
          where: {
            is_delete: false,
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                address: {
                  contains: keyword,
                },
              },
              {
                npwp: {
                  contains: keyword,
                },
              },
              {
                pic: {
                  contains: keyword,
                },
              },
              {
                phone_number: {
                  contains: keyword,
                },
              },
            ],
          },
        }),
      ]);
    }
  }
}

export default CustomerModel;
