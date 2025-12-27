import React from 'react';
import { 
  FileJson, FileCode, FileImage, FileText, File, 
  FileDigit, FileType, FileSpreadsheet, FileVideo, FileMusic 
} from 'lucide-react';

export const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  const iconProps = { size: 20 };

  switch(ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return <FileCode {...iconProps} className="text-blue-400" />;
    case 'css':
    case 'scss':
    case 'less':
      return <FileCode {...iconProps} className="text-sky-300" />;
    case 'html':
      return <FileCode {...iconProps} className="text-orange-500" />;
    case 'json':
      return <FileJson {...iconProps} className="text-yellow-400" />;
    case 'md':
    case 'txt':
      return <FileText {...iconProps} className="text-gray-300" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
    case 'ico':
    case 'webp':
      return <FileImage {...iconProps} className="text-purple-400" />;
    case 'mp4':
    case 'mov':
      return <FileVideo {...iconProps} className="text-pink-500" />;
    case 'mp3':
    case 'wav':
      return <FileMusic {...iconProps} className="text-pink-400" />;
    case 'csv':
    case 'xls':
    case 'xlsx':
      return <FileSpreadsheet {...iconProps} className="text-green-500" />;
    case 'gitignore':
    case 'env':
      return <FileDigit {...iconProps} className="text-gray-500" />;
    default:
      return <File {...iconProps} className="text-github-secondary" />;
  }
};
