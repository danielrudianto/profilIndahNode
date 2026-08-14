import { Router, Request, Response } from "express";
import os from "os";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  const cpus = os.cpus();
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
      free: os.freemem(),
      total: os.totalmem(),
      used: os.totalmem() - os.freemem(),
    },
    cpu: {
      model: cpu.model,
      speed: cpu.speed,
      times: cpu.times,
      usage: perc,
    },
  });
});

export default router;
