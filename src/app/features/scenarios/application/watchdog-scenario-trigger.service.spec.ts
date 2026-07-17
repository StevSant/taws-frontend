import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { AppConfigService } from '../../../core';
import { WatchdogScenarioTrigger } from './watchdog-scenario-trigger.service';

const config = { apiBaseUrl: 'http://localhost:8000' } as AppConfigService;

describe('WatchdogScenarioTrigger', () => {
  it('POSTs to the watchdog evaluate-scenarios endpoint and returns the matched count', async () => {
    const post = vi.fn().mockReturnValue(of([{ scenario_id: 'a' }, { scenario_id: 'b' }]));
    const http = { post } as unknown as HttpClient;
    const trigger = new WatchdogScenarioTrigger(http, config);

    const matchedCount = await trigger.evaluate();

    expect(matchedCount).toBe(2);
    expect(post).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/watchdog/evaluate-scenarios',
      {},
    );
  });

  it('returns 0 when no monitor matched', async () => {
    const post = vi.fn().mockReturnValue(of([]));
    const http = { post } as unknown as HttpClient;
    const trigger = new WatchdogScenarioTrigger(http, config);

    expect(await trigger.evaluate()).toBe(0);
  });
});
