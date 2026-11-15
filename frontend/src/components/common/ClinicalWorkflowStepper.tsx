"use client";

import React from "react";
import { Check, ChevronRight } from "lucide-react";

export interface StepperStep {
  id: string;
  stepNumber: number;
  title: string;
  subtitle?: string;
  status: "complete" | "current" | "upcoming";
  onClick?: () => void;
}

export function ClinicalWorkflowStepper({
  steps,
  currentStepId,
  onStepClick,
}: {
  steps?: StepperStep[];
  currentStepId: string;
  onStepClick?: (stepId: string) => void;
}) {
  const defaultSteps: StepperStep[] = [
    {
      id: "PATIENT_REGISTRATION",
      stepNumber: 1,
      title: "Pendaftaran Pasien",
      subtitle: "Identitas & Rekam Medis",
      status:
        currentStepId === "PATIENT_REGISTRATION"
          ? "current"
          : currentStepId === "ADMISSION_INPUT" ||
            currentStepId === "PE_SCREENING" ||
            currentStepId === "HPP_SCREENING" ||
            currentStepId === "MONITORING_SBAR"
          ? "complete"
          : "upcoming",
    },
    {
      id: "ADMISSION_INPUT",
      stepNumber: 2,
      title: "Episode Admisi",
      subtitle: "Riwayat & Paritas",
      status:
        currentStepId === "ADMISSION_INPUT"
          ? "current"
          : currentStepId === "PE_SCREENING" ||
            currentStepId === "HPP_SCREENING" ||
            currentStepId === "MONITORING_SBAR"
          ? "complete"
          : "upcoming",
    },
    {
      id: "PE_SCREENING",
      stepNumber: 3,
      title: "Skrining PE & HPP",
      subtitle: "Klasifikasi 2 Jalur",
      status:
        currentStepId === "PE_SCREENING" || currentStepId === "HPP_SCREENING"
          ? "current"
          : currentStepId === "MONITORING_SBAR"
          ? "complete"
          : "upcoming",
    },
    {
      id: "MONITORING_SBAR",
      stepNumber: 4,
      title: "Monitoring & SBAR",
      subtitle: "Observasi & Eskalasi",
      status: currentStepId === "MONITORING_SBAR" ? "current" : "upcoming",
    },
  ];

  const actualSteps = steps || defaultSteps;

  return (
    <div className="w-full bg-white dark:bg-[#131f37] rounded-[0.75rem] border border-[#e2e8f0] dark:border-[#1e293b] p-4 shadow-2xs">
      <nav aria-label="Progress">
        <ol className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
          {actualSteps.map((step, idx) => {
            const isCurrent = step.status === "current";
            const isComplete = step.status === "complete";
            const isClickable = Boolean(onStepClick);

            return (
              <li key={step.id} className="flex-1 w-full">
                <div
                  onClick={() => isClickable && onStepClick && onStepClick(step.id)}
                  className={`group flex items-center gap-3 p-1.5 rounded-[0.5rem] transition-all ${
                    isClickable ? "cursor-pointer hover:bg-[#edf2f8] dark:hover:bg-[#1e293b]" : ""
                  }`}
                >
                  {/* Step icon / indicator (Kontras Tinggi & Tegas) */}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isComplete
                        ? "bg-[#16a36a] text-white shadow-xs"
                        : isCurrent
                        ? "bg-[#2457d6] text-white ring-4 ring-blue-100 dark:ring-blue-950 shadow-xs"
                        : "bg-[#e2e8f0] dark:bg-[#1e293b] text-[#1e293b] dark:text-[#f1f5f9] border border-[#cbd5e1] dark:border-[#334155]"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4 stroke-[2.5]" />
                    ) : (
                      <span className="font-extrabold">{step.stepNumber}</span>
                    )}
                  </div>

                  {/* Step text */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-xs font-semibold leading-tight truncate ${
                        isCurrent
                          ? "text-[#2457d6] dark:text-[#60a5fa]"
                          : isComplete
                          ? "text-[#17243b] dark:text-[#f1f5f9]"
                          : "text-[#475569] dark:text-[#94a3b8]"
                      }`}
                    >
                      {step.title}
                    </p>
                    {step.subtitle && (
                      <p className="text-[11px] text-[#64748b] dark:text-[#64748b] truncate mt-0.5">
                        {step.subtitle}
                      </p>
                    )}
                  </div>

                  {/* Divider arrow on desktop */}
                  {idx < actualSteps.length - 1 && (
                    <ChevronRight className="hidden md:block h-4 w-4 text-[#cbd5e1] dark:text-[#334155] shrink-0 ml-auto" />
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

