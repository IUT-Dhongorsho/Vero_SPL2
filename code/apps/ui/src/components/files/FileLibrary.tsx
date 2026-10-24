import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Download, Eye, FolderPlus, Pencil, Search, Trash2, Upload, UploadCloud } from 'lucide-react';
import {
  fileService,
  formatBytes,
  MAX_FILE_BYTES,
  MAX_FILES_PER_UPLOAD,
  type FolderListing,
  type ProjectFile,
  type ProjectFolder,
} from '../../services/fileService';
import { useAuthStore } from '../../stores/auth.store';
import { AnimatedButton } from '../ui/AnimatedButton';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { Field, inputClass } from '../ui/Field';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { RowMenu } from '../ui/RowMenu';
import { ListSkeleton } from '../ui/Skeleton';
import { toast } from '../Providers/ToastProvider';
import { FileIcon, FolderIcon } from './FileIcon';
import { FilePreview } from './FilePreview';
import { errorMessage } from '../../utils/errors';
import { timeAgo } from '../../utils/dateUtils';
import { cn } from '../../utils/cn';

interface FileLibraryProps {
  projectId: string;
  projectName: string;
  /** Places Upload / New folder in the page's top bar. */
  setActions: (node: React.ReactNode) => void;
}

interface UploadState {
  names: string[];
  progress: number;
}

/** A row being renamed: a folder or a file. */
type Renaming = { kind: 'folder'; item: ProjectFolder } | { kind: 'file'; item: ProjectFile };
type Deleting = Renaming;

const FILE_DRAG_TYPE = 'application/x-vero-file';

/**
 * A project's shared files. The folder being viewed lives in the URL
 * (`?folder=`) so links from notifications land in the right place. Files from
 * the desktop can be dropped anywhere on the panel; a file row can be dragged
 * onto a folder, or onto the breadcrumb, to move it.
 */
