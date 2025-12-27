import React, { useState } from 'react';
import { Repository } from '../types';
import { FolderGit2, Star, Lock, Eye, Clock, Plus } from 'lucide-react';

interface RepoListProps {
  repos: Repository[];
  onSelectRepo: (repo: Repository) => void;
  onCreateRepo: () => void;
  refreshing: boolean;
}

const RepoList: React.FC<RepoListProps> = ({ repos, onSelectRepo, onCreateRepo, refreshing }) => {
  const [search, setSearch] = useState('');

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 max-w-4xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Repositories</h2>
        <button 
          onClick={onCreateRepo}
          className="bg-github-primary hover:bg-github-primaryHover text-white px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} /> New
        </button>
      </div>

      <div className="mb-4">
        <input 
          type="text" 
          placeholder="Find a repository..." 
          className="w-full bg-github-dark border border-github-border text-white rounded-md px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid gap-4">
        {refreshing ? (
           <div className="text-center py-8 text-github-secondary">Loading repositories...</div>
        ) : filteredRepos.length === 0 ? (
          <div className="text-center py-8 text-github-secondary">No repositories found.</div>
        ) : (
          filteredRepos.map(repo => (
            <div 
              key={repo.id} 
              onClick={() => onSelectRepo(repo)}
              className="bg-github-card border border-github-border rounded-lg p-4 cursor-pointer hover:border-github-secondary transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <FolderGit2 size={18} className="text-github-secondary" />
                  <span className="font-semibold text-blue-400 hover:underline">{repo.name}</span>
                  <span className="text-xs border border-github-border text-github-secondary px-2 py-0.5 rounded-full">
                    {repo.private ? 'Private' : 'Public'}
                  </span>
                </div>
                {repo.private && <Lock size={14} className="text-yellow-500" />}
              </div>
              
              <p className="text-sm text-github-secondary mt-2 line-clamp-2">
                {repo.description || 'No description provided.'}
              </p>

              <div className="flex items-center gap-4 mt-4 text-xs text-github-secondary">
                <span className="flex items-center gap-1">
                   {repo.default_branch}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(repo.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RepoList;
