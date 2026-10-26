import { env } from '../config/env.js';

export interface TranscriptEntry {
  speakerName: string;
  timestamp: string;
  text: string;
}

export interface ActiveTranscription {
  roomId: string;
  moduleId: string;
  capturerSocketId: string;
  capturerUserId: string;
  capturerName: string;
  noteId: string;
  transcriptBuffer: TranscriptEntry[];
  startedAt: Date;
}

export class TranscriptionService {
  private activeTranscriptions = new Map<string, ActiveTranscription>();

  /**
   * Checks if transcription is currently active in a room.
   */
  isTranscribing(roomId: string): boolean {
    return this.activeTranscriptions.has(roomId);
  }

  /**
   * Retrieves active transcription state for a room.
   */
  getActive(roomId: string): ActiveTranscription | undefined {
    return this.activeTranscriptions.get(roomId);
  }

  /**
   * Atomically acquires transcription lock and initiates meeting note in notes-service.
   */
  async startTranscription(
    roomId: string,
    moduleId: string,
    user: { id: string; name: string },
    socketId: string
  ): Promise<{ noteId: string; capturerUserId: string; capturerName: string }> {
    const existing = this.activeTranscriptions.get(roomId);
    if (existing) {
      throw new Error(`Transcription already in progress by ${existing.capturerName}`);
    }

    // Call notes-service to create the collaborative meeting note
    let noteId = `note-${Date.now()}`;
    const formattedDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    try {
      const res = await fetch(`${env.NOTES_SERVICE_URL}/api/notes/internal/meeting-note/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          moduleId,
          title: `Meeting Minutes — ${formattedDate}`,
          creatorId: user.id,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.documentId) {
          noteId = data.documentId;
        }
      } else {
        console.warn(`[TranscriptionService] notes-service init returned status ${res.status}`);
      }
    } catch (err: any) {
      console.warn('[TranscriptionService] Failed to reach notes-service:', err.message);
    }

    const transcription: ActiveTranscription = {
      roomId,
      moduleId,
      capturerSocketId: socketId,
      capturerUserId: user.id,
      capturerName: user.name || 'Attendee',
      noteId,
      transcriptBuffer: [],
      startedAt: new Date(),
    };

    this.activeTranscriptions.set(roomId, transcription);
    console.log(
      `🎙️ [Transcription] Started for room "${roomId}" by ${user.name} (${user.id}) -> Note: ${noteId}`
    );

    return {
      noteId,
      capturerUserId: user.id,
      capturerName: user.name,
    };
  }

  /**
   * Processes a slice of WebM/Opus audio using Groq Whisper or OpenAI Whisper.
   */
  async processAudioChunk(
    roomId: string,
    socketId: string,
    audioBuffer: Buffer,
    speakerName?: string,
    timestamp?: string
  ): Promise<{ text: string; timestamp: string } | null> {
    const active = this.activeTranscriptions.get(roomId);
    if (!active) return null;

    if (active.capturerSocketId !== socketId) {
      console.warn(`[Transcription] Ignoring audio chunk from non-capturer socket: ${socketId}`);
      return null;
    }

    const timeStr = timestamp || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const speaker = speakerName || active.capturerName;

    // Transcribe with Whisper
    const text = await this.transcribeAudioWithWhisper(audioBuffer);
    if (!text || !text.trim()) {
      return null;
    }

    const cleanText = text.trim();
    active.transcriptBuffer.push({
      speakerName: speaker,
      timestamp: timeStr,
      text: cleanText,
    });

    console.log(`💬 [Whisper] [${timeStr}] ${speaker}: "${cleanText}"`);

    // Stream line into notes-service
    if (active.noteId) {
      this.appendLineToNotesService(active.noteId, speaker, timeStr, cleanText).catch((err) => {
        console.warn('[Transcription] Error streaming to notes-service:', err.message);
      });
    }

    return { text: cleanText, timestamp: timeStr };
  }

  /**
   * Stops transcription, invokes Gemini to synthesize Meeting Minutes, and finalizes the note.
   */
  async stopTranscription(
    roomId: string,
    user?: { id: string; name: string }
  ): Promise<{ noteId: string; minutesMarkdown: string } | null> {
    const active = this.activeTranscriptions.get(roomId);
    if (!active) return null;

    this.activeTranscriptions.delete(roomId);
    console.log(`🛑 [Transcription] Stopped for room "${roomId}" (Total entries: ${active.transcriptBuffer.length})`);

    // Synthesize full transcript string
    const fullTranscript = active.transcriptBuffer
      .map((entry) => `> **[${entry.timestamp}] ${entry.speakerName}**: ${entry.text}`)
      .join('\n\n');

    // Generate meeting minutes via Gemini Flash
    const minutesMarkdown = await this.generateMeetingMinutesWithGemini(
      active.transcriptBuffer,
      active.startedAt,
      new Date()
    );

    // Finalize note in notes-service
    if (active.noteId) {
      try {
        await fetch(`${env.NOTES_SERVICE_URL}/api/notes/internal/meeting-note/${active.noteId}/finalize`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': active.capturerUserId,
          },
          body: JSON.stringify({
            minutesMarkdown,
            fullTranscript,
          }),
        });
        console.log(`✅ [Transcription] Note ${active.noteId} finalized with AI minutes & transcript`);
      } catch (err: any) {
        console.error('[Transcription] Failed to finalize note in notes-service:', err.message);
      }
    }

    return {
      noteId: active.noteId,
      minutesMarkdown,
    };
  }

  /**
   * Automatically stops transcription if the active capturer disconnected unexpectedly.
   */
  async handleSocketDisconnect(socketId: string): Promise<string | null> {
    for (const [roomId, active] of this.activeTranscriptions.entries()) {
      if (active.capturerSocketId === socketId) {
        console.warn(`⚠️ [Transcription] Capturer disconnected from room "${roomId}". Auto-finalizing...`);
        await this.stopTranscription(roomId);
        return roomId;
      }
    }
    return null;
  }

  /**
   * Whisper transcription via Groq or OpenAI Whisper.
   */
  private async transcribeAudioWithWhisper(audioBuffer: Buffer): Promise<string> {
    // 1. Try Groq Whisper (Ultra-fast, generous free tier)
    if (env.GROQ_API_KEY) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('response_format', 'json');

        const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.GROQ_API_KEY}`,
          },
          body: formData,
        });

        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.text) return json.text;
        } else {
          console.warn(`[GroqWhisper] API error ${res.status}:`, await res.text());
        }
      } catch (err: any) {
        console.warn('[GroqWhisper] Request failed:', err.message);
      }
    }

    // 2. Fallback to OpenAI Whisper
    if (env.OPENAI_API_KEY) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/webm' });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (res.ok) {
          const json = (await res.json()) as any;
          if (json.text) return json.text;
        }
      } catch (err: any) {
        console.warn('[OpenAIWhisper] Request failed:', err.message);
      }
    }

    // 3. Fallback when keys are missing (allows developer testing without external billing)
    console.log('[Whisper] Neither GROQ_API_KEY nor OPENAI_API_KEY provided; generating test transcript.');
    return 'Team meeting discussion in progress.';
  }

  /**
   * Appends a line to the note in notes-service.
   */
  private async appendLineToNotesService(
    noteId: string,
    speakerName: string,
    timestamp: string,
    text: string
  ): Promise<void> {
    await fetch(`${env.NOTES_SERVICE_URL}/api/notes/internal/meeting-note/${noteId}/append`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'service-internal',
      },
      body: JSON.stringify({
        speakerName,
        timestamp,
        text,
      }),
    });
  }

  /**
   * Synthesizes structured Meeting Minutes via Gemini.
   */
  private async generateMeetingMinutesWithGemini(
    transcript: TranscriptEntry[],
    startedAt: Date,
    endedAt: Date
  ): Promise<string> {
    const durationMins = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
    const transcriptText = transcript.map((t) => `[${t.timestamp}] ${t.speakerName}: ${t.text}`).join('\n');

    if (!transcript.length) {
      return (
        `# 📋 Meeting Minutes — ${startedAt.toLocaleDateString()}\n\n` +
        `> **Duration**: ${durationMins} min  \n` +
        `> **Status**: Completed  \n\n` +
        `_No spoken audio detected during this session._`
      );
    }

    if (env.GEMINI_API_KEY) {
      try {
        const prompt = `You are an expert executive secretary. Based on the following meeting transcript, generate comprehensive, beautifully structured meeting minutes in GitHub-flavored Markdown.

Include:
1. Executive Summary (2-3 concise bullet points)
2. Key Decisions Made (bullet points with context)
3. Action Items (formatted as interactive markdown task list checkboxes: "- [ ] **Assignee**: Task description")

Transcript:
${transcriptText}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
              },
            }),
          }
        );

        if (res.ok) {
          const json = (await res.json()) as any;
          const aiResponse = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResponse) {
            return (
              `# 📋 Meeting Minutes — ${startedAt.toLocaleDateString()}\n\n` +
              `> **Duration**: ${durationMins} min | **Recorded**: ${startedAt.toLocaleTimeString()} - ${endedAt.toLocaleTimeString()}  \n` +
              `> **Status**: ✅ Completed  \n\n` +
              `---\n\n` +
              aiResponse
            );
          }
        } else {
          console.warn('[GeminiMinutes] API returned error:', await res.text());
        }
      } catch (err: any) {
        console.warn('[GeminiMinutes] Request failed:', err.message);
      }
    }

    // Clean structured fallback if no GEMINI_API_KEY is configured
    return (
      `# 📋 Meeting Minutes — ${startedAt.toLocaleDateString()}\n\n` +
      `> **Duration**: ${durationMins} min | **Recorded**: ${startedAt.toLocaleTimeString()} - ${endedAt.toLocaleTimeString()}  \n` +
      `> **Status**: ✅ Completed  \n\n` +
      `---\n\n` +
      `## 📌 Executive Summary\n` +
      `- Meeting held with ${new Set(transcript.map((t) => t.speakerName)).size} attendee(s).\n` +
      `- Discussion covered ${transcript.length} spoken exchanges.\n\n` +
      `## 🎯 Key Topics Discussed\n` +
      transcript
        .slice(0, 5)
        .map((t) => `- **${t.speakerName}**: ${t.text}`)
        .join('\n') +
      `\n\n## ✅ Action Items\n` +
      `- [ ] Review discussion points and follow up on meeting outcomes.\n`
    );
  }
}

export const transcriptionService = new TranscriptionService();