export const FileLibrary: React.FC<FileLibraryProps> = ({ projectId, projectName, setActions }) => {
  const me = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const folderId = params.get('folder');

  const [listing, setListing] = useState<FolderListing | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [upload, setUpload] = useState<UploadState | null>(null);
  const [dragDepth, setDragDepth] = useState(0);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProjectFile | null>(null);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [renaming, setRenaming] = useState<Renaming | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deleting, setDeleting] = useState<Deleting | null>(null);
  const [busy, setBusy] = useState(false);
  const picker = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const data = await fileService.list(projectId, folderId);
      setListing(data);
      setFailed(null);
    } catch (error: any) {
      if (error?.response?.status === 404 && folderId) {
        // The folder was deleted or never existed — fall back to the root.
        setParams((p) => {
          p.delete('folder');
          return p;
        }, { replace: true });
        return;
      }
      setFailed(errorMessage(error, 'Could not load files'));
    }
  }, [projectId, folderId, setParams]);

  useEffect(() => {
    setListing(null);
    setFilter('');
    load();
  }, [load]);

  const openFolder = (id: string | null) =>
    setParams((p) => {
      if (id) p.set('folder', id);
      else p.delete('folder');
      return p;
    });

  const canWrite = listing?.canWrite ?? false;

  const startUpload = useCallback(
    async (incoming: File[]) => {
      if (!canWrite || incoming.length === 0) return;
      const tooBig = incoming.filter((f) => f.size > MAX_FILE_BYTES);
      if (tooBig.length) toast.error(`${tooBig.map((f) => f.name).join(', ')} ${tooBig.length === 1 ? 'is' : 'are'} over 50 MB`);
      const files = incoming.filter((f) => f.size <= MAX_FILE_BYTES).slice(0, MAX_FILES_PER_UPLOAD);
      if (incoming.length > MAX_FILES_PER_UPLOAD) toast(`Uploading the first ${MAX_FILES_PER_UPLOAD} files — add the rest in another batch.`);
      if (files.length === 0) return;

      setUpload({ names: files.map((f) => f.name), progress: 0 });
      try {
        const added = await fileService.upload(projectId, folderId, files, (progress) =>
          setUpload((u) => (u ? { ...u, progress } : u))
        );
        toast.success(added.length === 1 ? `Uploaded ${added[0].name}` : `Uploaded ${added.length} files`);
        await load();
      } catch (error) {
        toast.error(errorMessage(error, 'Upload failed'));
      } finally {
        setUpload(null);
      }
    },
    [canWrite, projectId, folderId, load]
  );

  useEffect(() => {
    setActions(
      canWrite ? (
        <div className="flex items-center gap-2">
          <AnimatedButton size="sm" variant="secondary" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New folder</span>
          </AnimatedButton>
          <AnimatedButton size="sm" variant="accent" onClick={() => picker.current?.click()} disabled={!!upload}>
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </AnimatedButton>
        </div>
      ) : null
    );
    return () => setActions(null);
  }, [canWrite, upload, setActions]);

  const moveFile = async (fileId: string, target: string | null) => {
    if (target === folderId) return;
    try {
      const moved = await fileService.update(fileId, { folderId: target });
      toast.success(`Moved ${moved.name}`);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not move the file'));
    }
  };

  // Dragging from the desktop vs. dragging a row within the list.
  const isDesktopDrag = (e: React.DragEvent) => e.dataTransfer.types.includes('Files');
  const isRowDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(FILE_DRAG_TYPE);

  const folderDropProps = (target: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!isRowDrag(e)) return;
      e.preventDefault();
      setDropTarget(target ?? 'root');
    },
    onDragLeave: () => setDropTarget(null),
    onDrop: (e: React.DragEvent) => {
      if (!isRowDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      setDropTarget(null);
      moveFile(e.dataTransfer.getData(FILE_DRAG_TYPE), target);
    },
  });

  const term = filter.trim().toLowerCase();
  const folders = useMemo(() => (listing?.folders ?? []).filter((f) => f.name.toLowerCase().includes(term)), [listing, term]);
  const files = useMemo(() => (listing?.files ?? []).filter((f) => f.name.toLowerCase().includes(term)), [listing, term]);
  const here = listing?.breadcrumb[listing.breadcrumb.length - 1]?.name ?? projectName;

  const submitFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    setBusy(true);
    try {
      await fileService.createFolder(projectId, folderName.trim(), folderId);
      setNewFolderOpen(false);
      setFolderName('');
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create the folder'));
    } finally {
      setBusy(false);
    }
  };

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renaming || !renameValue.trim()) return;
    setBusy(true);
    try {
      if (renaming.kind === 'folder') await fileService.renameFolder(renaming.item.id, renameValue.trim());
      else await fileService.update(renaming.item.id, { name: renameValue.trim() });
      setRenaming(null);
      await load();
    } catch (error) {
      toast.error(errorMessage(error, 'Could not rename it'));
    } finally {
      setBusy(false);
    }
  };

  const canRemove = (createdBy: string | null | undefined) => listing?.isAdmin || createdBy === me?.id;

  return (
    <div
      className="relative"
      onDragEnter={(e) => isDesktopDrag(e) && canWrite && setDragDepth((d) => d + 1)}
      onDragLeave={(e) => isDesktopDrag(e) && setDragDepth((d) => Math.max(0, d - 1))}
      onDragOver={(e) => isDesktopDrag(e) && canWrite && e.preventDefault()}
      onDrop={(e) => {
        if (!isDesktopDrag(e)) return;
        e.preventDefault();
        setDragDepth(0);
        startUpload(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          startUpload(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <nav aria-label="Folder" className="flex items-center flex-wrap gap-1 text-sm min-w-0">
          {[{ id: null as string | null, name: 'All files' }, ...(listing?.breadcrumb ?? [])].map((crumb, i, all) => {
            const last = i === all.length - 1;
            return (
              <React.Fragment key={crumb.id ?? 'root'}>
                {i > 0 && <ChevronRight className="w-4 h-4 text-subtle-foreground shrink-0" />}
                <button
                  onClick={() => !last && openFolder(crumb.id)}
                  disabled={last}
                  {...folderDropProps(crumb.id)}
                  className={cn(
                    'px-2 py-1 rounded-md truncate max-w-[14rem] transition-colors',
                    last ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    dropTarget === (crumb.id ?? 'root') && !last && 'bg-accent-soft text-accent'
                  )}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter this folder"
            aria-label="Filter this folder"
            className={cn(inputClass, 'pl-9 py-2 text-sm')}
          />
        </div>
      </div>

      {upload && (
        <div className="surface rounded-xl px-4 py-3 mb-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-foreground truncate">
              Uploading {upload.names.length === 1 ? upload.names[0] : `${upload.names.length} files`}
            </span>
            <span className="text-muted-foreground tabular-nums">{Math.round(upload.progress * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div className="h-full bg-accent rounded-full" animate={{ width: `${Math.max(4, upload.progress * 100)}%` }} />
          </div>
        </div>
      )}

      {failed ? (
        <div className="surface rounded-2xl px-6 py-12 text-center">
          <p className="text-foreground font-medium mb-1">{failed}</p>
          <AnimatedButton variant="secondary" size="sm" onClick={load} className="mt-3">
            Try again
          </AnimatedButton>
        </div>
      ) : !listing ? (
        <ListSkeleton rows={4} />
      ) : folders.length + files.length === 0 ? (
        <div
          className={cn(
            'surface rounded-2xl px-6 py-16 text-center',
            canWrite && 'border-dashed border-2 border-border-strong cursor-pointer hover:border-accent transition-colors'
          )}
          onClick={() => canWrite && !term && picker.current?.click()}
        >
          <UploadCloud className="w-10 h-10 mx-auto mb-4 text-subtle-foreground" strokeWidth={1.5} />
          <p className="font-semibold text-foreground mb-1">
            {term ? `Nothing here matches “${filter}”` : folderId ? `${here} is empty` : 'No files yet'}
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            {term
              ? 'Try another name, or clear the filter.'
              : canWrite
                ? 'Drop files anywhere on this panel, or click to choose them. Up to 50 MB each.'
                : 'Members of the project can add files here.'}
          </p>
        </div>
      ) : (
        <div className="surface rounded-2xl overflow-hidden">
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_11rem_6rem_8rem_2.5rem] gap-4 px-5 py-2.5 text-xs font-medium text-muted-foreground border-b border-border">
            <span>Name</span>
            <span>Added by</span>
            <span className="text-right">Size</span>
            <span>Modified</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {folders.map((folder) => (
              <li
                key={folder.id}
                {...folderDropProps(folder.id)}
                className={cn(
                  'grid grid-cols-[minmax(0,1fr)_2.5rem] md:grid-cols-[minmax(0,1fr)_11rem_6rem_8rem_2.5rem] gap-4 items-center px-5 py-2.5 transition-colors',
                  dropTarget === folder.id ? 'bg-accent-soft' : 'hover:bg-muted/60'
                )}
              >
                <button onClick={() => openFolder(folder.id)} className="flex items-center gap-3 min-w-0 text-left">
                  <FolderIcon />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground truncate">{folder.name}</span>
                    <span className="block text-xs text-muted-foreground md:hidden">
                      {folder.items} {folder.items === 1 ? 'item' : 'items'}
                    </span>
                  </span>
                </button>
                <span className="hidden md:block text-sm text-muted-foreground">—</span>
                <span className="hidden md:block text-sm text-muted-foreground text-right tabular-nums">
                  {folder.items} {folder.items === 1 ? 'item' : 'items'}
                </span>
                <span className="hidden md:block text-sm text-muted-foreground">{timeAgo(folder.createdAt)}</span>
                <RowMenu
                  label={`Actions for ${folder.name}`}
                  items={[
                    { label: 'Open', icon: Eye, onSelect: () => openFolder(folder.id) },
                    {
                      label: 'Rename',
                      icon: Pencil,
                      hidden: !canWrite,
                      onSelect: () => {
                        setRenaming({ kind: 'folder', item: folder });
                        setRenameValue(folder.name);
                      },
                    },
                    {
                      label: 'Delete',
                      icon: Trash2,
                      danger: true,
                      hidden: !canWrite || !canRemove(folder.createdBy),
                      onSelect: () => setDeleting({ kind: 'folder', item: folder }),
                    },
                  ]}
                />
              </li>
            ))}

            {files.map((file) => (
              <li
                key={file.id}
                draggable={canWrite}
                onDragStart={(e) => {
                  e.dataTransfer.setData(FILE_DRAG_TYPE, file.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => setDropTarget(null)}
                className="grid grid-cols-[minmax(0,1fr)_2.5rem] md:grid-cols-[minmax(0,1fr)_11rem_6rem_8rem_2.5rem] gap-4 items-center px-5 py-2.5 hover:bg-muted/60 transition-colors"
              >
                <button onClick={() => setPreview(file)} className="flex items-center gap-3 min-w-0 text-left">
                  <FileIcon name={file.name} mime={file.mime} />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground truncate">{file.name}</span>
                    <span className="block text-xs text-muted-foreground md:hidden">
                      {formatBytes(file.size)}, {timeAgo(file.createdAt)}
                    </span>
                  </span>
                </button>
                <span className="hidden md:flex items-center gap-2 min-w-0">
                  {file.uploader ? (
                    <>
                      <Avatar name={file.uploader.name} src={file.uploader.avatarUrl} size="xs" />
                      <span className="text-sm text-muted-foreground truncate">
                        {file.uploader.id === me?.id ? 'You' : file.uploader.name}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Former member</span>
                  )}
                </span>
                <span className="hidden md:block text-sm text-muted-foreground text-right tabular-nums">{formatBytes(file.size)}</span>
                <span className="hidden md:block text-sm text-muted-foreground">{timeAgo(file.updatedAt)}</span>
                <RowMenu
                  label={`Actions for ${file.name}`}
                  items={[
                    { label: 'Preview', icon: Eye, onSelect: () => setPreview(file) },
                    {
                      label: 'Download',
                      icon: Download,
                      onSelect: () => fileService.download(file).catch((error) => toast.error(errorMessage(error, 'Download failed'))),
                    },
                    {
                      label: 'Rename',
                      icon: Pencil,
                      hidden: !canWrite,
                      onSelect: () => {
                        setRenaming({ kind: 'file', item: file });
                        setRenameValue(file.name);
                      },
                    },
                    {
                      label: 'Delete',
                      icon: Trash2,
                      danger: true,
                      hidden: !canWrite || !canRemove(file.uploader?.id),
                      onSelect: () => setDeleting({ kind: 'file', item: file }),
                    },
                  ]}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Desktop files dragged over the panel */}
      <AnimatePresence>
        {dragDepth > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute -inset-2 z-10 rounded-3xl border-2 border-dashed border-accent bg-accent-soft/80 backdrop-blur-[2px] grid place-items-center"
          >
            <motion.div initial={{ y: 8, scale: 0.96 }} animate={{ y: 0, scale: 1 }} className="text-center">
              <UploadCloud className="w-12 h-12 mx-auto mb-3 text-accent" strokeWidth={1.5} />
              <p className="text-lg font-semibold text-foreground">Drop to upload to {here}</p>
              <p className="text-sm text-muted-foreground">Up to {MAX_FILES_PER_UPLOAD} files, 50 MB each</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <FilePreview file={preview} onClose={() => setPreview(null)} />

      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="New folder"
        description={`Inside ${here}.`}
        size="sm"
        footer={
          <>
            <AnimatedButton variant="secondary" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" form="new-folder" variant="primary" loading={busy} disabled={!folderName.trim()}>
              Create folder
            </AnimatedButton>
          </>
        }
      >
        <form id="new-folder" onSubmit={submitFolder}>
          <Field label="Folder name">
            {(props) => (
              <input {...props} value={folderName} onChange={(e) => setFolderName(e.target.value)} maxLength={255} className={inputClass} />
            )}
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!renaming}
        onClose={() => setRenaming(null)}
        title={renaming?.kind === 'folder' ? 'Rename folder' : 'Rename file'}
        size="sm"
        footer={
          <>
            <AnimatedButton variant="secondary" onClick={() => setRenaming(null)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton type="submit" form="rename-item" variant="primary" loading={busy} disabled={!renameValue.trim()}>
              Rename
            </AnimatedButton>
          </>
        }
      >
        <form id="rename-item" onSubmit={submitRename}>
          <Field label="Name">
            {(props) => (
              <input {...props} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} maxLength={255} className={inputClass} />
            )}
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title={`Delete ${deleting?.item.name ?? ''}?`}
        description={
          deleting?.kind === 'folder'
            ? `Everything inside it (${(deleting.item as ProjectFolder).items} ${(deleting.item as ProjectFolder).items === 1 ? 'item' : 'items'}) is deleted too. This cannot be undone.`
            : 'It is removed for everyone on the project. This cannot be undone.'
        }
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleting) return;
          try {
            if (deleting.kind === 'folder') await fileService.deleteFolder(deleting.item.id);
            else await fileService.remove(deleting.item.id);
            toast.success(`Deleted ${deleting.item.name}`);
            await load();
          } catch (error) {
            toast.error(errorMessage(error, 'Could not delete it'));
            throw error;
          }
        }}
      />
    </div>
  );
};
