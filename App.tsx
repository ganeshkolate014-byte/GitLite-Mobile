import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Github, LogOut, Loader2, Info } from 'lucide-react';
import { fetchRepos, createRepo } from './services/github';
import { Repository } from './types';
import RepoList from './components/RepoList';
import FileExplorer from './components/FileExplorer';
import { AnimatePresence } from 'framer-motion';

const GITIGNORE_TEMPLATES = ['None', 'Node', 'Python', 'Go', 'Java', 'Ruby', 'C++', 'Swift', 'Unity', 'VisualStudio'];
const LICENSE_TEMPLATES = ['None', 'mit', 'apache-2.0', 'gpl-3.0', 'unlicense', 'bsd-3-clause'];

const AppContent: React.FC = () => {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  
  // Repo Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [autoInit, setAutoInit] = useState(true);
  const [gitignore, setGitignore] = useState('None');
  const [license, setLicense] = useState('None');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user?.githubToken && !selectedRepo) {
      loadRepos();
    }
  }, [user, selectedRepo]);

  const loadRepos = async () => {
    if (!user?.githubToken) return;
    setDataLoading(true);
    try {
      const data = await fetchRepos(user.githubToken);
      setRepos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoName || !user?.githubToken) return;
    setCreatingRepo(true);
    setErrorMsg('');
    try {
      const newRepo = await createRepo(
        user.githubToken, 
        newRepoName, 
        newRepoDesc, 
        isPrivate, 
        autoInit,
        gitignore,
        license
      );
      
      // Add new repo to top of list
      setRepos([newRepo, ...repos]);
      // Close modal and reset
      setShowCreateModal(false);
      setNewRepoName('');
      setNewRepoDesc('');
      setIsPrivate(false);
      setGitignore('None');
      setLicense('None');
      
      // Auto-enter the new repo
      setSelectedRepo(newRepo);

    } catch (error: any) {
      setErrorMsg(error.message || "Failed to create repository");
    } finally {
      setCreatingRepo(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center text-white">
        <Loader2 className="animate-spin mr-2" /> Loading GitMobile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <Github size={64} className="mx-auto text-white mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">GitMobile</h1>
          <p className="text-gray-400">Manage your repositories on the go.</p>
        </div>
        <button
          onClick={login}
          className="bg-[#238636] hover:bg-[#2ea043] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-3 transition-all transform active:scale-95 shadow-lg shadow-green-900/50"
        >
          <Github size={20} />
          Sign in with GitHub
        </button>
        <p className="mt-8 text-xs text-gray-600 max-w-xs text-center">
          Note: This app runs entirely in your browser. Authentication tokens are used directly to communicate with GitHub API.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300 overflow-hidden">
      {/* Navbar */}
      <div className="bg-[#161b22] border-b border-[#30363d] p-4 flex justify-between items-center sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setSelectedRepo(null)}>
          <Github className="text-white" size={24} />
          <h1 className="font-bold text-white hidden sm:block">GitMobile</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user.photoURL && (
              <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full border border-[#30363d]" />
            )}
            <span className="text-sm font-medium hidden sm:block">{user.githubUsername || user.displayName}</span>
          </div>
          <button 
            onClick={logout}
            className="text-gray-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {selectedRepo ? (
          <FileExplorer key="explorer" repo={selectedRepo} onBack={() => setSelectedRepo(null)} />
        ) : (
          <RepoList 
            key="list"
            repos={repos} 
            onSelectRepo={setSelectedRepo} 
            onCreateRepo={() => setShowCreateModal(true)}
            refreshing={dataLoading}
          />
        )}
      </AnimatePresence>

      {/* Create Repo Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xl font-bold text-white">Create Repository</h3>
                 <span className="text-xs text-github-secondary">* Required</span>
              </div>
              
              {errorMsg && (
                <div className="mb-4 bg-red-900/20 border border-red-900/50 p-3 rounded text-sm text-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-white">Repository Name *</label>
                <input 
                  type="text" 
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="e.g., my-awesome-project"
                  autoFocus
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description <span className="text-github-secondary">(Optional)</span></label>
                <input 
                  type="text" 
                  value={newRepoDesc}
                  onChange={(e) => setNewRepoDesc(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                  placeholder="Short description..."
                />
              </div>

              <div className="mb-4 border-b border-[#30363d] pb-4">
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-[#21262d] transition-colors">
                  <input 
                    type="radio" 
                    name="privacy"
                    checked={!isPrivate}
                    onChange={() => setIsPrivate(false)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white text-sm">Public</div>
                    <div className="text-xs text-github-secondary">Anyone on the internet can see this repository.</div>
                  </div>
                </label>
                <label className="flex items-start gap-3 cursor-pointer p-2 rounded hover:bg-[#21262d] transition-colors mt-2">
                   <input 
                    type="radio" 
                    name="privacy"
                    checked={isPrivate}
                    onChange={() => setIsPrivate(true)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white text-sm">Private</div>
                    <div className="text-xs text-github-secondary">You choose who can see and commit to this repository.</div>
                  </div>
                </label>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-white mb-2">Initialize this repository with:</h4>
                
                <label className="flex items-center gap-2 mb-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoInit}
                    onChange={(e) => setAutoInit(e.target.checked)}
                    className="rounded bg-[#0d1117] border-gray-600"
                  />
                  <span className="text-sm">Add a README file</span>
                </label>

                <div className="mb-3">
                   <label className="block text-xs font-medium mb-1 text-github-secondary">Add .gitignore</label>
                   <select 
                     value={gitignore}
                     onChange={(e) => setGitignore(e.target.value)}
                     className="w-full bg-[#21262d] border border-[#30363d] rounded px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
                   >
                     {GITIGNORE_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>

                <div>
                   <label className="block text-xs font-medium mb-1 text-github-secondary">Choose a license</label>
                   <select 
                     value={license}
                     onChange={(e) => setLicense(e.target.value)}
                     className="w-full bg-[#21262d] border border-[#30363d] rounded px-2 py-1.5 text-sm text-white outline-none focus:border-blue-500"
                   >
                     {LICENSE_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                   </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-[#30363d]">
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateRepo}
                  disabled={creatingRepo || !newRepoName}
                  className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {creatingRepo && <Loader2 size={14} className="animate-spin" />}
                  Create Repository
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;