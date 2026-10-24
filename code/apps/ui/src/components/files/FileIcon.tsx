import React from 'react';
import {
  File,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  Presentation,
} from 'lucide-react';
import { fileKind, type FileKind } from '../../services/fileService';
import { cn } from '../../utils/cn';

const ICONS: Record<FileKind, typeof File> = {
  image: FileImage,
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  video: FileVideo,
  audio: FileAudio,
  archive: FileArchive,
  code: FileCode2,
  text: FileText,
  other: File,
};

/** Status hues only — the palette keeps colour for meaning. */
const TINTS: Partial<Record<FileKind, string>> = {
  pdf: 'bg-danger-soft text-danger',
  sheet: 'bg-success-soft text-success',
  slides: 'bg-warning-soft text-warning',
  image: 'bg-info-soft text-info',
  video: 'bg-info-soft text-info',
};

export const FileIcon: React.FC<{ name: string; mime: string; className?: string }> = ({ name, mime, className }) => {
  const kind = fileKind(name, mime);
  const Icon = ICONS[kind];
  return (
    <span className={cn('w-9 h-9 rounded-lg grid place-items-center shrink-0', TINTS[kind] ?? 'bg-muted text-muted-foreground', className)}>
      <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
    </span>
  );
};

export const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <span className={cn('w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-accent-soft text-accent', className)}>
    <Folder className="w-[18px] h-[18px]" strokeWidth={1.8} fill="currentColor" fillOpacity={0.15} />
  </span>
);
