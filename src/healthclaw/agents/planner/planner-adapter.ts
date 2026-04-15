import { PlannerContext, PlannerDecision } from '../../types.js';
import { runMockPlanner } from './mock-planner.js';

export interface PlannerAgentAdapter {
  plannerId: string;
  decide(context: PlannerContext): PlannerDecision;
}

class MockPlannerAdapter implements PlannerAgentAdapter {
  plannerId = 'mock-planner-v1';

  decide(context: PlannerContext): PlannerDecision {
    const decision = runMockPlanner(context);
    return {
      ...decision,
      plannerId: this.plannerId,
    };
  }
}

const defaultPlannerAdapter = new MockPlannerAdapter();

export function getDefaultPlannerAdapter(): PlannerAgentAdapter {
  return defaultPlannerAdapter;
}

export function runPlannerAgent(context: PlannerContext): PlannerDecision {
  return defaultPlannerAdapter.decide(context);
}
