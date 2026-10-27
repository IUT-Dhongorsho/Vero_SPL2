import { notify } from '../notify.service.js';
import { inAppLink } from '../../utils/in-app-link.js';

/** @mentions in notes. notes-service already narrowed recipients to people who can read the note. */
export class NoteHandler {
  async handle(event: any) {
    const { type, data } = event ?? {};
    if (type !== 'note.mentioned') return;
    for (const userId of data.recipientIds ?? []) {
      await notify({
        userId,
        type: 'note.mentioned',
        entityId: data.noteId,
        entityType: 'note',
        actorId: data.senderId,
        title: `${data.senderName} mentioned you in ${data.noteTitle || 'a note'}`,
        body: 'Open the note to see where.',
        resourceUrl: inAppLink(data.link) ?? undefined,
      });
    }
  }
}

export const noteHandler = new NoteHandler();
