import {
  MedicationInteractionRule,
  MedicationReferenceRecord,
} from '../types.js';

export const MEDICATION_REFERENCE: MedicationReferenceRecord[] = [
  {
    canonicalName: 'acetaminophen',
    aliases: ['acetaminophen', 'paracetamol', 'tylenol'],
    drugClass: 'analgesic',
    commonUses: ['pain relief', 'fever reduction'],
    commonPrecautions: ['avoid taking more than the labeled total daily dose'],
  },
  {
    canonicalName: 'ibuprofen',
    aliases: ['ibuprofen', 'advil', 'motrin'],
    drugClass: 'nsaid',
    commonUses: ['pain relief', 'fever reduction', 'inflammation relief'],
    commonPrecautions: [
      'avoid extra doses if you have stomach bleeding risk or kidney disease',
      'take with clinician or pharmacist guidance if using with blood thinners',
    ],
    pregnancyCaution:
      'ibuprofen may not be appropriate during pregnancy without clinician guidance',
  },
  {
    canonicalName: 'aspirin',
    aliases: ['aspirin'],
    drugClass: 'antiplatelet_nsaid',
    commonUses: ['pain relief', 'cardiovascular prevention in selected patients'],
    commonPrecautions: [
      'do not combine casually with other blood-thinning medicines',
    ],
  },
  {
    canonicalName: 'warfarin',
    aliases: ['warfarin', 'coumadin'],
    drugClass: 'anticoagulant',
    commonUses: ['blood clot prevention'],
    commonPrecautions: [
      'interaction checking matters before adding new medicines',
      'bleeding symptoms need prompt medical review',
    ],
  },
  {
    canonicalName: 'amoxicillin',
    aliases: ['amoxicillin'],
    drugClass: 'penicillin_antibiotic',
    commonUses: ['bacterial infection treatment'],
    commonPrecautions: ['do not reuse leftover antibiotic courses casually'],
    allergyCrossCheckGroup: 'penicillin',
  },
  {
    canonicalName: 'metformin',
    aliases: ['metformin'],
    drugClass: 'biguanide',
    commonUses: ['blood sugar control in type 2 diabetes'],
    commonPrecautions: ['stomach upset can happen when starting treatment'],
  },
  {
    canonicalName: 'lisinopril',
    aliases: ['lisinopril'],
    drugClass: 'ace_inhibitor',
    commonUses: ['blood pressure control', 'heart failure support'],
    commonPrecautions: ['new facial swelling needs urgent review'],
    pregnancyCaution:
      'lisinopril is generally not a medication to continue casually during pregnancy',
  },
  {
    canonicalName: 'insulin',
    aliases: ['insulin'],
    drugClass: 'insulin',
    commonUses: ['blood sugar control'],
    commonPrecautions: ['double dosing can cause dangerous low blood sugar'],
  },
  {
    canonicalName: 'prednisone',
    aliases: ['prednisone'],
    drugClass: 'corticosteroid',
    commonUses: ['inflammation control', 'allergic reaction treatment'],
    commonPrecautions: ['do not change longer courses abruptly without guidance'],
  },
];

export const MEDICATION_INTERACTION_RULES: MedicationInteractionRule[] = [
  {
    medications: ['warfarin', 'ibuprofen'],
    severity: 'high',
    label: 'high-risk anticoagulant and pain-reliever combination',
    recommendation:
      'avoid combining unless a clinician specifically advised it and bleeding risk has been reviewed',
  },
  {
    medications: ['warfarin', 'aspirin'],
    severity: 'high',
    label: 'high-risk anticoagulant and antiplatelet combination',
    recommendation:
      'do not add aspirin casually when already taking warfarin without clinician review',
  },
  {
    medications: ['ibuprofen', 'aspirin'],
    severity: 'moderate',
    label: 'nsaid overlap may increase stomach bleeding risk',
    recommendation:
      'avoid casual overlap and ask a clinician or pharmacist if both are being considered',
  },
];

export function findMedicationReference(
  medicationName: string,
): MedicationReferenceRecord | undefined {
  return MEDICATION_REFERENCE.find(
    (record) => record.canonicalName === medicationName,
  );
}

export function findMedicationInteractionRules(
  medicationNames: string[],
): MedicationInteractionRule[] {
  return MEDICATION_INTERACTION_RULES.filter((rule) =>
    rule.medications.every((medication) => medicationNames.includes(medication)),
  );
}
