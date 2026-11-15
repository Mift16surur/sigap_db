import React from "react";

export function BrandBanner() {
  const acronymItems = [
    { letter: "S", word: "Sistem" },
    { letter: "I", word: "Informasi" },
    { letter: "G", word: "Gerak cepat (respons)" },
    { letter: "A", word: "Antisipasi" },
    { letter: "P", word: "Preeklampsia dan Perdarahan Pascapersalinan" },
  ];

  return (
    <div className="lg:w-[50%] xl:w-[48%] bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden shrink-0">
      {/* Dekorasi Garis Lengkung Geometris Elegan */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 600 800"
      >
        <path
          d="M -100 200 C 120 80, 280 320, 500 60 L 500 800 L -100 800 Z"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M -60 250 C 160 130, 320 370, 540 110"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M -20 300 C 200 180, 360 420, 580 160"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />
        <path
          d="M 20 350 C 240 230, 400 470, 620 210"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
        />
      </svg>

      {/* Glow ambient background */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl pointer-events-none" />

      {/* Konten Atas: Asterisk Icon & Judul */}
      <div className="relative z-10">
        <svg
          className="w-12 h-12 text-white mb-8 transition-transform hover:rotate-45 duration-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M4.93 19.07l14.14-14.14" />
        </svg>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1] mb-6">
          Hello <br />
          SIGAP App! 👋
        </h1>

        {/* Kepanjangan Akronim SIGAP */}
        <div className="space-y-3 my-8 bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/20 shadow-xl">
          {acronymItems.map((item) => (
            <div key={item.letter} className="flex items-start gap-3">
              <span className="flex items-center justify-center h-7 w-7 rounded-lg bg-white text-[#1d4ed8] font-black text-sm shrink-0 shadow-sm">
                {item.letter}
              </span>
              <span className="text-sm font-semibold text-white/95 leading-7">
                — {item.word}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-md font-normal">
          Inovasi Aplikasi Skrining Admisi Preeklamsia dan Perdarahan Pascapersalinan (HPP 4T) pada Pasien Pertama Kali Masuk Rawat Inap.
        </p>
      </div>

      {/* Bagian Bawah: Hak Cipta */}
      <div className="relative z-10 pt-10 text-xs text-blue-200/80 font-medium">
        &copy; {new Date().getFullYear()} SIGAP Kebidanan • Universitas Muhammadiyah Gombong
      </div>
    </div>
  );
}

