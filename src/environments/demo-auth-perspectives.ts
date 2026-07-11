import { DemoAuthPerspective } from '../app/features/auth/domain/models/demo-auth-perspective.model';

/**
 * Dev-only demo personas for one-click login. Create matching users in Supabase
 * Auth (same emails + shared password) before using the role buttons.
 */
export const DEMO_AUTH_PERSPECTIVES: DemoAuthPerspective[] = [
  {
    id: 'analyst',
    email: 'analista@midas.demo',
    password: 'MidasDemo26!',
    roleKey: 'auth.demo.role.analyst',
    personaKey: 'auth.demo.persona.analyst',
    icon: 'analyst',
  },
  {
    id: 'portfolio',
    email: 'gestor@midas.demo',
    password: 'MidasDemo26!',
    roleKey: 'auth.demo.role.portfolio',
    personaKey: 'auth.demo.persona.portfolio',
    icon: 'portfolio',
  },
  {
    id: 'compliance',
    email: 'compliance@midas.demo',
    password: 'MidasDemo26!',
    roleKey: 'auth.demo.role.compliance',
    personaKey: 'auth.demo.persona.compliance',
    icon: 'compliance',
  },
];
