"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const os_1 = __importDefault(require("os"));
const router = (0, express_1.Router)();
router.get("/", (req, res) => {
    const cpus = os_1.default.cpus();
    const cpu = cpus[0];
    // Accumulate every CPU times values
    const total = Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0);
    // Normalize the one returned by process.cpuUsage()
    // (microseconds VS miliseconds)
    const usage = process.cpuUsage();
    const currentCPUUsage = (usage.user + usage.system) / 1000;
    // Find out the percentage used for this specific CPU
    const perc = (currentCPUUsage / total) * 100;
    return res.status(200).send({
        ram: {
            free: os_1.default.freemem(),
            total: os_1.default.totalmem(),
            used: os_1.default.totalmem() - os_1.default.freemem(),
        },
        cpu: {
            model: cpu.model,
            speed: cpu.speed,
            times: cpu.times,
            usage: perc,
        },
    });
});
exports.default = router;
//# sourceMappingURL=os.route.js.map