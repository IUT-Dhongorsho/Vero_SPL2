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
  transcriptNoteId: string;
  noteId: string;
  formattedStart: string;
  transcriptBuffer: TranscriptEntry[];
  startedAt: Date;
}

export const MEETING_MINUTES_SYSTEM_PROMPT = `You are an expert executive scribe and technical program manager. Your role is to analyze multi-speaker meeting transcripts and synthesize rigorous, beautifully formatted, and actionable Meeting Minutes.

# INSTRUCTIONS & PRINCIPLES
1. **Absolute Factual Fidelity**: Extract only information, decisions, and commitments explicitly articulated in the transcript. Never invent names, deadlines, metrics, or decisions not stated by participants.
2. **Attribution Accuracy**: Accurately associate discussion points and commitments with the speaking participant. If an assignee was not specified for an action item, mark it as "Unassigned".
3. **Tone & Style**: Professional, objective, concise, and structured. Use GitHub Flavored Markdown (GFM).
4. **Language**: Write the minutes in the primary language spoken during the meeting.

# REQUIRED STRUCTURE

### 🧭 1. Meeting Classification & Category Pointer
Categorize the meeting prominently at the top with clear badges/pointers:
- **Tone & Formality**: [Formal | Semi-Formal | Casual / Social]
- **Meeting Category**: Select one of:
  - 🛠️ **Serious Work / Module-Specific Execution**: Concrete technical implementation, bug fixing, task breakdown, or direct module deliverables.
  - 🌐 **Project-Wide Strategy & Architecture**: High-level cross-module planning, system design, roadmap, or organizational decisions.
  - ☕ **Casual Sync / Team Catch-up**: Light status updates and team synchronization with minimal technical depth.
  - 💬 **Casual / Gossip & Non-Work Banter**: Conversational chatter, personal updates, or unstructured gossip with no work outputs.
- **Pointer Rationale**: 1-2 concise sentences explicitly citing dialogue evidence for why this category was assigned.

### 📌 2. Meeting Objective & Scope
- A 1-2 sentence statement capturing the core purpose and scope of the meeting.

### ⚡ 3. Executive Summary
- 2 to 4 bullet points outlining highest-impact takeaways, milestone updates, or critical topics covered.
- If classified as "Casual / Gossip & Non-Work Banter", summarize the conversation honestly without inventing work milestones.

### 🎯 4. Key Discussions & Insights
- Group discussions by logical topic (not merely chronological timeline).
- For each topic, summarize perspectives, technical context, and conclusions reached:
  - **[Topic / Area]**: Core discussion summary highlighting participant consensus or trade-offs evaluated.

### ⚖️ 5. Decisions Made
- Clear, bulleted list of final decisions agreed upon during the call.
- Format:
  - **Decision**: Concise description of what was decided.
    - *Rationale*: Brief context or reasoning behind the choice.
- If no decisions were made, state: _"None recorded."_

### ✅ 6. Action Items & Commitments
- Use interactive Markdown checkboxes: \`- [ ]\`
- Format each item strictly as:
  \`- [ ] **[Assignee Name or "Unassigned"]**: [Imperative task description] — Priority: [High | Medium | Low] | Due: [Target date or "TBD"]\`
- If no action items were generated, state: _"None recorded."_

### ❓ 7. Parking Lot / Open Questions
- Bullet points noting any unresolved questions, blockers, or topics explicitly deferred to future discussions.
- If no topics were deferred, state: _"None recorded."_`;

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
   * Atomically acquires transcription lock and initiates meeting transcript note in notes-service.
   */
  async startTranscription(
    roomId: string,
    moduleId: string,
    user: { id: string; name: string },
    socketId: string
  ): Promise<{ noteId: string; transcriptNoteId: string; capturerUserId: string; capturerName: string }> {
    const existing = this.activeTranscriptions.get(roomId);
    if (existing) {
      throw new Error(`Transcription already in progress by ${existing.capturerName}`);
    }

    const startedAt = new Date();
    const formattedStart = startedAt.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Call notes-service to create the collaborative meeting transcript note
    let transcriptNoteId = `transcript-${Date.now()}`;
    const transcriptTitle = `Meeting Transcript — ${formattedStart}`;

    try {
      const res = await fetch(`${env.NOTES_SERVICE_URL}/api/notes/internal/meeting-note/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          moduleId,
          title: transcriptTitle,
          creatorId: user.id,
          initialContent: `## 🎙️ ${transcriptTitle}\n\n> **Started**: ${formattedStart}  \n> **Facilitator**: ${user.name}  \n> **Status**: 🔴 Live Recording in Progress  \n\n---\n`,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.documentId) {
          transcriptNoteId = data.documentId;
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
      transcriptNoteId,
      noteId: transcriptNoteId,
      formattedStart,
      transcriptBuffer: [],
      startedAt,
    };

    this.activeTranscriptions.set(roomId, transcription);
    console.log(
      `🎙️ [Transcription] Started for room "${roomId}" by ${user.name} (${user.id}) -> Transcript Note: ${transcriptNoteId}`
    );

    return {
      noteId: transcriptNoteId,
      transcriptNoteId,
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
   * Stops transcription, invokes Gemini to synthesize Meeting Minutes,
   * creates a separate Meeting Minutes note, and updates the Transcript note.
   */
  async stopTranscription(
    roomId: string,
    user?: { id: string; name: string }
  ): Promise<{ noteId: string; transcriptNoteId: string; minutesNoteId: string; minutesMarkdown: string } | null> {
    const active = this.activeTranscriptions.get(roomId);
    if (!active) return null;

    this.activeTranscriptions.delete(roomId);
    console.log(`🛑 [Transcription] Stopped for room "${roomId}" (Total entries: ${active.transcriptBuffer.length})`);

    const endedAt = new Date();
    const formattedEnd = endedAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    const durationMins = Math.max(1, Math.round((endedAt.getTime() - active.startedAt.getTime()) / 60000));

    // 1. Finalize the Transcript Note with completion status
    if (active.transcriptNoteId) {
      try {
        await fetch(`${env.NOTES_SERVICE_URL}/api/notes/internal/meeting-note/${active.transcriptNoteId}/append`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': active.capturerUserId,
          },
          body: JSON.stringify({
            text: `\n\n---\n> **Status**: ✅ Meeting Concluded at ${formattedEnd} (Total duration: ${durationMins} min)`,
            speakerName: 'System',
            timestamp: formattedEnd,
          }),
        });
      } catch (err: any) {
        console.error('[Transcription] Failed to append end status to transcript note:', err.message);
      }
    }

    // 2. Generate Meeting Minutes via Gemini Flash
    const minutesMarkdown = await this.generateMeetingMinutesWithGemini(
      active.transcriptBuffer,
      active.startedAt,
      endedAt
    );

    // 3. Create Second Dedicated Note: Meeting Minutes Note
    let minutesNoteId = `minutes-${Date.now()}`;
    const minutesTitle = `Meeting Minutes — ${active.formattedStart}`;

    const minutesBody =
      `## 📋 ${minutesTitle}\n\n` +
      `> **Session Duration**: ${durationMins} min | **Recorded**: ${active.formattedStart} – ${formattedEnd}  \n` +
      `> **Facilitator**: ${active.capturerName} | **Status**: ✅ Completed  \n` +
      `> 📄 **Companion Transcript Note**: [Meeting Transcript — ${active.formattedStart}]\n\n` +
      `---\n\n` +
      minutesMarkdown;

    try {
      const res = await fetch(`${env.NOTES_SERVICE_URL}/api/notes/internal/meeting-note/init`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': active.capturerUserId,
        },
        body: JSON.stringify({
          moduleId: active.moduleId,
          title: minutesTitle,
          creatorId: active.capturerUserId,
          initialContent: minutesBody,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.documentId) {
          minutesNoteId = data.documentId;
        }
        console.log(`✅ [Transcription] Separate Meeting Minutes Note created: ${minutesNoteId}`);
      }
    } catch (err: any) {
      console.error('[Transcription] Failed to create minutes note in notes-service:', err.message);
    }

    return {
      noteId: minutesNoteId,
      transcriptNoteId: active.transcriptNoteId,
      minutesNoteId,
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
      return `_No spoken audio detected during this session._`;
    }

    if (env.GEMINI_API_KEY) {
      const userPrompt = `Synthesize comprehensive Meeting Minutes from the following meeting transcript according to your system instructions.\n\nMeeting Transcript:\n${transcriptText}`;

      const models = [
        env.GEMINI_MODEL || 'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
      ];

      for (const model of models) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: {
                  parts: [{ text: MEETING_MINUTES_SYSTEM_PROMPT }],
                },
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                },
              }),
            }
          );

          if (res.ok) {
            const json = (await res.json()) as any;
            const parts = json.candidates?.[0]?.content?.parts || [];
            const aiResponse = parts.map((p: any) => p.text).filter(Boolean).join('\n');
            if (aiResponse) {
              return aiResponse;
            }
          } else {
            console.warn(`[GeminiMinutes] Model "${model}" returned error status ${res.status}:`, await res.text());
          }
        } catch (err: any) {
          console.warn(`[GeminiMinutes] Request failed for model "${model}":`, err.message);
        }
      }
    }

    // Clean structured fallback following the exact 7-section schema if Gemini is unavailable
    const attendeeCount = new Set(transcript.map((t) => t.speakerName)).size;
    return (
      `### 🧭 1. Meeting Classification & Category Pointer\n` +
      `- **Tone & Formality**: Semi-Formal\n` +
      `- **Meeting Category**: 🛠️ **Serious Work / Module-Specific Execution**\n` +
      `- **Pointer Rationale**: Meeting session recorded with ${transcript.length} spoken dialogue exchange(s).\n\n` +
      `### 📌 2. Meeting Objective & Scope\n` +
      `- Review module progress and coordinate project activities.\n\n` +
      `### ⚡ 3. Executive Summary\n` +
      `- Meeting held with ${attendeeCount} attendee(s).\n` +
      `- Spoken discussion covered ${transcript.length} dialogue exchange(s).\n\n` +
      `### 🎯 4. Key Discussions & Insights\n` +
      transcript
        .slice(0, 5)
        .map((t) => `- **${t.speakerName}**: ${t.text}`)
        .join('\n') +
      `\n\n### ⚖️ 5. Decisions Made\n` +
      `- _None recorded._\n\n` +
      `### ✅ 6. Action Items & Commitments\n` +
      `- [ ] **Unassigned**: Review discussion points and follow up on meeting outcomes — Priority: Medium | Due: TBD\n\n` +
      `### ❓ 7. Parking Lot / Open Questions\n` +
      `- _None recorded._`
    );
  }
}

export const transcriptionService = new TranscriptionService();
