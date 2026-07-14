/**
 * keystoneChat — chat request construction for the Keystone pages.
 *
 * QuestsWorkspace is the reference implementation; this mirrors its send
 * body EXACTLY (QuestsWorkspace.tsx sendMessage):
 *
 *   {
 *     message,
 *     model:      selectedModel !== "auto" ? selectedModel : undefined,
 *     focus_mode: editorMode === "focus",
 *     read_only:  readOnlyMode && editorMode !== "focus",
 *     temperature: ksTemperature,        // default 0.7
 *     max_tokens:  ksMaxTokens,          // default 32768
 *     persona:     ksPersona || undefined
 *   }
 *
 * Notes preserved from the reference:
 * - focus_mode / read_only are ALWAYS present as booleans (false included).
 * - read_only is suppressed in focus mode (focus is already non-writing).
 * - persona is omitted when empty; model omitted for ""/"auto".
 * - _Gex is NOT a chat mode — it is a separate one-shot scan action with
 *   gex_mode: true and its own patch pipeline (later parity increment).
 */

export type EditorMode = "keystone" | "focus";

export interface KeystoneChatSettings {
  temperature: number;
  maxTokens: number;
  persona: string;
}

export const KEYSTONE_CHAT_DEFAULTS: KeystoneChatSettings = {
  temperature: 0.7,
  maxTokens: 32768,
  persona: "",
};

export interface KeystoneChatBodyArgs {
  message: string;
  model?: string;
  editorMode: EditorMode;
  readOnlyMode: boolean;
  settings?: Partial<KeystoneChatSettings>;
}

export function buildKeystoneChatBody(args: KeystoneChatBodyArgs): Record<string, unknown> {
  const s = { ...KEYSTONE_CHAT_DEFAULTS, ...(args.settings || {}) };
  return {
    message: args.message,
    model: args.model && args.model !== "auto" ? args.model : undefined,
    focus_mode: args.editorMode === "focus",
    read_only: args.readOnlyMode && args.editorMode !== "focus",
    temperature: s.temperature,
    max_tokens: s.maxTokens,
    persona: s.persona || undefined,
  };
}
