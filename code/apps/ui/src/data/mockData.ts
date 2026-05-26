export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  workspaceId: string;
  dueDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'done';
  assigneeId: string;
  assigneeName: string;
  createdAt: string;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'document' | 'pdf' | 'code' | 'other';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  projectId: string;
  projectName: string;
  url: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  avatarUrl: string;
  joinedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  members: number;
  lastActive: string;
  status: 'active' | 'review' | 'completed';
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  members: number;
  projectId: string;
}

export const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Finalize Q3 Marketing Campaign Assets',
    description: 'Review and approve all banner ads and social media graphics',
    projectId: '1',
    projectName: 'Global Rebrand',
    workspaceId: '1',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'high',
    status: 'todo',
    assigneeId: 'user1',
    assigneeName: 'Jane Doe',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Review PR #42',
    description: 'Code review for authentication module',
    projectId: '3',
    projectName: 'SPL-II Development',
    workspaceId: '3',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'medium',
    status: 'todo',
    assigneeId: 'user1',
    assigneeName: 'Jane Doe',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Write API Documentation',
    description: 'Document all REST endpoints for backend',
    projectId: '2',
    projectName: 'Backend API',
    workspaceId: '2',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'low',
    status: 'in-progress',
    assigneeId: 'user1',
    assigneeName: 'Jane Doe',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Design System Components',
    description: 'Create reusable UI components',
    projectId: '1',
    projectName: 'Design System',
    workspaceId: '1',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    priority: 'medium',
    status: 'todo',
    assigneeId: 'user1',
    assigneeName: 'Jane Doe',
    createdAt: new Date().toISOString(),
  },
];

export const mockFiles: FileItem[] = [
  {
    id: '1',
    name: 'PRD_v2.pdf',
    type: 'pdf',
    size: '2.4 MB',
    uploadedBy: 'Jane Doe',
    uploadedAt: '2 hours ago',
    projectId: '3',
    projectName: 'SPL-II Development',
    url: '#',
  },
  {
    id: '2',
    name: 'logo_blue.png',
    type: 'image',
    size: '1.2 MB',
    uploadedBy: 'John Smith',
    uploadedAt: '1 day ago',
    projectId: '1',
    projectName: 'Global Rebrand',
    url: '#',
  },
  {
    id: '3',
    name: 'specification.md',
    type: 'document',
    size: '0.5 MB',
    uploadedBy: 'Sarah Chen',
    uploadedAt: '3 days ago',
    projectId: '3',
    projectName: 'SPL-II Development',
    url: '#',
  },
  {
    id: '4',
    name: 'wireframes.fig',
    type: 'other',
    size: '5.1 MB',
    uploadedBy: 'Mike Johnson',
    uploadedAt: '5 days ago',
    projectId: '2',
    projectName: 'Product Design',
    url: '#',
  },
];

export const mockMembers: Member[] = [
  {
    id: 'user1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    role: 'owner',
    avatarUrl: '',
    joinedAt: 'Jan 1, 2026',
  },
  {
    id: 'user2',
    name: 'John Smith',
    email: 'john@example.com',
    role: 'admin',
    avatarUrl: '',
    joinedAt: 'Jan 15, 2026',
  },
  {
    id: 'user3',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    role: 'member',
    avatarUrl: '',
    joinedAt: 'Feb 1, 2026',
  },
  {
    id: 'user4',
    name: 'Mike Johnson',
    email: 'mike@example.com',
    role: 'member',
    avatarUrl: '',
    joinedAt: 'Mar 10, 2026',
  },
];

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Global Rebrand',
    description: 'Marketing site overhaul and new brand identity',
    members: 4,
    lastActive: '2 hours ago',
    status: 'active',
  },
  {
    id: '2',
    name: 'Q3 Product Launch',
    description: 'Feature planning and go-to-market strategy',
    members: 6,
    lastActive: 'Yesterday',
    status: 'active',
  },
  {
    id: '3',
    name: 'SPL-II Development',
    description: 'Building Vero - Unified productivity platform',
    members: 3,
    lastActive: 'Just now',
    status: 'active',
  },
  {
    id: '4',
    name: 'User Research Q4',
    description: 'Customer interviews and data analysis',
    members: 3,
    lastActive: '3 days ago',
    status: 'review',
  },
];

export const mockWorkspaces: Workspace[] = [
  { id: '1', name: 'Design System', description: 'Reusable UI components', cardCount: 12, members: 3, projectId: '3' },
  { id: '2', name: 'Backend API', description: 'RESTful APIs', cardCount: 8, members: 2, projectId: '3' },
  { id: '3', name: 'Frontend Development', description: 'React components', cardCount: 15, members: 4, projectId: '3' },
];
