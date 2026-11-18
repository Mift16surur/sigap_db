"use client";

import React from "react";
import type {
  ClinicalItemResponse,
  InfoSource,
  LabAvailabilityStatus,
  RiskCategory,
} from "@/lib/types";

export const FIVE_STATUS_OPTIONS: Array<{
  value: ClinicalItemResponse;
  label: string;
  shortLabel: string;
  activeClass: string;
}> = [
  {
    value: "YA",
    label: "Ya (Positif)",
    shortLabel: "Ya",
    activeClass: "bg-red-600 text-white border-red-600 shadow-sm",
  },
  {
    value: "TIDAK",
    label: "Tidak (Negatif)",
    shortLabel: "Tidak",
    activeClass: "bg-emerald-600 text-white border-emerald-600 shadow-sm",
  },
  {
    value: "TIDAK_DIKETAHUI",
    label: "Tidak Diketahui",
    shortLabel: "Tdk Diketahui",
    activeClass: "bg-amber-500 text-white border-amber-500 shadow-sm",
  },
  {
    value: "BELUM_DIPERIKSA",
    label: "Belum Diperiksa",
    shortLabel: "Blm Diperiksa",
    activeClass: "bg-slate-700 text-white border-slate-700 shadow-sm",
  },
  {
    value: "TIDAK_RELEVAN",
    label: "Tidak Relevan",
    shortLabel: "Tdk Relevan",
    activeClass: "bg-indigo-600 text-white border-indigo-600 shadow-sm",
  },
];

export const INFO_SOURCE_OPTIONS: Array<{
  value: InfoSource;
  label: string;
}> = [
  { value: "ANAMNESIS_PASIEN", label: "Anamnesis Pasien/Keluarga" },
  { value: "BUKU_KIA_REKAM_MEDIS", label: "Buku KIA / Rekam Medis" },
  { value: "SURAT_RUJUKAN", label: "Surat Rujukan / USG" },
  { value: "PEMERIKSAAN_FISIK", label: "Pemeriksaan Fisik Admisi" },
  { value: "HASIL_LABORATORIUM", label: "Hasil Laboratorium" },
  { value: "OBSERVASI_TIM", label: "Observasi Tim Klinis" },
];

export const LAB_STATUS_OPTIONS: Array<{
  value: LabAvailabilityStatus;
  label: string;
  badgeClass: string;
}> = [
  {
    value: "TERSEDIA",
    label: "Tersedia (Sudah Diperiksa)",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  {
    value: "BELUM_TERSEDIA",
    label: "Belum Tersedia (Menunggu Lab)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  {
    value: "TIDAK_RELEVAN",
    label: "Tidak Relevan / Tidak Diindikasikan",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-300",
  },
];

export function FiveStatusSelector({
  value,
  onChange,
  compact = false,
}: {
  value: ClinicalItemResponse;
  onChange: (val: ClinicalItemResponse) => void;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FIVE_STATUS_OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border font-medium transition-all ${
              compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs"
            } ${
              active
                ? opt.activeClass
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {compact ? opt.shortLabel : opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function RiskCategoryBadge({
  category,
  size = "md",
}: {
  category?: RiskCategory | null;
  size?: "sm" | "md" | "lg";
}) {
  if (!category) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 border border-slate-200">
        Belum Dinilai
      </span>
    );
  }

  const map: Record<
    RiskCategory,
    { label: string; classes: string; dot: string }
  > = {
    LOW: {
      label: "RISIKO RENDAH (LOW)",
      classes: "bg-emerald-50 text-emerald-800 border-emerald-300",
      dot: "bg-emerald-500",
    },
    MODERATE: {
      label: "RISIKO SEDANG (MODERATE)",
      classes: "bg-amber-50 text-amber-800 border-amber-300",
      dot: "bg-amber-500",
    },
    HIGH: {
      label: "RISIKO TINGGI (HIGH)",
      classes: "bg-red-50 text-red-800 border-red-300",
      dot: "bg-red-600",
    },
  };

  const cfg = (category && map[category as RiskCategory]) || map.LOW;
  const sizeClass =
    size === "lg"
      ? "px-4 py-1.5 text-sm font-bold"
      : size === "sm"
      ? "px-2 py-0.5 text-[11px] font-semibold"
      : "px-3 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${cfg.classes} ${sizeClass}`}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
