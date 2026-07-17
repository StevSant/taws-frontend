/**
 * One specialist's card in the live "Boardroom" view of a multi-agent turn.
 *
 * Derived (via `buildBoardroom`) from the routing + tool hops the backend
 * already streams, so a parallel fan-out turn renders as N cards lighting up
 * together instead of collapsing to a single responding-agent avatar.
 *
 * `status` lifecycle: `routing` (supervisor still selecting) is filtered out of
 * the board; a specialist moves `consulting` -> `using-tool` (while a tool is in
 * flight) -> `done`.
 *
 * `isSynthesizer` marks the fan-in step. The backend emits the synthesizer's
 * trace hardcoded as `agent: "advisor"`, so it can only be distinguished from a
 * genuine single-route `advisor` turn by context: it is the synthesizer when it
 * appears alongside >=2 distinct specialists. A lone `advisor` is a normal card.
 */
export type BoardroomAgentStatus = 'routing' | 'consulting' | 'using-tool' | 'done';

export interface BoardroomAgent {
  agent: string;
  status: BoardroomAgentStatus;
  activeTool?: string;
  isSynthesizer: boolean;
}
