/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        // Dulu di sini ada diagnostics.ignoreCodes [7006, 7031] untuk meredam
        // implicit any yang muncul karena repository menerima `prisma: any`.
        // Parameternya sekarang bertipe PrismaClient, jadi peredam itu tidak
        // diperlukan lagi dan galat tipe pada berkas tes ikut dilaporkan.
        // Klien Prisma disiapkan lewat `pretest` di package.json.
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
};
