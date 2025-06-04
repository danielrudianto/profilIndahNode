import { Request, Response } from "express";
import { UserAvatarRepository } from "../repositories/user-avatar.repository";

class UserAvatarController {
  private userAvatarRepository: UserAvatarRepository;

  constructor(userAvatarRepository: UserAvatarRepository) {
    this.userAvatarRepository = userAvatarRepository;
  }

  updateAvatar = async (req: Request, res: Response) => {
    try {
      const result = await this.userAvatarRepository.create({
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
      console.error(`[error]: Error on updating user's avatar ${error}`);
      return res.status(500).send(error);
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
