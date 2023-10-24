import { Router } from "express";
import ErrorList from "../../assets/error_list";
import { mongoChangelogModel } from "../../mongo-model/mongo-changelog.model";

const router = Router();

router.get("/", (_, res) => {
  mongoChangelogModel
    .find()
    .sort({
      date: -1,
    })
    .then((result) => {
      return res.status(200).send(result);
    })
    .catch((error) => {
      console.error(`[error]: Error on fetching changelog ${error}`);
      return res.status(500).send(ErrorList["Internal server error"]);
    });
});

export default router;
