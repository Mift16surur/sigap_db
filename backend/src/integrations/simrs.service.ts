/**
 * Integrasi Core SIMRS RSUD Siaga Medika
 */
export class SimrsIntegrationService {
  async syncPatientMaster(mrn: string) {
    return {
      synced: true,
      mrn,
      source: "SIMRS_CORE_MOCK",
      lastUpdated: new Date().toISOString(),
    };
  }

  async getBedAvailability() {
    return [
      { unit: "VK", total: 6, occupied: 3, available: 3 },
      { unit: "HCU Maternal", total: 4, occupied: 2, available: 2 },
      { unit: "Nifas", total: 12, occupied: 8, available: 4 },
    ];
  }
}

export const simrsService = new SimrsIntegrationService();

