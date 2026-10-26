import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Project Service Integration Tests (FR)', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  describe('Unauthenticated Access', () => {
    it('should reject the project list without a token', async () => {
      const res = await request(app).get('/project/projects');
      expect(res.status).toBe(401);
    });
  });
});
