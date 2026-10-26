import { notify } from '../notify.service.js';

export class ResourceHandler {
  async handle(event: any) {
    const { type, data } = event ?? {};
    if (type !== 'file.uploaded') return;

    const names: string[] = data.fileNames ?? [];
    const what = names.length === 1 ? names[0] : `${names.length} files`;
    const folder = data.folderId ? `&folder=${data.folderId}` : '';

    // Grouped per uploader and project, so a burst of uploads is one row.
    for (const userId of (data.recipientIds ?? []) as string[]) {
      await notify({
        userId,
        type: 'file.uploaded',
        entityId: `${data.projectId}:${data.uploaderId}`,
        entityType: 'project_file',
        actorId: data.uploaderId,
        title: `${data.uploaderName} added ${what} to ${data.projectName}`,
        body: names.length > 1 ? names.slice(0, 5).join(', ') + (names.length > 5 ? '…' : '') : null as any,
        resourceUrl: `/project/${data.projectId}?tab=files${folder}`,
      });
    }
  }
}

export const resourceHandler = new ResourceHandler();
