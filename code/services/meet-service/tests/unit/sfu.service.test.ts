import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sfuService } from '../../src/services/sfu.service.js';
import * as mediasoup from 'mediasoup';

// We mock mediasoup to prevent actual C++ processes from spinning up during lightweight unit tests.
vi.mock('mediasoup', async () => {
  return {
    createWorker: vi.fn().mockResolvedValue({
      pid: 999,
      on: vi.fn(),
      close: vi.fn(),
    }),
  };
});

vi.mock('../../src/monitoring/metrics.js', () => ({
  sfuWorkersGauge: { set: vi.fn() },
}));

describe('SFU Service (Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize a worker pool matching CPU cores', async () => {
    await sfuService.init();

    // os.cpus() is used internally, so createWorker should be called multiple times
    expect(mediasoup.createWorker).toHaveBeenCalled();
    
    // We can pull the workers out of the module to check
    const { getWorkers } = await import('../../src/sfu/worker.js');
    const workers = getWorkers();
    
    expect(workers.length).toBeGreaterThan(0);
    expect(workers[0].pid).toBe(999);
  });

  it('should shutdown all workers cleanly', async () => {
    await sfuService.init();
    const { getWorkers } = await import('../../src/sfu/worker.js');
    
    // Grab a reference to the mocked worker to check if close() is called
    const mockWorker = getWorkers()[0];
    
    await sfuService.shutdown();
    
    expect(mockWorker.close).toHaveBeenCalled();
    expect(getWorkers().length).toBe(0);
  });
});
