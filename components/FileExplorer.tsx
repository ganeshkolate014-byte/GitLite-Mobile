import React, { useEffect, useState, useRef } from 'react';
import { Repository, FileEntry } from '../types';
import { getContents, deleteFile, putFile, readFileAsBase64, fromBase64, toBase64 } from '../services/github';
import { useAuth } from '../context/AuthContext';
import { FileText, Folder, ArrowLeft, Upload, Trash2, ChevronRight, FileCode, Download, Save, X } from 'lucide-react';
import JSZip from 'jszip';

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
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Fetch Contents when path changes
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
        // Sort: Folders first, then files
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
        // GitHub API returns content with newlines which base64 decode might need cleaning
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
      // Refresh sha locally if we wanted to stay strict, but reloading file is safer
      // We'll just exit edit mode. ideally we re-fetch the file metadata.
    } catch (error) {
      console.error(error);
      setStatusMsg("Failed to save changes.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user?.githubToken) return;
    
    setUploading(true);
    setStatusMsg(`Processing ${files.length} file(s)...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Handle ZIP special case
        if (file.name.endsWith('.zip')) {
           setStatusMsg(`Extracting ${file.name}...`);
           const zip = new JSZip();
           const zipContent = await zip.loadAsync(file);
           
           // Iterate ZIP contents
           const entries = Object.keys(zipContent.files);
           let processed = 0;
           
           for (const filename of entries) {
             const entry = zipContent.files[filename];
             if (entry.dir) continue; // Skip directories, we just create files at paths

             const blob = await entry.async('blob');
             // Re-create a File object to reuse logic or read as base64 directly
             const entryBase64 = await readFileAsBase64(new File([blob], filename));
             
             // Construct path relative to current folder
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
          // Normal File
          const base64 = await readFileAsBase64(file);
          // For folder uploads (webkitdirectory), file.webkitRelativePath gives the path
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

  // Breadcrumbs
  const pathParts = path.split('/').filter(Boolean);

  return (
    <div className="flex flex-col h-full bg-github-dark min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-github-card border-b border-github-border p-4 shadow-sm">
        <div className="flex items-center gap-2 text-github-text mb-2">
           <button onClick={handleNavigateUp} className="p-1 hover:bg-github-btn rounded">
             <ArrowLeft size={20} />
           </button>
           <h2 className="font-semibold text-lg truncate">{repo.name}</h2>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm text-github-secondary overflow-x-auto whitespace-nowrap pb-1">
          <span 
            onClick={() => { setPath(''); setViewingFile(null); }}
            className={`cursor-pointer hover:text-blue-400 ${!path ? 'font-bold text-white' : ''}`}
          >
            root
          </span>
          {pathParts.map((part, index) => (
             <React.Fragment key={index}>
               <ChevronRight size={14} />
               <span 
                 onClick={() => {
                    setPath(pathParts.slice(0, index + 1).join('/'));
                    setViewingFile(null);
                 }}
                 className={`cursor-pointer hover:text-blue-400 ${index === pathParts.length - 1 && !viewingFile ? 'font-bold text-white' : ''}`}
               >
                 {part}
               </span>
             </React.Fragment>
          ))}
          {viewingFile && (
             <>
                <ChevronRight size={14} />
                <span className="font-bold text-white">{viewingFile.name}</span>
             </>
          )}
        </div>
        
        {/* Status Message */}
        {statusMsg && (
           <div className="text-xs text-blue-400 mt-2 animate-pulse">
             {statusMsg}
           </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {loading ? (
          <div className="text-center mt-10 text-github-secondary">Loading...</div>
        ) : viewingFile ? (
          // FILE VIEWER / EDITOR
          <div className="bg-github-card border border-github-border rounded-lg overflow-hidden flex flex-col h-full">
            <div className="bg-github-btn border-b border-github-border p-2 flex justify-between items-center">
               <div className="flex gap-2">
                 {!isEditing && (
                    <button 
                      onClick={() => { setEditContent(fileContent); setIsEditing(true); }}
                      className="text-xs bg-github-border hover:bg-gray-700 text-white px-3 py-1 rounded"
                    >
                      Edit
                    </button>
                 )}
                 {isEditing && (
                    <>
                      <button 
                         onClick={handleSaveFile}
                         disabled={uploading}
                         className="text-xs bg-github-primary hover:bg-github-primaryHover text-white px-3 py-1 rounded flex items-center gap-1"
                      >
                        <Save size={12} /> Save
                      </button>
                      <button 
                         onClick={() => setIsEditing(false)}
                         className="text-xs bg-red-900/50 hover:bg-red-900 text-red-200 px-3 py-1 rounded flex items-center gap-1"
                      >
                         <X size={12} /> Cancel
                      </button>
                    </>
                 )}
               </div>
               <button onClick={() => handleDelete(viewingFile)} className="text-github-secondary hover:text-red-400 p-1">
                 <Trash2 size={16} />
               </button>
            </div>
            {isEditing ? (
              <textarea 
                className="w-full h-96 bg-github-dark text-github-text p-4 font-mono text-sm outline-none resize-y"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
              />
            ) : (
              <pre className="p-4 text-sm font-mono overflow-auto bg-github-dark h-full">
                {fileContent}
              </pre>
            )}
          </div>
        ) : (
          // FILE LIST
          <div className="bg-github-card border border-github-border rounded-lg overflow-hidden">
            {contents.length === 0 ? (
               <div className="p-8 text-center text-github-secondary">Folder is empty.</div>
            ) : (
               contents.map(item => (
                 <div 
                   key={item.sha}
                   onClick={() => item.type === 'dir' ? handleNavigate(item.name) : handleFileClick(item)}
                   className="flex items-center gap-3 p-3 border-b border-github-border last:border-0 hover:bg-github-btn cursor-pointer transition-colors"
                 >
                   {item.type === 'dir' ? (
                     <Folder size={20} className="text-blue-400" />
                   ) : (
                     <FileText size={20} className="text-github-secondary" />
                   )}
                   <span className="text-sm truncate flex-1">{item.name}</span>
                   <span className="text-xs text-github-secondary">
                     {item.size > 0 ? (item.size / 1024).toFixed(1) + ' KB' : ''}
                   </span>
                 </div>
               ))
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer Actions (Only show when not viewing a file) */}
      {!viewingFile && (
        <div className="fixed bottom-0 left-0 right-0 bg-github-card border-t border-github-border p-4 flex justify-around items-center gap-4 safe-area-bottom">
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
             // @ts-ignore - webkitdirectory is non-standard but supported
             webkitdirectory="" 
             directory="" 
           />
           
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex-1 flex flex-col items-center gap-1 text-github-text hover:text-white"
           >
             <Upload size={20} />
             <span className="text-[10px]">Upload Files/Zip</span>
           </button>

           <button 
             onClick={() => folderInputRef.current?.click()}
             className="flex-1 flex flex-col items-center gap-1 text-github-text hover:text-white"
           >
             <Folder size={20} />
             <span className="text-[10px]">Upload Folder</span>
           </button>
        </div>
      )}
    </div>
  );
};

export default FileExplorer;
