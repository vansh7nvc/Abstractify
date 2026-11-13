export const AGENT_NAMES = ['memory', 'search', 'analysis', 'methodology', 'writing'] as const;

export type AgentName = (typeof AGENT_NAMES)[number];
export type OrchestrationMode = 'sequential' | 'parallel';

export interface AgentTool {
    name: string;
    description: string;
}

export interface AgentRunInput {
    query: string;
    context?: string;
    sessionId?: string;
    priorResults: Partial<Record<AgentName, string>>;
}

export interface AgentDefinition {
    name: AgentName;
    description: string;
    systemPrompt: string;
    tools: AgentTool[];
    loadContext?: (input: AgentRunInput, apiKey: string) => Promise<string>;
}

export interface AgentResult {
    agent: AgentName;
    content: string;
    tools: string[];
    durationMs: number;
}

export type AgentLifecycleType = 'agent:start' | 'agent:done' | 'agent:error';

export interface AgentLifecycleEvent {
    type: AgentLifecycleType;
    agent: AgentName;
    timestamp: string;
    durationMs?: number;
    error?: string;
}

export interface OrchestrationRequest {
    query: string;
    context?: string;
    sessionId?: string;
    mode?: OrchestrationMode;
    agents?: AgentName[];
}

export interface OrchestrationResult {
    id: string;
    mode: OrchestrationMode;
    finalAnswer: string;
    results: AgentResult[];
    events: AgentLifecycleEvent[];
}

export type AgentInvoker = (
    agent: AgentDefinition,
    input: AgentRunInput,
    apiKey: string,
) => Promise<string>;

export type LifecycleSink = (event: AgentLifecycleEvent) => void;
export type SupervisorInvoker = (prompt: string, apiKey: string) => Promise<string>;
