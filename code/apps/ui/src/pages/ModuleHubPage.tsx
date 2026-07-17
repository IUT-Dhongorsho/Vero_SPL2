import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/Layout/PageContainer';
import { Users, FolderKanban, Video, FileText, MessageSquare, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { motion } from 'framer-motion';

export const ModuleHubPage: React.FC = () => {
  const { workspaceId, projectId, moduleId } = useParams();
  const navigate = useNavigate();

  // In a real app, fetch module details from moduleStore using moduleId
  const moduleName = "Authentication System";
  const moduleDescription = "OAuth2 and SSO integration";

  const tools = [
    { 
      id: 'board', 
      name: 'Kanban Board', 
      icon: FolderKanban, 
      color: 'text-purple-500', 
      bg: 'bg-purple-500/10',
      description: 'Track tasks specific to this module',
      route: `/workspace/${workspaceId}/project/${projectId}/module/${moduleId}/board` 
    },
    { 
      id: 'notes', 
      name: 'Notes', 
      icon: FileText, 
      color: 'text-blue-500', 
      bg: 'bg-blue-500/10',
      description: 'Module documentation and specs',
      route: `/workspace/${workspaceId}/project/${projectId}/module/${moduleId}/notes` 
    },
    { 
      id: 'chat', 
      name: 'Chat', 
      icon: MessageSquare, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-500/10',
      description: 'Private channel for module members',
      route: `/workspace/${workspaceId}/project/${projectId}/module/${moduleId}/chat` 
    },
    { 
      id: 'meet', 
      name: 'Meet', 
      icon: Video, 
      color: 'text-pink-500', 
      bg: 'bg-pink-500/10',
      description: 'Sync with the module team',
      route: `/workspace/${workspaceId}/project/${projectId}/module/${moduleId}/meet` 
    }
  ];

  return (
    <PageContainer title={moduleName}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div>
            <AnimatedButton variant="outline" size="sm" onClick={() => navigate(`/workspace/${workspaceId}/project/${projectId}`)} className="mb-4 text-muted-foreground border-transparent hover:bg-muted">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Project Modules
            </AnimatedButton>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">{moduleName}</h1>
              <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded border border-primary/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Restricted Access
              </span>
            </div>
            <p className="text-muted-foreground text-lg">{moduleDescription}</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex -space-x-2 mr-2">
              {[1,2,3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium ring-2 ring-background">👤</div>
              ))}
            </div>
            <AnimatedButton variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" /> Assign Members
            </AnimatedButton>
          </div>
        </motion.div>

        {/* Tools Grid */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Module Tools</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {tools.map((tool, i) => (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => navigate(tool.route)}
                className="group relative bg-card border border-border rounded-2xl p-6 cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 ${tool.bg} rounded-full blur-3xl -mr-10 -mt-10 opacity-50 group-hover:opacity-100 transition-opacity`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${tool.bg} ${tool.color} flex items-center justify-center mb-5`}>
                    <tool.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{tool.name}</h3>
                  <p className="text-muted-foreground">{tool.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>
    </PageContainer>
  );
};
