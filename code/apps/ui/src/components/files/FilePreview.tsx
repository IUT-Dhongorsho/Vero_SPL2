import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Download, Loader2, X } from 'lucide-react';
import { fileKind, fileService, formatBytes, type ProjectFile } from '../../services/fileService';
import { AnimatedButton } from '../ui/AnimatedButton';
import { FileIcon } from './FileIcon';
import { toast } from '../Providers/ToastProvider';
import { errorMessage } from '../../utils/errors';

const PREVIEWABLE = new Set(['image', 'pdf', 'video', 'audio', 'text', 'code']);
const MAX_TEXT_PREVIEW = 512 * 1024;

/** Full-screen viewer. Content is fetched with the session, then shown from a blob URL. */
export const FilePreview: React.FC<{ file: ProjectFile | null; onClose: () => void }> = ({ file, onClose }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle');
  const kind = file ? fileKind(file.name, file.mime) : 'other';
  const isText = kind === 'text' || kind === 'code';
  // Large text files are offered as downloads rather than dumped into the page.
  const previewable = PREVIEWABLE.has(kind) && !(isText && (file?.size ?? 0) > MAX_TEXT_PREVIEW);

  useEffect(() => {
    if (!file) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [file, onClose]);

  useEffect(() => {
    setUrl(null);
    setText(null);
    if (!file || !previewable) return setState('idle');

    let cancelled = false;
    let objectUrl: string | null = null;
    setState('loading');
    fileService
      .blob(file.id)
      .then(async (blob) => {
        if (cancelled) return;
        if (isText) setText(await blob.text());
        else {
          // Keep the declared type so the browser renders PDFs and media inline.
          objectUrl = URL.createObjectURL(new Blob([blob], { type: file.mime }));
          setUrl(objectUrl);
        }
        setState('ready');
      })
      .catch(() => !cancelled && setState('failed'));

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [file, kind, isText, previewable]);

  const download = async () => {
    if (!file) return;
    try {
      await fileService.download(file);
    } catch (error) {
      toast.error(errorMessage(error, 'Could not download the file'));
    }
  };

  return createPortal(
    <AnimatePresence>
      {file && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[85] bg-background/90 backdrop-blur-md flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${file.name}`}
        >
          <header className="h-16 shrink-0 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-card/80">
            <FileIcon name={file.name} mime={file.mime} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
                {file.uploader ? `, added by ${file.uploader.name}` : ''}
              </p>
            </div>
            <AnimatedButton size="sm" variant="secondary" onClick={download}>
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </AnimatedButton>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </header>

          <div className="flex-1 min-h-0 grid place-items-center p-4 md:p-8 overflow-auto" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="max-w-full max-h-full w-full h-full grid place-items-center">
              {state === 'loading' && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
              {state === 'failed' && <p className="text-muted-foreground">This file could not be loaded.</p>}
              {state === 'idle' && (
                <div className="text-center max-w-sm">
                  <FileIcon name={file.name} mime={file.mime} className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
                  <p className="font-medium text-foreground mb-1">No preview for this file type</p>
                  <p className="text-sm text-muted-foreground mb-5">Download it to open it on your device.</p>
                  <AnimatedButton variant="primary" onClick={download}>
                    <Download className="w-4 h-4" /> Download {formatBytes(file.size)}
                  </AnimatedButton>
                </div>
              )}
              {state === 'ready' && kind === 'image' && url && (
                <img src={url} alt={file.name} className="max-w-full max-h-full object-contain rounded-lg shadow-lifted" />
              )}
              {state === 'ready' && kind === 'pdf' && url && (
                <iframe src={url} title={file.name} className="w-full h-full max-w-5xl rounded-lg border border-border bg-white" />
              )}
              {state === 'ready' && kind === 'video' && url && (
                <video src={url} controls className="max-w-full max-h-full rounded-lg shadow-lifted" />
              )}
              {state === 'ready' && kind === 'audio' && url && <audio src={url} controls className="w-full max-w-md" />}
              {state === 'ready' && text !== null && (
                <pre className="w-full h-full max-w-4xl overflow-auto surface rounded-xl p-5 text-sm font-mono text-foreground whitespace-pre-wrap break-words">
                  {text}
                </pre>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
