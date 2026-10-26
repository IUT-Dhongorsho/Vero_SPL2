import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TranscriptionService } from '../../src/services/transcription.service.js';
import { env } from '../../src/config/env.js';

describe('TranscriptionService (Unit)', () => {
  let service: TranscriptionService;
  const mockRoomId = 'test-room-123';
  const mockModuleId = 'module-456';
  const mockUser = { id: 'user-789', name: 'Alice' };
  const mockSocketId = 'socket-alice-1';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TranscriptionService();

    // Mock global fetch for notes-service and AI APIs
    global.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = url.toString();
      if (urlStr.includes('/api/notes/internal/meeting-note/init')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ documentId: 'doc-note-999' }),
        } as Response);
      }
      if (urlStr.includes('/api/notes/internal/meeting-note/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
        } as Response);
      }
      if (urlStr.includes('api.groq.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ text: 'Discussing quarterly goals and architectural refactor.' }),
        } as Response);
      }
      if (urlStr.includes('generativelanguage.googleapis.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: '### Executive Summary\n- Team agreed on next release schedule.' }],
                },
              },
            ],
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });
  });

  it('should start transcription and set active status', async () => {
    expect(service.isTranscribing(mockRoomId)).toBe(false);

    const result = await service.startTranscription(
      mockRoomId,
      mockModuleId,
      mockUser,
      mockSocketId
    );

    expect(result.noteId).toBe('doc-note-999');
    expect(result.capturerUserId).toBe(mockUser.id);
    expect(result.capturerName).toBe(mockUser.name);
    expect(service.isTranscribing(mockRoomId)).toBe(true);

    const active = service.getActive(mockRoomId);
    expect(active).toBeDefined();
    expect(active?.capturerSocketId).toBe(mockSocketId);
    expect(active?.moduleId).toBe(mockModuleId);
  });

  it('should reject concurrent transcription in the same room', async () => {
    await service.startTranscription(mockRoomId, mockModuleId, mockUser, mockSocketId);

    const bobUser = { id: 'user-bob', name: 'Bob' };
    const bobSocketId = 'socket-bob-2';

    await expect(
      service.startTranscription(mockRoomId, mockModuleId, bobUser, bobSocketId)
    ).rejects.toThrow(/Transcription already in progress by Alice/);
  });

  it('should reject audio chunk from non-capturer socket', async () => {
    await service.startTranscription(mockRoomId, mockModuleId, mockUser, mockSocketId);

    const fakeAudio = Buffer.from('fake-webm-opus-data');
    const result = await service.processAudioChunk(
      mockRoomId,
      'socket-unauthorized',
      fakeAudio,
      'Attacker'
    );

    expect(result).toBeNull();
    const active = service.getActive(mockRoomId);
    expect(active?.transcriptBuffer.length).toBe(0);
  });

  it('should process audio chunks from capturer and append transcript with Groq Whisper', async () => {
    await service.startTranscription(mockRoomId, mockModuleId, mockUser, mockSocketId);
    env.GROQ_API_KEY = 'gsk_mock_test_key';

    const fakeAudio = Buffer.from('fake-webm-opus-data');
    const chunkResult = await service.processAudioChunk(
      mockRoomId,
      mockSocketId,
      fakeAudio,
      'Alice',
      '10:30:00 AM'
    );

    expect(chunkResult).toBeDefined();
    expect(chunkResult?.text).toBe('Discussing quarterly goals and architectural refactor.');

    const active = service.getActive(mockRoomId);
    expect(active?.transcriptBuffer.length).toBe(1);
    expect(active?.transcriptBuffer[0].speakerName).toBe('Alice');
    expect(active?.transcriptBuffer[0].text).toContain('Discussing quarterly goals');
  });

  it('should process audio chunks with fallback when no API key is provided', async () => {
    await service.startTranscription(mockRoomId, mockModuleId, mockUser, mockSocketId);
    env.GROQ_API_KEY = undefined;
    env.OPENAI_API_KEY = undefined;

    const fakeAudio = Buffer.from('fake-webm-opus-data');
    const chunkResult = await service.processAudioChunk(
      mockRoomId,
      mockSocketId,
      fakeAudio,
      'Alice',
      '10:30:00 AM'
    );

    expect(chunkResult).toBeDefined();
    expect(chunkResult?.text).toBe('Team meeting discussion in progress.');
  });

  it('should stop transcription, finalize AI minutes, and release room lock', async () => {
    await service.startTranscription(mockRoomId, mockModuleId, mockUser, mockSocketId);
    env.GROQ_API_KEY = 'gsk_mock_test_key';
    env.GEMINI_API_KEY = 'gemini_mock_key';

    // Append one chunk so transcript is not empty
    await service.processAudioChunk(
      mockRoomId,
      mockSocketId,
      Buffer.from('fake-data'),
      'Alice',
      '10:30:00 AM'
    );

    const stopResult = await service.stopTranscription(mockRoomId);

    expect(stopResult).toBeDefined();
    expect(stopResult?.noteId).toBe('doc-note-999');
    expect(stopResult?.minutesMarkdown).toContain('Executive Summary');
    expect(service.isTranscribing(mockRoomId)).toBe(false);
    expect(service.getActive(mockRoomId)).toBeUndefined();
  });

  it('should handle socket disconnect and auto-finalize active session', async () => {
    await service.startTranscription(mockRoomId, mockModuleId, mockUser, mockSocketId);
    expect(service.isTranscribing(mockRoomId)).toBe(true);

    const affectedRoom = await service.handleSocketDisconnect(mockSocketId);

    expect(affectedRoom).toBe(mockRoomId);
    expect(service.isTranscribing(mockRoomId)).toBe(false);

    // Disconnect of unrelated socket returns null
    const unrelated = await service.handleSocketDisconnect('random-socket');
    expect(unrelated).toBeNull();
  });
});
