import React from 'react';
import { FileLibrary } from '../../components/files/FileLibrary';
import type { ProjectTabProps } from './ProjectPage';

export const FilesTab: React.FC<ProjectTabProps> = ({ project, setActions }) => (
  <FileLibrary projectId={project.id} projectName={project.name} setActions={setActions} />
);
