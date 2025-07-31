"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const error_list_1 = __importDefault(require("../../assets/error_list"));
const mongo_changelog_model_1 = require("../../mongo-model/mongo-changelog.model");
const router = (0, express_1.Router)();
router.get("/", (_, res) => {
    mongo_changelog_model_1.mongoChangelogModel
        .find()
        .sort({
        date: -1,
    })
        .then((result) => {
        return res.status(200).send(result);
    })
        .catch((error) => {
        console.error(`[error]: Error on fetching changelog ${error}`);
        return res.status(500).send(error_list_1.default["Internal server error"]);
    });
});
exports.default = router;
//# sourceMappingURL=changelog.route.js.map