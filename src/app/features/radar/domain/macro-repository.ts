import { MacroState } from './models/macro-state.model';

export abstract class MacroRepository {
  abstract fetchMacroState(): Promise<MacroState>;
}
