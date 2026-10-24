import { apiClient as api } from '../utils/apiClient';

export interface FileUploader {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface ProjectFile {
  id: string;
  projectId: string;
  folderId: string | null;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  uploader: FileUploader | null;
  /** On cross-project listings. */
  project?: { id: string; name: string };
  folder?: { id: string; name: string } | null;
}

export interface ProjectFolder {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  createdBy: string | null;
  createdAt: string;
  items: number;
}

export interface FolderListing {
  folderId: string | null;
  breadcrumb: { id: string; name: string }[];
  canWrite: boolean;
  isAdmin: boolean;
  folders: ProjectFolder[];
  files: ProjectFile[];
}

export const MAX_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

export const fileService = {
  async list(projectId: string, folderId: string | null): Promise<FolderListing> {
    const { data } = await api.get(`/project/projects/${projectId}/files`, { params: folderId ? { folderId } : {} });
    return data;
  },

  /** Newest files across all your projects, optionally narrowed. */
  async recent(params: { projectId?: string; q?: string; limit?: number } = {}): Promise<ProjectFile[]> {
    const { data } = await api.get('/project/files', { params });
    return data;
  },

  async createFolder(projectId: string, name: string, parentId: string | null): Promise<ProjectFolder> {
    const { data } = await api.post(`/project/projects/${projectId}/folders`, { name, parentId });
    return data;
  },

  async renameFolder(folderId: string, name: string): Promise<void> {
    await api.patch(`/project/folders/${folderId}`, { name });
  },

  async deleteFolder(folderId: string): Promise<void> {
    await api.delete(`/project/folders/${folderId}`);
  },

  async upload(
    projectId: string,
    folderId: string | null,
    files: File[],
    onProgress?: (fraction: number) => void
  ): Promise<ProjectFile[]> {
    const form = new FormData();
    if (folderId) form.append('folderId', folderId);
    for (const file of files) form.append('files', file, file.name);
    const { data } = await api.post(`/project/projects/${projectId}/files`, form, {
      // Let the browser set the multipart boundary.
      headers: { 'Content-Type': undefined as any },
      onUploadProgress: (e) => e.total && onProgress?.(e.loaded / e.total),
    });
    return data;
  },

  async update(fileId: string, patch: { name?: string; folderId?: string | null }): Promise<ProjectFile> {
    const { data } = await api.patch(`/project/files/${fileId}`, patch);
    return data;
  },

  async remove(fileId: string): Promise<void> {
    await api.delete(`/project/files/${fileId}`);
  },

  /**
   * Downloads need the bearer token, so they are fetched as a blob rather than
   * linked to directly.
   */
  async blob(fileId: string, download = false): Promise<Blob> {
    const { data } = await api.get(`/project/files/${fileId}/content`, {
      params: download ? { download: 1 } : {},
      responseType: 'blob',
    });
    return data;
  },

  async download(file: Pick<ProjectFile, 'id' | 'name'>) {
    const blob = await this.blob(file.id, true);
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), { href: url, download: file.name });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export type FileKind = 'image' | 'pdf' | 'doc' | 'sheet' | 'slides' | 'video' | 'audio' | 'archive' | 'code' | 'text' | 'other';

export function fileKind(name: string, mime: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (['doc', 'docx', 'odt', 'rtf', 'pages'].includes(ext)) return 'doc';
  if (['xls', 'xlsx', 'csv', 'ods', 'numbers'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx', 'key', 'odp'].includes(ext)) return 'slides';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['ts', 'tsx', 'py', 'java', 'go', 'rs', 'json', 'yml', 'yaml', 'sql', 'html', 'css'].includes(ext)) return 'code';
  if (mime.startsWith('text/') || ['md', 'txt'].includes(ext)) return 'text';
  return 'other';
}
