import { createHash } from 'node:crypto';
import { prisma } from '../../lib/prisma';

export type CounsellingTrigger = {
  rule: string;
  severity: string;
  drug: string;
  flags: string[];
};

function normalizeList(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function buildFlagsSentence(flags: string[]) {
  if (!flags.length) {
    return 'No additional patient flags were provided.';
  }

  return `Patient flags: ${flags.join(', ')}.`;
}

function buildSuggestion(trigger: CounsellingTrigger) {
  const normalizedSeverity = trigger.severity.trim().toUpperCase();
  const flagsSentence = buildFlagsSentence(trigger.flags);

  if (normalizedSeverity === 'CONTRAINDICATED' || normalizedSeverity === 'MAJOR') {
    return `Severity remains ${trigger.severity}. Explain that ${trigger.drug} has a high-risk rule trigger: ${trigger.rule}. Advise the patient to stop and seek pharmacist or PIC review before continuing. ${flagsSentence}`;
  }

  if (normalizedSeverity === 'MODERATE') {
    return `Severity remains ${trigger.severity}. Explain that ${trigger.drug} triggered this rule: ${trigger.rule}. Counsel the patient on warning symptoms, reinforce correct dosing and timing, and advise pharmacist review if symptoms appear or worsen. ${flagsSentence}`;
  }

  return `Severity remains ${trigger.severity}. Explain that ${trigger.drug} triggered this rule: ${trigger.rule}. Reinforce adherence, expected monitoring, and when to ask the pharmacy team for review. ${flagsSentence}`;
}

export async function getCounsellingSuggestions(input: {
  pharmacyId: string;
  userId: string;
  triggers: CounsellingTrigger[];
}) {
  const suggestions = [];

  for (const trigger of input.triggers) {
    const flags = normalizeList(trigger.flags);
    const ruleKey = trigger.rule.trim();
    const drugName = trigger.drug.trim();
    const severity = trigger.severity.trim();
    const flagsHash = createHash('sha256').update(JSON.stringify(flags)).digest('hex');

    const existing = await prisma.aiCounsellingCache.findUnique({
      where: {
        pharmacyId_ruleKey_severity_drugName_flagsHash: {
          pharmacyId: input.pharmacyId,
          ruleKey,
          severity,
          drugName,
          flagsHash,
        },
      },
      select: {
        id: true,
        suggestionText: true,
        source: true,
      },
    });

    if (existing) {
      suggestions.push({
        id: existing.id,
        rule: ruleKey,
        severity,
        drug: drugName,
        flags,
        suggestionText: existing.suggestionText,
        source: existing.source,
        cached: true,
      });
      continue;
    }

    const suggestionText = buildSuggestion({
      rule: ruleKey,
      severity,
      drug: drugName,
      flags,
    });

    const created = await prisma.aiCounsellingCache.create({
      data: {
        pharmacyId: input.pharmacyId,
        ruleKey,
        severity,
        drugName,
        flagsHash,
        flags,
        suggestionText,
        createdBy: input.userId,
      },
      select: {
        id: true,
        suggestionText: true,
        source: true,
      },
    });

    suggestions.push({
      id: created.id,
      rule: ruleKey,
      severity,
      drug: drugName,
      flags,
      suggestionText: created.suggestionText,
      source: created.source,
      cached: false,
    });
  }

  return suggestions;
}
