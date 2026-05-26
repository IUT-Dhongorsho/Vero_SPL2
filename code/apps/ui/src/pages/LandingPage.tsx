import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Users, MessageSquare, Calendar, Zap } from 'lucide-react';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { GlassCard } from '../components/ui/GlassCard';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    { icon: Sparkles, title: 'AI-Powered', desc: 'Smart task extraction and meeting summaries' },
    { icon: Users, title: 'Team Collaboration', desc: 'Real-time editing and video meetings' },
    { icon: MessageSquare, title: 'Unified Chat', desc: 'Contextual communication in one place' },
    { icon: Calendar, title: 'Smart Calendar', desc: 'Sync tasks and meetings across teams' },
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          >
            Vero
          </motion.h1>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <AnimatedButton variant="outline" size="sm" onClick={() => navigate('/login')}>
              Log In
            </AnimatedButton>
            <AnimatedButton variant="primary" size="sm" onClick={() => navigate('/signup')}>
              Get Started
            </AnimatedButton>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">
              Secure, High-Density
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Collaboration Workspace
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto">
              Engineered for modern teams. Combine communication, documentation, 
              and task management in one unified platform.
            </p>
            <div className="flex gap-4 justify-center">
              <AnimatedButton variant="primary" size="lg" onClick={() => navigate('/signup')}>
                Start Free Trial →
              </AnimatedButton>
              <AnimatedButton variant="outline" size="lg" onClick={() => navigate('/login')}>
                Watch Demo
              </AnimatedButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need</h2>
            <p className="text-gray-600 dark:text-gray-400">Powerful features to supercharge your team's productivity</p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="text-center">
                  <feature.icon className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
