import React, { useEffect, useState, useRef } from 'react';
import { Repository, FileEntry } from '../types';
import { getContents, deleteFile, putFile, readFileAsBase64, fromBase64, toBase64 } from '../services/github';
import { useAuth } from '../context/AuthContext';
import { Folder, ArrowLeft, Upload, Trash2, ChevronRight, Save, X, FilePlus, FolderPlus, MoreHorizontal, PenLine } from 'lucide-react';
import { getFileIcon } from '../utils/fileHelpers';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';

interface FileExplorerProps {
  repo: Repository;
  onBack: () => void;
}

const iosTransition = {
  type: "tween" as const,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
  duration: 0.4
};

const FileExplorer: React.FC<FileExplorerProps> = ({ repo, onBack }) => {
  const { user } = useAuth();
  const [path, setPath] = useState('');
  const [contents, setContents] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingFile, setViewingFile] = useState<FileEntry | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [showActions, setShowActions] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (viewingFile) return;
    loadContents();
  }, [path, repo.owner.login, repo.name, user?.githubToken]);

  const loadContents = async () => {
    if (!user?.githubToken) return;
    setLoading(true);
    setStatusMsg('');
    try {
      const data = await getContents(user.githubToken, repo.owner.login, repo.name, path);
      if (Array.isArray(data)) {
        const sorted = data.sort((a, b) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'dir' ? -1 : 1;
        });
        setContents(sorted);
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("Error loading folder contents.");
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (folderName: string) => {
    setPath(prev => prev ? `${prev}/${folderName}` : folderName);
  };

  const handleNavigateUp = () => {
    if (viewingFile) {
      setViewingFile(null);
      setFileContent('');
      setIsEditing(false);
      return;
    }
    if (!path) {
      onBack();
      return;
    }
    const parts = path.split('/');
    parts.pop();
    setPath(parts.join('/'));
  };

  const handleFileClick = async (file: FileEntry) => {
    if (!user?.githubToken) return;
    setLoading(true);
    try {
      const data = await getContents(user.githubToken, repo.owner.login, repo.name, file.path);
      if (!Array.isArray(data) && data.content) {
        setViewingFile(file);
        const rawContent = data.content.replace(/\n/g, '');
        setFileContent(fromBase64(rawContent));
      }
    } catch (error) {
      console.error(error);
      setStatusMsg("Failed to load file.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (file: FileEntry) => {
    if (!confirm(`Delete ${file.name}?`) || !user?.githubToken) return;
    setUploading(true);
    try {
      await deleteFile(user.githubToken, repo.owner.login, repo.name, file.path, file.sha, `Delete ${file.name} via GitMobile`);
      setViewingFile(null);
      loadContents();
      setStatusMsg("File deleted.");
    } catch (error) {
      console.error(error);
      setStatusMsg("Failed to delete file.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!viewingFile || !user?.githubToken) return;
    setUploading(true);
    try {
      const contentEncoded = toBase64(editContent);
      await putFile(
        user.githubToken, 
        repo.owner.login, 
        repo.name, 
        viewingFile.path, 
        contentEncoded, 
        `Update ${viewingFile.name}`,
        viewingFile.sha
      );
      setFileContent(editContent);
      setIsEditing(false);
      setStatusMsg("File saved successfully.");
    } catch (error) {
      console.error(error);
      setStatusMsg("Failed to save changes.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowActions(false);
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.githubToken) return;
    
    setUploading(true);
    setStatusMsg(`Processing ${files.length} files...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.name.endsWith('.zip')) {
           setStatusMsg(`Extracting ${file.name}...`);
           const zip = new JSZip();
           const zipContent = await zip.loadAsync(file);
           const entries = Object.keys(zipContent.files);
           let processed = 0;
           for (const filename of entries) {
             const entry = zipContent.files[filename];
             if (entry.dir) continue; 
             const blob = await entry.async('blob');
             const entryBase64 = await readFileAsBase64(new File([blob], filename));
             const uploadPath = path ? `${path}/${filename}` : filename;
             await putFile(user.githubToken, repo.owner.login, repo.name, uploadPath, entryBase64, `Upload ${filename}`);
             processed++;
           }
        } else {
          const base64 = await readFileAsBase64(file);
          const relativePath = file.webkitRelativePath || file.name;
          const uploadPath = path ? `${path}/${relativePath}` : relativePath;
          await putFile(user.githubToken, repo.owner.login, repo.name, uploadPath, base64, `Upload ${file.name}`);
        }
      }
      setStatusMsg("Upload complete!");
      loadContents();
    } catch (error) {
      console.error(error);
      setStatusMsg("Error during upload.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (folderInputRef.current) folderInputRef.current.value = '';
    }
  };

  const pathParts = path.split('/').filter(Boolean);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 50 }}
      transition={iosTransition}
      className="flex flex-col h-full min-h-screen bg-black"
    >
      {/* iOS Glass Header */}
      <div className="sticky top-0 z-20 glass-panel border-b border-white/10 pt-safe-top">
        <div className="flex items-center px-4 py-3 gap-3">
           <button 
            onClick={handleNavigateUp} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-white active:scale-95 transition-transform"
           >
             <ArrowLeft size={18} strokeWidth={2.5} />
           </button>
           <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-[17px] text-white truncate text-center pr-8">{repo.name}</h2>
              {/* Subtle Path Indicator */}
              {path && <div className="text-[11px] text-zinc-500 text-center truncate font-medium mt-0.5">{path}</div>}
           </div>
        </div>
        
        {/* Scrollable Breadcrumbs - Pill Style */}
        <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide mask-fade-right">
          <button 
            onClick={() => { setPath(''); setViewingFile(null); }}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${!path ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
          >
            Root
          </button>
          {pathParts.map((part, index) => (
             <React.Fragment key={index}>
               <ChevronRight size={12} className="text-zinc-600 flex-shrink-0" />
               <button 
                 onClick={() => {
                    setPath(pathParts.slice(0, index + 1).join('/'));
                    setViewingFile(null);
                 }}
                 className={`flex-shrink-0 px-3 py-1 rounded-full text-[13px] font-medium transition-colors ${index === pathParts.length - 1 && !viewingFile ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}
               >
                 {part}
               </button>
             </React.Fragment>
          ))}
        </div>

        {statusMsg && (
           <motion.div 
             initial={{ opacity: 0, height: 0 }} 
             animate={{ opacity: 1, height: 'auto' }}
             className="bg-blue-500/10 backdrop-blur-md px-4 py-1.5 text-center"
           >
             <span className="text-[12px] font-semibold text-blue-400">{statusMsg}</span>
           </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32 custom-scroll">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-60">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-zinc-700 border-t-white"></div>
            <span className="text-zinc-500 font-medium">Loading content...</span>
          </div>
        ) : viewingFile ? (
          // FILE EDITOR / VIEWER
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={iosTransition}
            className="flex flex-col h-full"
          >
             <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                   {!isEditing ? (
                      <button 
                        onClick={() => { setEditContent(fileContent); setIsEditing(true); }}
                        className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                      >
                        <PenLine size={16} /> Edit
                      </button>
                   ) : (
                      <>
                        <button 
                           onClick={handleSaveFile}
                           disabled={uploading}
                           className="bg-ios-blue hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                          <Save size={16} /> Save
                        </button>
                        <button 
                           onClick={() => setIsEditing(false)}
                           className="bg-red-500/10 text-red-500 px-4 py-2 rounded-xl text-sm font-medium"
                        >
                           Cancel
                        </button>
                      </>
                   )}
                </div>
                <button 
                  onClick={() => handleDelete(viewingFile)} 
                  className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 hover:text-red-500 transition-colors"
                >
                   <Trash2 size={18} />
                </button>
             </div>

             <div className="flex-1 bg-[#1c1c1e] rounded-2xl border border-white/5 overflow-hidden shadow-sm relative">
                {isEditing ? (
                  <textarea 
                    className="w-full h-full bg-transparent text-gray-200 p-4 font-mono text-[13px] outline-none resize-none leading-relaxed"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    spellCheck={false}
                  />
                ) : (
                  <pre className="w-full h-full p-4 font-mono text-[13px] overflow-auto text-gray-300 leading-relaxed custom-scroll">
                    {fileContent}
                  </pre>
                )}
             </div>
          </motion.div>
        ) : (
          // FOLDER LIST VIEW
          <motion.div 
             className="flex flex-col gap-2"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
          >
            {contents.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-4">
                 <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center">
                    <Folder size={32} className="opacity-50" />
                 </div>
                 <p className="font-medium">Folder is empty</p>
                 <button onClick={() => setShowActions(true)} className="text-ios-blue text-sm font-medium">
                   Upload files here
                 </button>
               </div>
            ) : (
               contents.map((item, idx) => (
                 <motion.div 
                   key={item.sha}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ delay: idx * 0.03, ...iosTransition }}
                   onClick={() => item.type === 'dir' ? handleNavigate(item.name) : handleFileClick(item)}
                   whileTap={{ scale: 0.98 }}
                   className="flex items-center gap-4 p-4 bg-[#1c1c1e] active:bg-[#2c2c2e] rounded-2xl cursor-pointer border border-transparent hover:border-white/5 transition-all"
                 >
                   {item.type === 'dir' ? (
                     <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Folder size={20} className="text-ios-blue fill-current" />
                     </div>
                   ) : (
                     <div className="w-10 h-10 rounded-xl bg-zinc-800/50 flex items-center justify-center">
                        {getFileIcon(item.name)}
                     </div>
                   )}
                   <div className="flex-1 min-w-0">
                     <div className="text-[16px] font-medium text-gray-200 truncate">{item.name}</div>
                     <div className="text-[13px] text-zinc-500">
                       {item.type === 'dir' ? 'Folder' : (item.size / 1024).toFixed(1) + ' KB'}
                     </div>
                   </div>
                   <ChevronRight size={16} className="text-zinc-700" />
                 </motion.div>
               ))
            )}
          </motion.div>
        )}
      </div>

      {/* iOS Action Sheet / FAB */}
      {!viewingFile && (
        <>
          <AnimatePresence>
            {showActions && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  onClick={() => setShowActions(false)}
                  className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm" 
                />
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.4 }}
                  className="fixed bottom-0 left-0 right-0 bg-[#1c1c1e] z-40 rounded-t-[32px] p-6 pb-12 shadow-2xl border-t border-white/10"
                >
                  <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6" />
                  
                  <div className="flex justify-between items-center mb-8 px-2">
                    <div>
                      <h3 className="text-xl font-bold text-white">Upload Content</h3>
                      <p className="text-sm text-zinc-500 mt-1">Destination: <span className="text-ios-blue font-mono">/{path}</span></p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-zinc-800 active:bg-zinc-700 p-5 rounded-3xl flex flex-col items-center gap-3 transition-transform active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <FilePlus size={24} className="text-ios-blue" />
                      </div>
                      <span className="font-semibold text-white">File</span>
                    </button>

                    <button 
                      onClick={() => folderInputRef.current?.click()}
                      className="bg-zinc-800 active:bg-zinc-700 p-5 rounded-3xl flex flex-col items-center gap-3 transition-transform active:scale-95"
                    >
                      <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                        <FolderPlus size={24} className="text-ios-green" />
                      </div>
                      <span className="font-semibold text-white">Folder</span>
                    </button>
                  </div>

                  <div className="mt-8">
                     <button 
                        onClick={() => setShowActions(false)}
                        className="w-full bg-zinc-900 text-white font-semibold py-4 rounded-2xl active:bg-zinc-800 transition-colors"
                     >
                        Cancel
                     </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple />
          <input 
            type="file" 
            ref={folderInputRef} 
            className="hidden" 
            onChange={handleFileUpload} 
            {...({ webkitdirectory: "", directory: "" } as any)} 
          />

          {!showActions && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowActions(true)}
              className="fixed bottom-8 right-6 bg-ios-blue text-white w-14 h-14 rounded-full shadow-lg shadow-blue-500/30 z-20 flex items-center justify-center"
            >
              <Upload size={24} strokeWidth={2.5} />
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
};

export default FileExplorer;