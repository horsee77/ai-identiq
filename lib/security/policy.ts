export const securityPolicies = {
  upload: {
    maxFileSizeMb: 20,
    allowedMimeTypes: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ],
  },
  authentication: {
    maxLoginAttemptsPerWindow: 8,
    sessionTtlHours: 12,
    resetTokenTtlMinutes: 30,
  },
  aiGuardrails: {
    requireHumanHandoffOnCriticalRisk: true,
    forbidUnsupportedComplianceClaims: true,
    forbidBiometricResultFabrication: true,
    forbidDocumentApprovalWithoutEvidence: true,
  },
} as const;
