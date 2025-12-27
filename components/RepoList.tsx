import React, { useState } from 'react';
import { Repository } from '../types';
import { FolderGit2, Lock, Clock, Plus, Search, GitFork, Star } from 'lucide-react';
import { motion } from 'framer-motion';

interface RepoListProps {
  repos: Repository[];
  onSelectRepo: (repo: Repository) => void;
  onCreateRepo: () => void;
  refreshing: boolean;
}

// iOS "Ease Out" Curve
const iosTransition = {
  type: "tween" as const,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
  duration: 0.5
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: iosTransition
  }
};

const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo, onCreateRepo, refreshing }) => {
  const [search, setSearch] = useState('');

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-3xl mx-auto pb-32 px-4"
    >
      {/* Header Area */}
      <div className="pt-2 pb-4">
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-3xl font-bold tracking-tight text-white">Repositories</h2>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={onCreateRepo}
            className="bg-ios-blue text-white w-9 h-9 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} strokeWidth={2.5} />
          </motion.button>
        </div>

        {/* iOS Style Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-ios-gray" />
          </div>
          <input 
            type="text" 
            placeholder="Search" 
            className="w-full bg-[#1c1c1e] text-white rounded-xl py-2.5 pl-9 pr-4 text-[17px] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-3"
      >
        {refreshing ? (
           <div className="text-center py-20 flex flex-col items-center opacity-60">
             <div className="animate-spin rounded-full h-8 w-8 border-2 border-ios-gray border-t-white mb-4"></div>
             <span className="text-sm font-medium text-ios-gray">Loading...</span>
           </div>
        ) : filteredRepos.length === 0 ? (
          <div className="text-center py-20 bg-[#1c1c1e] rounded-2xl border border-dashed border-zinc-800 mx-1">
            <span className="text-zinc-500">No repositories found.</span>
          </div>
        ) : (
          filteredRepos.map(repo => (
            <motion.div 
              key={repo.id} 
              variants={itemVariants}
              onClick={() => onSelectRepo(repo)}
              whileTap={{ scale: 0.98 }}
              className="group bg-[#1c1c1e] active:bg-[#2c2c2e] rounded-2xl p-4 cursor-pointer border border-transparent hover:border-zinc-800 transition-colors relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="min-w-[40px] h-[40px] bg-zinc-800 rounded-xl flex items-center justify-center">
                    <FolderGit2 size={20} className="text-white" />
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="font-semibold text-[17px] text-white truncate leading-tight">{repo.name}</span>
                    <span className="text-[13px] text-zinc-500 truncate">{repo.owner.login}</span>
                  </div>
                </div>
                {repo.private && (
                   <Lock size={14} className="text-zinc-500 mt-1" />
                )}
              </div>
              
              {repo.description && (
                <p className="text-[15px] text-zinc-400 mt-3 mb-4 line-clamp-2 leading-snug">
                  {repo.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                <div className="flex items-center gap-4 text-[13px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <GitFork size={14} />
                    {repo.default_branch}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} />
                    {new Date(repo.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-semibold text-zinc-400">
                    {repo.private ? 'Private' : 'Public'}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
};

export default RepoList;