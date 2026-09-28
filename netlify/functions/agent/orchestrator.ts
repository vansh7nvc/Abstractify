import { callGemini } from '../_utils.js';
import { agentRegistry } from './sub-agents/index.js';
import {
    AGENT_NAMES,
    AgentDefinition,
    AgentInvoker,
    AgentLifecycleEvent,
    AgentName,
    AgentResult,
    AgentRunInput,
    LifecycleSink,
    OrchestrationRequest,
    OrchestrationResult,
    SupervisorInvoker,
} from './types.js';

const PARALLEL_PHASES: AgentName[][] = [
    ['memory', 'search'],
    ['analysis', 'methodology'],
    ['writing'],
];

function serializePriorResults(results: Partial<Record<AgentName, string>>): string {
    const entries = Object.entries(results);
    if (entries.length === 0) return 'No specialist output is available yet.';
    return entries.map(([agent, content]) => `## ${agent}\n${content}`).join('\n\n');
}

function buildAgentPrompt(
    agent: AgentDefinition,
    input: AgentRunInput,
    loadedContext: string,
): string {
    return `${agent.systemPrompt}

Available tools (describe their use; do not claim a tool ran unless its output is supplied):
${agent.tools.map((tool) => `- ${tool.name}: ${tool.description}`).join('\n')}

Research request:
${input.query}

Caller context:
${input.context || 'No additional caller context.'}

Retrieved context:
${loadedContext || 'No agent-specific context.'}

Prior specialist outputs:
${serializePriorResults(input.priorResults)}

Return a focused specialist report for the executive supervisor.`;
}

const defaultAgentInvoker: AgentInvoker = async (agent, input, apiKey) => {
    const loadedContext = agent.loadContext ? await agent.loadContext(input, apiKey) : '';
    return callGemini(buildAgentPrompt(agent, input, loadedContext), 'text/plain', apiKey);
};

const defaultSupervisorInvoker: SupervisorInvoker = (prompt, apiKey) =>
    callGemini(prompt, 'text/plain', apiKey);

function buildSupervisorPrompt(query: string, results: AgentResult[]): string {
    return `You are AbstractiFy's executive research supervisor. Compile the specialist reports into one
coherent answer to the research request. Reconcile overlap, preserve material disagreement, explicitly state
evidence gaps, and do not invent sources or tool results. Use calibrated academic language.

Research request:
${query}

Specialist reports:
${results.map((result) => `## ${result.agent}\n${result.content}`).join('\n\n')}`;
}

export interface OrchestratorOptions {
    invokeAgent?: AgentInvoker;
    invokeSupervisor?: SupervisorInvoker;
    onEvent?: LifecycleSink;
    now?: () => number;
}

/** Coordinates specialized agents and returns an executive synthesis. */
export async function orchestrate(
    request: OrchestrationRequest,
    apiKey: string,
    options: OrchestratorOptions = {},
): Promise<OrchestrationResult> {
    const mode = request.mode ?? 'parallel';
    const selected = new Set(request.agents ?? AGENT_NAMES);
    const invokeAgent = options.invokeAgent ?? defaultAgentInvoker;
    const invokeSupervisor = options.invokeSupervisor ?? defaultSupervisorInvoker;
    const now = options.now ?? Date.now;
    const events: AgentLifecycleEvent[] = [];
    const resultsByAgent = new Map<AgentName, AgentResult>();

    const emit = (event: AgentLifecycleEvent) => {
        events.push(event);
        options.onEvent?.(event);
    };

    const runAgent = async (name: AgentName): Promise<void> => {
        const startedAt = now();
        emit({ type: 'agent:start', agent: name, timestamp: new Date(startedAt).toISOString() });
        const input: AgentRunInput = {
            query: request.query,
            context: request.context,
            sessionId: request.sessionId,
            priorResults: Object.fromEntries(
                [...resultsByAgent].map(([agent, result]) => [agent, result.content]),
            ),
        };

        try {
            const definition = agentRegistry[name];
            const content = await invokeAgent(definition, input, apiKey);
            const durationMs = Math.max(0, now() - startedAt);
            resultsByAgent.set(name, {
                agent: name,
                content,
                tools: definition.tools.map((tool) => tool.name),
                durationMs,
            });
            emit({
                type: 'agent:done',
                agent: name,
                timestamp: new Date(now()).toISOString(),
                durationMs,
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown agent failure';
            emit({
                type: 'agent:error',
                agent: name,
                timestamp: new Date(now()).toISOString(),
                durationMs: Math.max(0, now() - startedAt),
                error: message,
            });
            throw error;
        }
    };

    if (mode === 'sequential') {
        for (const name of AGENT_NAMES) {
            if (selected.has(name)) await runAgent(name);
        }
    } else {
        for (const phase of PARALLEL_PHASES) {
            await Promise.all(phase.filter((name) => selected.has(name)).map(runAgent));
        }
    }

    const results = AGENT_NAMES.flatMap((name) => {
        const result = resultsByAgent.get(name);
        return result ? [result] : [];
    });
    const finalAnswer = await invokeSupervisor(
        buildSupervisorPrompt(request.query, results),
        apiKey,
    );

    return {
        id: crypto.randomUUID(),
        mode,
        finalAnswer,
        results,
        events,
    };
}
