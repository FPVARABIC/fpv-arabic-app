export type PilotGearTier = 'budget' | 'mid' | 'premium' | 'essential' | 'recommended';

export interface PilotGearPart {
  id: string;
  category: 'radio' | 'goggles' | 'charger' | 'camera' | 'accessory';
  tier: PilotGearTier;
  protocolOrSystem?: string;
  subCategory?: string;
  nameEn: string;
  brand?: string;
  priceRangeUSD?: [number, number];
  function: string;
  specs: string;
  compatibility: string;
  whyChoose: string;
  notFor: string;
  whatIf: string;
  upgradePath?: string;
  safetyWarning?: string;
  lastReviewed?: string;
  confidence?: 'مؤكد' | 'تجربة مجتمع' | 'رأي أولي' | 'مؤكد جزئيًا';
  sourceUrl?: string;
}

export interface PilotGearExpertRule {
  id: string;
  category: string;
  scenario: string;
  ruleType: 'WARNING' | 'BLOCK';
  explanation: string;
  severity: 'low' | 'medium' | 'high';
  validExample: string;
  invalidExample: string;
  lastReviewed?: string;
  confidence?: 'مؤكد' | 'تجربة مجتمع' | 'رأي أولي' | 'مؤكد جزئيًا';
}
