import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { VantaBackground } from '../components/Vanta/VantaBackground';
import { Video, FileText, Columns, Zap, CheckCircle2, ArrowRight, Layers, Lock, Sparkles } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-x-hidden font-sans">
      
      {/* Background gradients for added depth */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-6 pointer-events-none">
        <nav className="w-full max-w-6xl flex items-center justify-between px-6 py-3 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.3)] pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">Vero</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate('/login')} className="text-sm font-medium text-white/80 hover:text-white transition-colors">
              Sign In
            </button>
            <button 
              onClick={() => navigate('/signup')} 
              className="text-sm font-semibold bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 hover:scale-105 transition-all duration-300 shadow-[0_0_15px_rgba(255,255,255,0.2)]"
            >
              Get Started
            </button>
          </div>
        </nav>
      </div>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 z-10">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-200">The Future of Collaboration is Unified</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 tracking-tighter leading-[1.1]">
              One workspace for <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                everything you do.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed">
              No more app-switching. Vero brings your meetings, documents, and tasks into a single, beautifully designed unified environment.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
              <button 
                onClick={() => navigate('/signup')} 
                className="px-8 py-4 rounded-full bg-white text-black font-semibold text-lg hover:bg-gray-100 transition-all flex items-center gap-2 group shadow-[0_0_30px_rgba(255,255,255,0.15)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)]"
              >
                Start for free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => navigate('/login')} 
                className="px-8 py-4 rounded-full bg-transparent border border-white/20 text-white font-medium text-lg hover:bg-white/5 transition-all"
              >
                Sign In
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sleek Features Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-24 space-y-32">
        
        {/* Feature 1 */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-8">
              <Columns className="w-7 h-7 text-purple-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Tasks that talk to your notes.</h2>
            <p className="text-xl text-white/60 mb-8 leading-relaxed">
              Experience true bidirectional sync. Convert a checklist item in your meeting notes into a Kanban task with one click. When the task is completed on the board, the note updates instantly.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-lg text-white/80">
                <CheckCircle2 className="w-6 h-6 text-purple-400" /> True drag-and-drop Kanban
              </li>
              <li className="flex items-center gap-3 text-lg text-white/80">
                <CheckCircle2 className="w-6 h-6 text-purple-400" /> Bi-directional rich text sync
              </li>
            </ul>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
            <img src="/assets/kanban.jpg" alt="Kanban synced with notes" className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700" />
          </motion.div>
        </div>

        {/* Feature 2 */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
            <img src="/assets/meet.jpg" alt="Video meeting interface" className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700" />
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 lg:order-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mb-8">
              <Video className="w-7 h-7 text-emerald-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Meetings that document themselves.</h2>
            <p className="text-xl text-white/60 mb-8 leading-relaxed">
              Launch a high-fidelity P2P video call directly from any project. Vero automatically initializes a shared meeting note ready for the team to capture decisions in real-time without leaving the context.
            </p>
          </motion.div>
        </div>

        {/* Feature 3 */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/30 flex items-center justify-center mb-8">
              <FileText className="w-7 h-7 text-pink-400" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Block-based architecture.</h2>
            <p className="text-xl text-white/60 mb-8 leading-relaxed">
              Type <kbd className="bg-white/10 px-2 py-1 rounded-md text-pink-400 font-mono text-sm mx-1">/</kbd> to bring up the command palette. Insert tables, embeds, and dynamic blocks in a distraction-free, elegant typography-focused editor.
            </p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
            <img src="/assets/notes.jpg" alt="Rich text editor blocks" className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700" />
          </motion.div>
        </div>

      </div>

      {/* CTA Section */}
      <div className="relative z-10 py-32 px-6">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-white/10 rounded-3xl p-12 text-center backdrop-blur-xl">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">Ready to eliminate the toggle tax?</h2>
          <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
            Join thousands of modern teams unifying their workflow into one elegant workspace.
          </p>
          <button 
            onClick={() => navigate('/signup')} 
            className="px-10 py-5 rounded-full bg-white text-black font-semibold text-lg hover:bg-gray-200 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]"
          >
            Start your free workspace
          </button>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="relative z-10 border-t border-white/10 py-12 px-8 bg-black/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-white/50" />
            <span className="font-semibold text-white/50">Vero App © {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6 text-sm text-white/50">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
          </div>
        </div>
      </footer>
    </div>
  );
};
