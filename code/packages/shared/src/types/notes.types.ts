export type NoteVisibility = 'private' | 'public';
export type NoteEditPermission = 'read-only' | 'editable';

export interface Note {
  id: string;
  moduleId: string;
  creatorId: string;
  title: string;
  contentSnapshot: string;
  yjsState?: Uint8Array;
  visibility: NoteVisibility;
  editPermission: NoteEditPermission;
  createdAt: string;
  updatedAt: string;
}

export interface NoteListItem extends Omit<Note, 'yjsState' | 'contentSnapshot'> {
  previewText: string;
}

export interface CreateNoteDTO {
  moduleId: string;
  title: string;
  visibility: NoteVisibility;
  editPermission: NoteEditPermission;
}

export interface UpdateNoteMetaDTO {
  title?: string;
  visibility?: NoteVisibility;
  editPermission?: NoteEditPermission;
}
