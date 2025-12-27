import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Github, LogOut, Loader2 } from 'lucide-react';
import { fetchRepos, createRepo } from './services/github';
import { Repository } from './types';
import RepoList from './components/RepoList';
import FileExplorer from './components/FileExplorer';

const AppContent: React.FC = () => {
  const { user, login, logout, loading: authLoading } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      // In a real app, show toast
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoName || !user?.githubToken) return;
    setCreatingRepo(true);
    try {
      const newRepo = await createRepo(user.githubToken, newRepoName, isPrivate);
      setRepos([newRepo, ...repos]);
      setShowCreateModal(false);
      setNewRepoName('');
    } catch (error) {
      alert("Failed to create repository: " + error);
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
          className="bg-[#238636] hover:bg-[#2ea043] text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-3 transition-all transform active:scale-95"
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

  if (selectedRepo) {
    return <FileExplorer repo={selectedRepo} onBack={() => setSelectedRepo(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-300">
      {/* Navbar */}
      <div className="bg-[#161b22] border-b border-[#30363d] p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
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

      <RepoList 
        repos={repos} 
        onSelectRepo={setSelectedRepo} 
        onCreateRepo={() => setShowCreateModal(true)}
        refreshing={dataLoading}
      />

      {/* Create Repo Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Create Repository</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Repository Name</label>
              <input 
                type="text" 
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-2 text-white focus:border-blue-500 outline-none"
                placeholder="my-awesome-project"
              />
            </div>

            <div className="mb-6 flex items-center gap-2">
               <input 
                 type="checkbox" 
                 id="private-check"
                 checked={isPrivate}
                 onChange={(e) => setIsPrivate(e.target.checked)}
                 className="w-4 h-4 rounded border-gray-600 bg-[#0d1117]"
               />
               <label htmlFor="private-check" className="text-sm">Private Repository</label>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium hover:text-white"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateRepo}
                disabled={creatingRepo || !newRepoName}
                className="bg-[#238636] hover:bg-[#2ea043] text-white px-4 py-2 rounded text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {creatingRepo && <Loader2 size={14} className="animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
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
