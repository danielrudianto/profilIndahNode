import http from "http";

/**
 * Perilaku lapisan socket.
 *
 * Dua berkas kecil yang saling bergantung: io.ts memegang satu instance Server
 * di tingkat modul, dan socket.helper.ts memanggilnya lewat getIO(). Keduanya
 * belum pernah diuji padahal dua puluh enam pemanggilan `new SocketHelper(...)`
 * tersebar di sebelas controller.
 *
 * Yang paling perlu dijaga adalah sifat "belum diinisialisasi": getIO()
 * MELEMPAR bila initIO() belum dipanggil. Kalau suatu saat pemanggilan initIO
 * di app.ts terlepas, setiap controller yang mengabarkan perubahan lewat socket
 * akan melempar di tengah permintaan yang sudah berhasil menulis ke basis data.
 *
 * Modulnya diambil ulang lewat jest.isolateModules pada tiap kasus, karena
 * `io` disimpan sebagai variabel modul dan akan terbawa antar tes.
 */

describe("io.ts — daur hidup instance Server", () => {
  /**
   * CACAT YANG DIKETAHUI: create() melempar bila socket belum diinisialisasi.
   *
   * Tidak ada satu pun pemanggil yang membungkusnya dengan try/catch. Karena
   * pengabaran umumnya dilakukan SETELAH penulisan basis data berhasil,
   * lemparan di sini membuat pengguna menerima 500 padahal datanya sudah
   * tersimpan — permintaan yang sebenarnya berhasil tampak gagal.
   */
  it("CACAT: create() melempar bila initIO belum dipanggil", () => {
    jest.isolateModules(() => {
      const SocketHelper = require("../../src/utils/socket.helper").default;
      expect(() => new SocketHelper("apa-saja").create()).toThrow(
        "Socket.io not initialized!"
      );
    });
  });

  it("getIO melempar sebelum initIO dipanggil", () => {
    jest.isolateModules(() => {
      const { getIO } = require("../../src/utils/io.helper");
      expect(() => getIO()).toThrow("Socket.io not initialized!");
    });
  });

  it("initIO mengembalikan Server, dan getIO memberi instance yang sama", () => {
    jest.isolateModules(() => {
      const { initIO, getIO } = require("../../src/utils/io.helper");
      const server = http.createServer();
      const io = initIO(server);

      // Tidak memakai toBeInstanceOf: kelas Server yang diimpor berkas ini dan
      // yang di-require di dalam isolateModules berasal dari registry modul
      // berbeda, sehingga identitas kelasnya tidak sama walau kodenya sama.
      expect(io.constructor.name).toBe("Server");
      expect(typeof io.emit).toBe("function");
      expect(getIO()).toBe(io);

      io.close();
      server.close();
    });
  });

  it("initIO kedua kali menggantikan instance sebelumnya", () => {
    jest.isolateModules(() => {
      const { initIO, getIO } = require("../../src/utils/io.helper");
      const server1 = http.createServer();
      const server2 = http.createServer();

      const pertama = initIO(server1);
      const kedua = initIO(server2);

      expect(getIO()).toBe(kedua);
      expect(getIO()).not.toBe(pertama);

      pertama.close();
      kedua.close();
      server1.close();
      server2.close();
    });
  });
});

describe("SocketHelper", () => {
  it("mengirim nama dan data peristiwa apa adanya", () => {
    jest.isolateModules(() => {
      const emit = jest.fn();
      jest.doMock("../../src/utils/io.helper", () => ({
        getIO: () => ({ emit }),
      }));

      const SocketHelper = require("../../src/utils/socket.helper").default;
      new SocketHelper("product-created", { id: 7 }).create();

      expect(emit).toHaveBeenCalledTimes(1);
      expect(emit).toHaveBeenCalledWith("product-created", { id: 7 });
    });
  });

  it("data peristiwa bernilai null bila tidak diberikan", () => {
    jest.isolateModules(() => {
      const emit = jest.fn();
      jest.doMock("../../src/utils/io.helper", () => ({
        getIO: () => ({ emit }),
      }));

      const SocketHelper = require("../../src/utils/socket.helper").default;
      new SocketHelper("cache-cleared").create();

      expect(emit).toHaveBeenCalledWith("cache-cleared", null);
    });
  });

  /**
   * Peristiwa TIDAK dikirim saat objeknya dibuat, melainkan saat create()
   * dipanggil. Perbedaan ini penting bagi controller yang menyiapkan objeknya
   * lebih dulu lalu mengirim setelah transaksi basis datanya berhasil.
   */
  it("belum mengirim apa pun sebelum create() dipanggil", () => {
    jest.isolateModules(() => {
      const emit = jest.fn();
      jest.doMock("../../src/utils/io.helper", () => ({
        getIO: () => ({ emit }),
      }));

      const SocketHelper = require("../../src/utils/socket.helper").default;
      new SocketHelper("product-created", { id: 7 });

      expect(emit).not.toHaveBeenCalled();
    });
  });
});
