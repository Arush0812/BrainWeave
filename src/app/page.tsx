'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%']);

  useEffect(() => {
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  const features = [
    {
      icon: '🧠',
      title: '3D Knowledge Graph',
      description: 'Visualize your ideas in an immersive 3D space with smooth interactions and beautiful animations.',
    },
    {
      icon: '⚡',
      title: 'Instant Insights',
      description: 'Local AI engine analyzes your graph instantly — no API keys needed, no waiting.',
    },
    {
      icon: '🔗',
      title: 'Smart Connections',
      description: 'Automatically detect related nodes, missing connections, and knowledge clusters.',
    },
    {
      icon: '✨',
      title: 'AI Enhancement',
      description: 'Optionally enhance insights with OpenRouter or local Ollama — always with graceful fallback.',
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen animated-gradient overflow-hidden">
      {/* Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `rgba(${Math.random() > 0.5 ? '99, 102, 241' : '168, 85, 247'}, ${Math.random() * 0.4 + 0.1})`,
            }}
            animate={{
              y: [0, -(Math.random() * 60 + 20), 0],
              x: [0, (Math.random() - 0.5) * 40, 0],
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: Math.random() * 6 + 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center glow-indigo">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-xl font-bold gradient-text">BrainWeave AI</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Link
            href="/auth/signin"
            className="px-4 py-2 text-surface-300 hover:text-white transition-colors text-sm font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 text-white text-sm font-semibold hover:from-brand-500 hover:to-purple-500 transition-all glow-indigo"
          >
            Get Started Free
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-6 pt-20 pb-32 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-brand-500/30 text-brand-300 text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
            Now with AI-powered insights
          </motion.div>

          <h1 className="text-6xl md:text-7xl font-bold leading-tight mb-6">
            <span className="gradient-text">Think in 3D.</span>
            <br />
            <span className="text-white">Connect Everything.</span>
          </h1>

          <p className="text-xl text-surface-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            BrainWeave AI is a premium 3D knowledge graph that helps you visualize ideas,
            discover connections, and unlock insights — instantly, without any AI required.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/auth/register"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-semibold text-lg hover:from-brand-500 hover:to-purple-500 transition-all glow-indigo shadow-lg"
              >
                Start for Free
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl glass border border-white/10 text-white font-semibold text-lg hover:bg-white/8 transition-all"
              >
                Sign In
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-20 relative"
        >
          <div className="relative mx-auto max-w-4xl">
            <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="glass-strong rounded-3xl border border-white/10 overflow-hidden shadow-2xl" style={{ height: '400px' }}>
              {/* Simulated 3D graph preview */}
              <div className="w-full h-full relative bg-gradient-to-br from-surface-900 to-surface-950 flex items-center justify-center">
                <div className="absolute inset-0">
                  {/* Animated nodes */}
                  {[
                    { x: '50%', y: '45%', color: '#6366f1', size: 20, delay: 0 },
                    { x: '30%', y: '30%', color: '#8b5cf6', size: 14, delay: 0.3 },
                    { x: '70%', y: '35%', color: '#06b6d4', size: 16, delay: 0.6 },
                    { x: '25%', y: '60%', color: '#10b981', size: 12, delay: 0.9 },
                    { x: '75%', y: '65%', color: '#ec4899', size: 14, delay: 1.2 },
                    { x: '55%', y: '70%', color: '#f59e0b', size: 10, delay: 1.5 },
                  ].map((node, i) => (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        left: node.x,
                        top: node.y,
                        width: node.size,
                        height: node.size,
                        background: node.color,
                        boxShadow: `0 0 ${node.size * 2}px ${node.color}80`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.8, 1, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: node.delay,
                      }}
                    />
                  ))}
                  {/* SVG lines */}
                  <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.3 }}>
                    <line x1="50%" y1="45%" x2="30%" y2="30%" stroke="#6366f1" strokeWidth="1" />
                    <line x1="50%" y1="45%" x2="70%" y2="35%" stroke="#6366f1" strokeWidth="1" />
                    <line x1="50%" y1="45%" x2="25%" y2="60%" stroke="#6366f1" strokeWidth="1" />
                    <line x1="50%" y1="45%" x2="75%" y2="65%" stroke="#6366f1" strokeWidth="1" />
                    <line x1="50%" y1="45%" x2="55%" y2="70%" stroke="#6366f1" strokeWidth="1" />
                    <line x1="30%" y1="30%" x2="70%" y2="35%" stroke="#8b5cf6" strokeWidth="1" />
                  </svg>
                </div>
                <div className="relative z-10 text-center">
                  <p className="text-surface-400 text-sm">Interactive 3D Graph Preview</p>
                  <p className="text-surface-500 text-xs mt-1">Sign up to explore your own graph</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 py-24 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-white mb-4">Everything you need to think better</h2>
          <p className="text-surface-400 text-lg max-w-2xl mx-auto">
            A complete toolkit for visual thinking, knowledge management, and idea exploration.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass-strong rounded-2xl p-8 border border-white/8 hover:border-brand-500/30 transition-all"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-surface-400 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to weave your knowledge?
          </h2>
          <p className="text-surface-400 text-lg mb-10">
            Join thousands of thinkers, researchers, and creators who use BrainWeave AI
            to organize and connect their ideas.
          </p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 px-10 py-5 rounded-2xl bg-gradient-to-r from-brand-600 to-purple-600 text-white font-bold text-xl hover:from-brand-500 hover:to-purple-500 transition-all glow-indigo shadow-xl"
            >
              Get Started — It&apos;s Free
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 px-6 py-8 text-center text-surface-500 text-sm">
        <p>© 2025 BrainWeave AI. Built with Next.js, Three.js, and ❤️</p>
      </footer>
    </div>
  );
}
