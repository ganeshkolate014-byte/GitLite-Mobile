import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Github, LogOut, Loader2, X, ChevronRight, LayoutGrid } from 'lucide-react';
import { fetchRepos, createRepo } from './services/github';
import { Repository } from './types';
import RepoList from './components/RepoList';
import FileExplorer from './components/FileExplorer';
import { AnimatePresence, motion } from 'framer-motion';

const GITIGNORE_TEMPLATES = ['None', 'Node', 'Python', 'Go', 'Java', 'C++', 'Swift', 'Unity'];
const LICENSE_TEMPLATES = ['None', 'mit', 'apache-2.0', 'gpl-3.0', 'unlicense'];

const iosTransition = {
  type: "tween" as const,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
  duration: 0.5
};

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

  const resetForm = () => {
    setNewRepoName('');
    setNewRepoDesc('');
    setIsPrivate(false);
    setGitignore('None');
    setLicense('None');
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
      setRepos([newRepo, ...repos]);
      setShowCreateModal(false);
      resetForm();
      setSelectedRepo(newRepo);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to create repository");
    } finally {
      setCreatingRepo(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-ios-blue" size={32} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background blobs for modern feel */}
        <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-blue-600/20 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] bg-purple-600/20 rounded-full blur-[80px]" />

        <div className="z-10 text-center max-w-sm">
          <div className="w-20 h-20 bg-zinc-900 rounded-[24px] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-900/20 border border-white/5">
            <Github size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">GitMobile</h1>
          <p className="text-zinc-500 mb-10 text-lg leading-relaxed">
            Your GitHub workflow,<br/> reimagined for touch.
          </p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={login}
            className="w-full bg-white text-black py-4 rounded-2xl font-bold text-[17px] flex items-center justify-center gap-3 shadow-xl hover:bg-gray-100 transition-colors"
          >
            <Github size={22} />
            Continue with GitHub
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-blue-500/30">
      {/* Navbar - Glass Effect */}
      <nav className="sticky top-0 z-30 glass-panel border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-[60px] flex justify-between items-center">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setSelectedRepo(null)}
          >
            <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
               <LayoutGrid size={18} className="text-white" />
            </div>
            <span className="font-bold text-[17px] text-white hidden sm:block">GitMobile</span>
          </div>
          
          <div className="flex items-center gap-4">
            {user.photoURL && (
              <img 
                src={user.photoURL} 
                alt="Profile" 
                className="w-8 h-8 rounded-full border border-white/10" 
              />
            )}
            <button 
              onClick={logout}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
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

      {/* Modern iOS Bottom Sheet / Dialog for Create Repo */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" 
            />
            <motion.div 
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={iosTransition}
              className="fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:w-[480px] bg-[#1c1c1e] z-50 rounded-t-[32px] sm:rounded-[32px] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/5">
                 <h3 className="text-xl font-bold text-white">New Repository</h3>
                 <button onClick={() => setShowCreateModal(false)} className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                    <X size={18} />
                 </button>
              </div>

              {/* Scrollable Form */}
              <div className="p-6 overflow-y-auto custom-scroll">
                {errorMsg && (
                  <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-sm text-red-400 font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">Name</label>
                    <input 
                      type="text" 
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      className="w-full bg-black/50 border border-zinc-700/50 rounded-2xl px-4 py-3.5 text-white focus:border-ios-blue focus:ring-1 focus:ring-ios-blue outline-none transition-all placeholder-zinc-600"
                      placeholder="repository-name"
                      autoFocus
                    />
                  </div>

                  <div>
                     <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">Privacy</label>
                     <div className="flex bg-black/50 p-1 rounded-2xl border border-zinc-700/50">
                        <button 
                          onClick={() => setIsPrivate(false)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!isPrivate ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          Public
                        </button>
                        <button 
                          onClick={() => setIsPrivate(true)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${isPrivate ? 'bg-zinc-700 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                          Private
                        </button>
                     </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1 mb-2 block">Description</label>
                    <input 
                      type="text" 
                      value={newRepoDesc}
                      onChange={(e) => setNewRepoDesc(e.target.value)}
                      className="w-full bg-black/50 border border-zinc-700/50 rounded-2xl px-4 py-3.5 text-white focus:border-ios-blue focus:ring-1 focus:ring-ios-blue outline-none transition-all placeholder-zinc-600"
                      placeholder="Optional description"
                    />
                  </div>

                  <div className="pt-2">
                     <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-sm font-medium">Add README</span>
                        <input 
                          type="checkbox" 
                          checked={autoInit}
                          onChange={(e) => setAutoInit(e.target.checked)}
                          className="w-6 h-6 rounded-md bg-zinc-800 border-zinc-600 checked:bg-ios-blue accent-ios-blue"
                        />
                     </div>
                     <div className="flex justify-between items-center py-3 border-b border-white/5">
                        <span className="text-sm font-medium text-zinc-400">.gitignore</span>
                        <select 
                           value={gitignore} 
                           onChange={(e) => setGitignore(e.target.value)}
                           className="bg-transparent text-ios-blue text-sm font-medium outline-none text-right cursor-pointer"
                        >
                           {GITIGNORE_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                     </div>
                     <div className="flex justify-between items-center py-3">
                        <span className="text-sm font-medium text-zinc-400">License</span>
                        <select 
                           value={license} 
                           onChange={(e) => setLicense(e.target.value)}
                           className="bg-transparent text-ios-blue text-sm font-medium outline-none text-right cursor-pointer"
                        >
                           {LICENSE_TEMPLATES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                     </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-6 pt-2 pb-8 sm:pb-6 bg-[#1c1c1e] border-t border-white/5">
                <button 
                  onClick={handleCreateRepo}
                  disabled={creatingRepo || !newRepoName}
                  className="w-full bg-white text-black py-4 rounded-2xl font-bold text-[17px] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingRepo ? <Loader2 size={20} className="animate-spin" /> : 'Create Repository'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}