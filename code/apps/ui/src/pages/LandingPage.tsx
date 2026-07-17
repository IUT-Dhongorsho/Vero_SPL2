import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AnimatedButton } from '../components/ui/AnimatedButton';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { VantaBackground } from '../components/Vanta/VantaBackground';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Vanta Background - Change 'effect' prop to try different effects */}
      <VantaBackground effect="rings">
        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6">
          {/* Theme Toggle - Top Right */}
          <div className="absolute top-6 right-6">
            <ThemeToggle />
          </div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="mb-3">
              <span className="text-sm font-medium text-white dark:text-white bg-blue-500/30 dark:bg-blue-500/40 backdrop-blur-sm px-4 py-1.5 rounded-full border border-white/20">
                ✦ The Future of Collaboration
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-[1.1]">
              <span className="text-white dark:text-white drop-shadow-lg">
                Work
              </span>
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Together.
              </span>
              <br />
              <span className="text-white dark:text-white drop-shadow-lg">
                Anywhere.
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/90 dark:text-white/90 mb-12 max-w-2xl mx-auto drop-shadow-lg">
              The unified workspace for modern teams. Communication, documentation, 
              and task management all in one place.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <AnimatedButton variant="primary" size="lg" onClick={() => navigate('/signup')}>
                Get Started →
              </AnimatedButton>
              <AnimatedButton 
                variant="outline" 
                size="lg" 
                onClick={() => navigate('/login')}
                className="!border-white/50 !text-white hover:!bg-white/10"
              >
                Log In
              </AnimatedButton>
            </div>

            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-white/80 dark:text-white/80">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Used by 20k+ teams
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                Free 14-day trial
              </span>
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                No credit card
              </span>
            </div>
          </motion.div>
        </div>
      </VantaBackground >
    </div>
  );
};
