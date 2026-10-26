import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.js';

describe('Notes Service Integration Tests (FR)', () => {
  it('should return health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('notes-service');
  });

  it('should return metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });
});

describe('malformed bodies', () => {
  it('answers invalid JSON with a JSON 400, not an HTML page', async () => {
    const res = await request(app)
      .post('/documents/00000000-0000-0000-0000-000000000000/digest')
      .set('Content-Type', 'application/json')
      .send('null');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_FAILED');
  });
});
