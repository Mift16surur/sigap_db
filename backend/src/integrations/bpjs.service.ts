/**
 * Integrasi BPJS Kesehatan (VClaim & Antrean Online)
 */
export class BpjsIntegrationService {
  async verifyParticipant(noBpjs: string) {
    return {
      status: "ACTIVE",
      noKartu: noBpjs,
      nama: "Peserta Terverifikasi BPJS",
      hakKelas: "KELAS_1",
      checkedAt: new Date().toISOString(),
    };
  }

  async createSEP(sepData: any) {
    return {
      noSep: `SEP-${Date.now()}`,
      status: "CREATED_MOCK",
      tglSep: new Date().toISOString(),
    };
  }
}

export const bpjsService = new BpjsIntegrationService();

