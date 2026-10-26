import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Download, Eye, FolderOpen, Search } from 'lucide-react';
import { PageContainer } from '../components/Layout/PageContainer';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { Avatar } from '../components/ui/Avatar';
import { inputClass } from '../components/ui/Field';
import { RowMenu } from '../components/ui/RowMenu';
import { ListSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { FileIcon } from '../components/files/FileIcon';
import { FilePreview } from '../components/files/FilePreview';
import { FileLibrary } from '../components/files/FileLibrary';
import { toast } from '../components/Providers/ToastProvider';
import { fileService, formatBytes, type ProjectFile } from '../services/fileService';
import { useProjectStore } from '../stores/project.store';
import { useAuthStore } from '../stores/auth.store';
import { errorMessage } from '../utils/errors';
import { timeAgo } from '../utils/dateUtils';
import { cn } from '../utils/cn';

/**
 * Files across every project you are on. "Recent" lists the newest from all of
 * them; choosing a project opens that project's library, folders and all.
 */
export const FilesPage: React.FC = () => {
  const me = useAuthStore((s) => s.user);
  const { projects, fetchProjects } = useProjectStore();
  const [params, setParams] = useSearchParams();
  const projectId = params.get('project');
  const project = projects.find((p) => p.id === projectId) ?? null;

  const [query, setQuery] = useState('');
  const [files, setFiles] = useState<ProjectFile[] | null>(null);
  const [preview, setPreview] = useState<ProjectFile | null>(null);
  const [actions, setActions] = useState<React.ReactNode>(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Recent view: search on the server as the person types (debounced).
  useEffect(() => {
    if (projectId) return;
    setFiles(null);
    const timer = setTimeout(() => {
      fileService
        .recent({ q: query.trim() || undefined, limit: 100 })
        .then(setFiles)
        .catch((error) => {
          toast.error(errorMessage(error, 'Could not load files'));
          setFiles([]);
        });
    }, query ? 250 : 0);
    return () => clearTimeout(timer);
  }, [projectId, query]);

  const choose = (id: string | null) => {
    setActions(null);
    setParams(id ? { project: id } : {}, { replace: true });
  };

  const sorted = useMemo(() => [...projects].sort((a, b) => a.name.localeCompare(b.name)), [projects]);

  return (
    <PageContainer
      title="Files"
      subtitle={project ? project.name : 'Everything shared in your projects'}
      topBarActions={projectId ? actions : null}
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <nav aria-label="Projects" className="lg:w-56 shrink-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
            {[{ id: null as string | null, name: 'Recent' }, ...sorted.map((p) => ({ id: p.id as string | null, name: p.name }))].map(
              (entry) => {
                const on = (entry.id ?? null) === projectId;
                return (
                  <li key={entry.id ?? 'recent'} className="shrink-0">
                    <button
                      onClick={() => choose(entry.id)}
                      aria-current={on ? 'page' : undefined}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-xl text-sm font-medium truncate transition-colors whitespace-nowrap',
                        on ? 'bg-muted text-foreground border border-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                      )}
                    >
                      {entry.name}
                    </button>
                  </li>
                );
              }
            )}
          </ul>
        </nav>

        <div className="flex-1 min-w-0">
          {projectId ? (
            project ? (
              <FileLibrary key={project.id} projectId={project.id} projectName={project.name} setActions={setActions} />
            ) : (
              <ListSkeleton rows={4} />
            )
          ) : (
            <>
              <div className="relative max-w-md mb-4">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search file names in all projects"
                  aria-label="Search files"
                  className={cn(inputClass, 'pl-10')}
                />
              </div>

              {files === null ? (
                <ListSkeleton rows={5} />
              ) : files.length === 0 ? (
                <div className="surface rounded-2xl">
                  {query ? (
                    <EmptyState type="files" title={`No file is called “${query}”`} description="Try part of the name, or pick a project on the left." />
                  ) : projects.length === 0 ? (
                    <EmptyState type="files" title="No projects yet" description="Files live inside projects. Create or join one first." />
                  ) : (
                    <div className="text-center py-14 px-6">
                      <FolderOpen className="w-10 h-10 mx-auto mb-4 text-subtle-foreground" strokeWidth={1.5} />
                      <p className="font-semibold text-foreground mb-1">No files in your projects yet</p>
                      <p className="text-sm text-muted-foreground mb-5">Pick a project to upload the first one.</p>
                      <AnimatedButton variant="primary" onClick={() => choose(sorted[0].id)}>
                        Open {sorted[0].name}
                      </AnimatedButton>
                    </div>
                  )}
                </div>
              ) : (
                <ul className="surface rounded-2xl divide-y divide-border overflow-hidden">
                  {files.map((file) => (
                    <li key={file.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/60 transition-colors">
                      <button onClick={() => setPreview(file)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                        <FileIcon name={file.name} mime={file.mime} />
                        <span className="min-w-0">
                          <span className="block font-medium text-foreground truncate">{file.name}</span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {file.project?.name}
                            {file.folder ? ` / ${file.folder.name}` : ''}
                            {' — '}
                            {formatBytes(file.size)}, {timeAgo(file.createdAt)}
                          </span>
                        </span>
                      </button>
                      {file.uploader && (
                        <span className="hidden md:flex items-center gap-2 w-40 shrink-0">
                          <Avatar name={file.uploader.name} src={file.uploader.avatarUrl} size="xs" />
                          <span className="text-sm text-muted-foreground truncate">
                            {file.uploader.id === me?.id ? 'You' : file.uploader.name}
                          </span>
                        </span>
                      )}
                      <RowMenu
                        label={`Actions for ${file.name}`}
                        items={[
                          { label: 'Preview', icon: Eye, onSelect: () => setPreview(file) },
                          {
                            label: 'Download',
                            icon: Download,
                            onSelect: () => fileService.download(file).catch((e) => toast.error(errorMessage(e, 'Download failed'))),
                          },
                          {
                            label: 'Show in project',
                            icon: ArrowUpRight,
                            onSelect: () =>
                              setParams(file.folderId ? { project: file.projectId, folder: file.folderId } : { project: file.projectId }),
                          },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {projects.length > 0 && (
                <p className="text-xs text-muted-foreground mt-4">
                  Uploading happens inside a project — choose one on the left, or open its{' '}
                  <Link to="/projects" className="text-accent hover:underline">
                    Files tab
                  </Link>
                  .
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <FilePreview file={preview} onClose={() => setPreview(null)} />
    </PageContainer>
  );
};
