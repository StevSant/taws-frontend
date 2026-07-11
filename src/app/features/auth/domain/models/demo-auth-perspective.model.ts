import { TranslationKey } from '../../../../core';

/** One-click demo login persona (dev only — credentials must exist in Supabase Auth). */
export interface DemoAuthPerspective {
  id: 'analyst' | 'portfolio' | 'compliance';
  email: string;
  password: string;
  roleKey: TranslationKey;
  personaKey: TranslationKey;
  icon: 'analyst' | 'portfolio' | 'compliance';
}
