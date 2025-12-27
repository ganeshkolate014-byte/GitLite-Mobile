import React, { useEffect, useState, useRef } from 'react';
import { Repository, FileEntry } from '../types';
import { getContents, deleteFile, putFile, readFileAsBase64, fromBase64, toBase64 } from '../services/github';
import { useAuth } from '../context/AuthContext';
import { Folder, ArrowLeft, Upload, Trash2, ChevronRight, Download, Save, X, MoreVertical, FilePlus, FolderPlus } from 'lucide-react';
import { getFileIcon } from '../utils/fileHelpers';
import JSZip from 'jszip';
import { motion, AnimatePresence } from 'framer-motion';

interface FileExplorerProps {
  repo: Repository;
  onBack: () => void;
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      console.error("Failed to load contents", error);
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
    setStatusMsg(`Starting upload...`);

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
             
             setStatusMsg(`Uploading ${filename} (${processed + 1}/${entries.length})...`);
             await putFile(
                user.githubToken,
                repo.owner.login,
                repo.name,
                uploadPath,
                entryBase64,
                `Upload ${filename} from zip`
             );
             processed++;
           }
        } else {
          const base64 = await readFileAsBase64(file);
          const relativePath = file.webkitRelativePath || file.name;
          const uploadPath = path ? `${path}/${relativePath}` : relativePath;

          setStatusMsg(`Uploading ${relativePath}...`);
          await putFile(
            user.githubToken,
            repo.owner.login,
            repo.name,
            uploadPath,
            base64,
            `Upload ${file.name}`
          );
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
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="flex flex-col h-full bg-github-dark min-h-screen relative"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-github-card/95 backdrop-blur-sm border-b border-github-border p-4 shadow-sm">
        <div className="flex items-center gap-2 text-github-text mb-2">
           <button onClick={handleNavigateUp} className="p-2 hover:bg-github-btn rounded-full transition-colors">
             <ArrowLeft size={20} />
           </button>
           <h2 className="font-semibold text-lg truncate flex-1">{repo.name}</h2>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-github-secondary overflow-x-auto whitespace-nowrap pb-1 px-1 scrollbar-hide">
          <span 
            onClick={() => { setPath(''); setViewingFile(null); }}
            className={`cursor-pointer hover:text-blue-400 transition-colors ${!path ? 'font-bold text-white bg-github-btn px-2 py-0.5 rounded' : ''}`}
          >
            root
          </span>
          {pathParts.map((part, index) => (
             <React.Fragment key={index}>
               <ChevronRight size={14} className="text-gray-600" />
               <span 
                 onClick={() => {
                    setPath(pathParts.slice(0, index + 1).join('/'));
                    setViewingFile(null);
                 }}
                 className={`cursor-pointer hover:text-blue-400 transition-colors ${index === pathParts.length - 1 && !viewingFile ? 'font-bold text-white bg-github-btn px-2 py-0.5 rounded' : ''}`}
               >
                 {part}
               </span>
             </React.Fragment>
          ))}
          {viewingFile && (
             <>
                <ChevronRight size={14} className="text-gray-600" />
                <span className="font-bold text-white bg-github-btn px-2 py-0.5 rounded truncate max-w-[150px]">{viewingFile.name}</span>
             </>
          )}
        </div>
        
        {statusMsg && (
           <motion.div 
             initial={{ opacity: 0, height: 0 }} 
             animate={{ opacity: 1, height: 'auto' }}
             className="text-xs text-blue-400 mt-2 font-mono bg-blue-900/20 px-2 py-1 rounded"
           >
             {statusMsg}
           </motion.div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-32">
        {loading ? (
          <div className="flex justify-center items-center h-40 text-github-secondary gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Loading...
          </div>
        ) : viewingFile ? (
          // FILE VIEWER
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-github-card border border-github-border rounded-lg overflow-hidden flex flex-col h-full shadow-lg"
          >
            <div className="bg-github-btn border-b border-github-border p-2 flex justify-between items-center">
               <div className="flex gap-2">
                 {!isEditing && (
                    <button 
                      onClick={() => { setEditContent(fileContent); setIsEditing(true); }}
                      className="text-xs bg-github-border hover:bg-gray-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium"
                    >
                      Edit
                    </button>
                 )}
                 {isEditing && (
                    <>
                      <button 
                         onClick={handleSaveFile}
                         disabled={uploading}
                         className="text-xs bg-github-primary hover:bg-github-primaryHover text-white px-3 py-1.5 rounded-md flex items-center gap-1 font-medium"
                      >
                        <Save size={12} /> Save
                      </button>
                      <button 
                         onClick={() => setIsEditing(false)}
                         className="text-xs bg-red-900/30 hover:bg-red-900/50 text-red-200 px-3 py-1.5 rounded-md flex items-center gap-1 font-medium border border-red-900/50"
                      >
                         <X size={12} /> Cancel
                      </button>
                    </>
                 )}
               </div>
               <button onClick={() => handleDelete(viewingFile)} className="text-github-secondary hover:text-red-400 p-2 rounded hover:bg-github-dark transition-colors">
                 <Trash2 size={16} />
               </button>
            </div>
            {isEditing ? (
              <textarea 
                className="w-full h-[60vh] bg-github-dark text-github-text p-4 font-mono text-sm outline-none resize-y"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            ) : (
              <pre className="p-4 text-sm font-mono overflow-auto bg-github-dark h-full min-h-[50vh] text-gray-300">
                {fileContent}
              </pre>
            )}
          </motion.div>
        ) : (
          // FILE LIST
          <motion.div 
             className="bg-github-card border border-github-border rounded-lg overflow-hidden shadow-sm"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={{ duration: 0.2 }}
          >
            {contents.length === 0 ? (
               <div className="p-12 text-center text-github-secondary flex flex-col items-center gap-3">
                 <Folder size={48} className="opacity-20" />
                 <p>This folder is empty.</p>
                 <button 
                    onClick={() => setShowActions(true)}
                    className="text-blue-400 text-sm hover:underline"
                 >
                   Upload some files?
                 </button>
               </div>
            ) : (
               contents.map((item, idx) => (
                 <motion.div 
                   key={item.sha}
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.15, ease: "easeOut", delay: idx * 0.02 }}
                   onClick={() => item.type === 'dir' ? handleNavigate(item.name) : handleFileClick(item)}
                   className="flex items-center gap-3 p-3.5 border-b border-github-border last:border-0 hover:bg-github-btn cursor-pointer transition-colors group"
                 >
                   {item.type === 'dir' ? (
                     <Folder size={20} className="text-blue-400 fill-blue-400/20" />
                   ) : (
                     getFileIcon(item.name)
                   )}
                   <div className="flex-1 min-w-0">
                     <div className="text-sm truncate text-gray-200 group-hover:text-blue-400 transition-colors">{item.name}</div>
                   </div>
                   <span className="text-xs text-github-secondary font-mono">
                     {item.size > 0 ? (item.size / 1024).toFixed(1) + ' KB' : ''}
                   </span>
                 </motion.div>
               ))
            )}
          </motion.div>
        )}
      </div>

      {/* Floating Action Button & Menu */}
      {!viewingFile && (
        <>
          <AnimatePresence>
            {showActions && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setShowActions(false)}
                  className="fixed inset-0 bg-black/60 z-20 backdrop-blur-[1px]" 
                />
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="fixed bottom-0 left-0 right-0 bg-github-card border-t border-github-border p-6 z-30 rounded-t-2xl shadow-2xl pb-10 safe-area-bottom"
                >
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-white">Update Code Here</h3>
                      <p className="text-xs text-github-secondary mt-1">
                        Upload to: <span className="font-mono text-blue-400">/{path || 'root'}</span>
                      </p>
                    </div>
                    <button onClick={() => setShowActions(false)} className="bg-github-btn p-2 rounded-full hover:bg-github-border transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-github-btn hover:bg-github-border p-4 rounded-xl flex flex-col items-center gap-3 transition-colors border border-github-border group"
                    >
                      <div className="bg-blue-500/10 p-3 rounded-full group-hover:bg-blue-500/20 transition-colors">
                        <FilePlus size={24} className="text-blue-400" />
                      </div>
                      <span className="font-medium text-sm">Upload Files</span>
                    </button>

                    <button 
                      onClick={() => folderInputRef.current?.click()}
                      className="bg-github-btn hover:bg-github-border p-4 rounded-xl flex flex-col items-center gap-3 transition-colors border border-github-border group"
                    >
                      <div className="bg-green-500/10 p-3 rounded-full group-hover:bg-green-500/20 transition-colors">
                        <FolderPlus size={24} className="text-green-400" />
                      </div>
                      <span className="font-medium text-sm">Upload Folder</span>
                    </button>
                    
                     <div className="col-span-2 text-center">
                        <p className="text-[10px] text-github-secondary">
                          Tip: Upload a ZIP file via "Upload Files" to auto-extract contents here.
                        </p>
                     </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             onChange={handleFileUpload} 
             multiple 
           />
           <input 
             type="file" 
             ref={folderInputRef} 
             className="hidden" 
             onChange={handleFileUpload}
             // @ts-ignore
             webkitdirectory="" 
             directory="" 
           />

          {!showActions && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowActions(true)}
              className="fixed bottom-6 right-6 bg-github-primary text-white p-4 rounded-full shadow-lg shadow-github-primary/40 z-20 flex items-center justify-center transition-transform duration-200"
            >
              <Upload size={24} />
            </motion.button>
          )}
        </>
      )}
    </motion.div>
  );
};

export default FileExplorer;