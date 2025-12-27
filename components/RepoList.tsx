import React, { useState } from 'react';
import { Repository } from '../types';
import { FolderGit2, Lock, Clock, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface RepoListProps {
  repos: Repository[];
  onSelectRepo: (repo: Repository) => void;
  onCreateRepo: () => void;
  refreshing: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo, onCreateRepo, refreshing }) => {
  const [search, setSearch] = useState('');

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="p-4 max-w-4xl mx-auto pb-24"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Repositories</h2>
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateRepo}
          className="bg-github-primary hover:bg-github-primaryHover text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-github-primary/20"
        >
          <Plus size={16} /> New
        </motion.button>
      </div>

      <div className="mb-4 sticky top-[72px] z-10 bg-github-dark pb-2">
        <input 
          type="text" 
          placeholder="Find a repository..." 
          className="w-full bg-github-card border border-github-border text-white rounded-md px-3 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all shadow-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-3"
      >
        {refreshing ? (
           <div className="text-center py-12 text-github-secondary flex flex-col items-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
             Loading repositories...
           </div>
        ) : filteredRepos.length === 0 ? (
          <div className="text-center py-12 text-github-secondary bg-github-card rounded-lg border border-github-border border-dashed">
            No repositories found.
          </div>
        ) : (
          filteredRepos.map(repo => (
            <motion.div 
              key={repo.id} 
              variants={itemVariants}
              onClick={() => onSelectRepo(repo)}
              whileHover={{ scale: 1.01, backgroundColor: '#1c2128' }}
              whileTap={{ scale: 0.99 }}
              className="bg-github-card border border-github-border rounded-lg p-4 cursor-pointer hover:border-github-secondary transition-colors shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-github-btn rounded-md">
                    <FolderGit2 size={20} className="text-github-text" />
                  </div>
                  <div>
                    <span className="font-semibold text-blue-400 hover:underline block text-base">{repo.name}</span>
                    <span className="text-xs text-github-secondary">
                      {repo.default_branch}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                   <span className={`text-[10px] px-2 py-0.5 rounded-full border ${repo.private ? 'border-yellow-500/30 text-yellow-500 bg-yellow-500/10' : 'border-green-500/30 text-green-500 bg-green-500/10'}`}>
                    {repo.private ? 'Private' : 'Public'}
                  </span>
                  {repo.private && <Lock size={12} className="text-yellow-500" />}
                </div>
              </div>
              
              <p className="text-sm text-github-secondary mt-3 line-clamp-2 pl-[44px]">
                {repo.description || 'No description provided.'}
              </p>

              <div className="flex items-center gap-4 mt-4 text-xs text-github-secondary pl-[44px]">
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(repo.updated_at).toLocaleDateString()}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>
    </motion.div>
  );
};

export default RepoList;
