import { PrismaClient } from "@prisma/client";
import { IUserAvatar } from "../interfaces/user-avatar.interface";

export class UserAvatarRepository {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /*
    Upsert, bukan create: user_id UNIK di user_avatar, jadi create polos
    hanya berhasil pada penyimpanan PERTAMA — mengganti avatar meledak
    kena unique constraint dan pengguna membacanya sebagai 500.
  */
  save(data: IUserAvatar) {
    const isi = {
      top: data.top,
      accessories: data.accessories,
      clothes: data.clothes,
      eyes: data.eyes,
      eyebrows: data.eyebrows,
      mouth: data.mouth,
      color: data.color,
      circle: data.circle,
    };

    return this.prisma.user_avatar.upsert({
      where: { user_id: data.user_id! },
      create: { ...isi, user_id: data.user_id! },
      update: isi,
    });
  }
}
