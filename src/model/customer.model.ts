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
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
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
        updated_by: this.created_by,
        updated_at: this.created_at,
      },
      include: {
        user_customer_updated_byTouser: {
          select: {
            id: true,
            name: true
          }
        }
      }
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
      include: {
        user: {
          select: {
            name: true,
            id: true
          }
        },
        user_customer_deleted_byTouser: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
  }

  static fetchAutocomplete(keyword: string) {
    return prisma.customer.findMany({
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
      skip: 0
    })
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
            user: {
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
  
  static fetchById(id: number){
    return prisma.customer.findUnique({
      where:{
        id: id
      },
      include: {
        user: true
      }
    })
  }
}

export default CustomerModel;
