import { Request, Response } from "express";
import ErrorList from "../constants/error-list.constant";
import { UserAvatarRepository } from "../repositories/user-avatar.repository";

class UserAvatarController {
  private userAvatarRepository: UserAvatarRepository;

  constructor(userAvatarRepository: UserAvatarRepository) {
    this.userAvatarRepository = userAvatarRepository;
  }

  updateAvatar = async (req: Request, res: Response) => {
    try {
      const result = await this.userAvatarRepository.save({
        user_id: req.body.userId,
        top: req.body.top,
        accessories: req.body.accessories,
        eyes: req.body.eyes,
        circle: req.body.circle,
        clothes: req.body.clothes,
        color: req.body.color,
        eyebrows: req.body.eyebrows,
        mouth: req.body.mouth,
      });
      return res.status(201).send(result);
    } catch (error) {
      /*
        Badannya key i18n seperti galat lain — versi lama mengirim objek
        error Prisma mentah, lengkap dengan potongan kode repository.
      */
      console.error(`[error]: Error on updating user's avatar ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    }
  };

  validateCreate(req: Request): string[] {
    const requiredFields = [
      "top",
      "accessories",
      "eyes",
      "circle",
      "clothes",
      "color",
      "eyebrows",
      "mouth",
    ];

    const errors: string[] = [];

    // Check for missing fields
    requiredFields.forEach((field) => {
      if (!req.body[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });

    return errors;
  }
}

export default UserAvatarController;
