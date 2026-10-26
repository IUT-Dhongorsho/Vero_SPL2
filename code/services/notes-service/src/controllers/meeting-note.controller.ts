import { Request, Response } from 'express';
import { documentService } from '../services/document.service.js';
import { AuthRequest } from '../middleware/auth.js';

export const meetingNoteController = {
  /**
   * Initializes a dedicated collaborative meeting note for a module.
   */
  async initMeetingNote(req: AuthRequest, res: Response) {
    try {
      const { moduleId, title, creatorId, initialContent } = req.body;
      if (!moduleId) {
        return res.status(400).json({ error: 'moduleId is required' });
      }

      const noteTitle = title || `Meeting Minutes — ${new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      const doc = await documentService.create(
        {
          moduleId,
          title: noteTitle,
          visibility: 'public',
          editPermission: 'editable',
        },
        creatorId || req.userId || 'system'
      );

      // Seed initial content structure
      const placeholder =
        initialContent ||
        `# 📋 ${noteTitle}\n\n> **Status**: 🔴 Live Meeting in Progress...\n> **Started**: ${new Date().toLocaleString()}\n\n---\n\n## 🎙️ Live Meeting Transcript\n`;
      
      await documentService.appendTranscript(doc.id, placeholder);

      res.status(201).json({
        documentId: doc.id,
        title: noteTitle,
        doc,
      });
    } catch (err: any) {
      console.error('[MeetingNoteController] initMeetingNote error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Appends speech chunks into the active meeting note.
   */
  async appendTranscript(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { text, timestamp, speakerName } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'text is required' });
      }

      const line = `> **[${timestamp || new Date().toLocaleTimeString()}] ${speakerName || 'Speaker'}**: ${text}`;
      const updated = await documentService.appendTranscript(id, line);

      res.json({ success: true, updatedContent: updated.contentSnapshot });
    } catch (err: any) {
      console.error('[MeetingNoteController] appendTranscript error:', err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Finalizes the note by prepending AI-generated meeting minutes.
   */
  async finalizeMinutes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { minutesMarkdown, fullTranscript } = req.body;

      if (!minutesMarkdown) {
        return res.status(400).json({ error: 'minutesMarkdown is required' });
      }

      const updated = await documentService.finalizeMeetingMinutes(
        id,
        minutesMarkdown,
        fullTranscript
      );

      res.json({ success: true, doc: updated });
    } catch (err: any) {
      console.error('[MeetingNoteController] finalizeMinutes error:', err);
      res.status(500).json({ error: err.message });
    }
  },
};
