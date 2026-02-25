

export interface FixSuggestion {
  id: string;
  type: 'force_replace_range' | 'replace_selection';
  label: string;
  indices?: [number, number]; // [start, end] exclusive for force replace
}

export interface EditTask {
  id: string;
  explanation: string;
  originalText: string;
  replacementText: string;
  status: 'pending' | 'applied' | 'rejected' | 'failed';
  failureReason?: string; // Analysis of why the match failed
  fixSuggestions?: FixSuggestion[]; // Actionable operations for the user
}

export interface ExpertProfile {
  domain: string;
  title: string;
  competency: string; // e.g., "Top 1% Neuroscientist"
}

export interface CritiqueReport {
  overallScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  missingPillars: string[]; // Key theoretical concepts missing
  strategicGoal: string; // The high-level goal for optimization
}

export interface PlanResponse {
  expertProfile: ExpertProfile;
  critique: CritiqueReport;
  thoughts: string; // Brief internal monologue
  tasks: EditTask[];
  debugInfo?: {
    plannerSystemPrompt: string;
    plannerUserPrompt: string;
    editorSystemPrompt: string;
    editorUserPrompt: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  // Optional: Attach the plan details to the message for rendering specialized UI
  expertPlan?: PlanResponse;
}

export type AIProvider = 'gemini' | 'openai';

export interface AppSettings {
  provider: AIProvider;
  geminiApiKey: string; // User override or env
  geminiModel: string; // User selected model
  openaiBaseUrl: string;
  openaiApiKey: string;
  openaiModel: string;
}
