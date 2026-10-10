import type { Evidence, GroundingFinding } from "./contracts.ts";

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Classifies explicitly supplied claim/evidence pairs. It does not extract claims
 * from arbitrary prose and therefore makes no general fact-checking claim.
 */
export function classifyGrounding(
  claim: string,
  evidence: Evidence[],
  contradictedBy: string[] = [],
): GroundingFinding {
  const normalizedClaim = normalize(claim);
  const matching = evidence.filter((item) => {
    const text = normalize(item.text);
    return text === normalizedClaim || text.includes(normalizedClaim);
  });
  const conflict = contradictedBy.find((fact) => {
    const normalizedFact = normalize(fact);
    return normalizedFact && (normalizedClaim.includes(normalizedFact) || normalizedFact.includes(normalizedClaim));
  });

  if (conflict) {
    return { claim, label: "CONTRADICTED", evidenceRefs: evidence.map((item) => item.id), rationale: `Conflicts with supplied reference fact: ${conflict}` };
  }
  if (matching.length > 0) {
    return { claim, label: "SUPPORTED", evidenceRefs: matching.map((item) => item.id), rationale: "Claim matches supplied evidence." };
  }
  if (evidence.length === 0) {
    return { claim, label: "UNVERIFIABLE", evidenceRefs: [], rationale: "No evidence was supplied; correctness cannot be determined." };
  }
  return { claim, label: "UNSUPPORTED", evidenceRefs: evidence.map((item) => item.id), rationale: "The supplied evidence does not support this claim." };
}

export function groundednessScore(findings: GroundingFinding[]): number | null {
  if (findings.length === 0) return null;
  const weight = { SUPPORTED: 1, CONTRADICTED: 0, UNSUPPORTED: 0, UNVERIFIABLE: null } as const;
  const judged = findings.filter((item) => weight[item.label] !== null);
  if (judged.length === 0) return null;
  return Math.round((judged.reduce((total, item) => total + weight[item.label]!, 0) / judged.length) * 100);
}
