"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongoChangelogModel = exports.changelogSchema = void 0;
const mongoose_1 = require("mongoose");
exports.changelogSchema = new mongoose_1.Schema({
    date: {
        type: Date,
        required: true,
    },
    changes: {
        type: Array,
        required: true,
    },
});
exports.mongoChangelogModel = (0, mongoose_1.model)("changelogs", exports.changelogSchema);
//# sourceMappingURL=mongo-changelog.model.js.map