import { Repository, FileEntry } from '../types';

const BASE_URL = 'https://api.github.com';

const getHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Accept': 'application/vnd.github.v3+json',
  'Content-Type': 'application/json',
});

// Fetch Authenticated User Repos
export const fetchRepos = async (token: string): Promise<Repository[]> => {
  const response = await fetch(`${BASE_URL}/user/repos?sort=updated&per_page=100`, {
    headers: getHeaders(token),
  });
  if (!response.ok) throw new Error('Failed to fetch repositories');
  return response.json();
};

// Create a new Repository with advanced options
export const createRepo = async (
  token: string, 
  name: string, 
  description: string,
  isPrivate: boolean,
  autoInit: boolean,
  gitignoreTemplate?: string,
  licenseTemplate?: string
): Promise<Repository> => {
  const body: any = {
    name,
    description,
    private: isPrivate,
    auto_init: autoInit,
  };

  if (gitignoreTemplate && gitignoreTemplate !== 'None') {
    body.gitignore_template = gitignoreTemplate;
    body.auto_init = true; // GitHub requires init to add files
  }

  if (licenseTemplate && licenseTemplate !== 'None') {
    body.license_template = licenseTemplate;
    body.auto_init = true;
  }

  const response = await fetch(`${BASE_URL}/user/repos`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to create repository');
  }
  return response.json();
};

// Get File/Dir Contents
export const getContents = async (token: string, owner: string, repo: string, path: string = ''): Promise<FileEntry[] | FileEntry> => {
  const url = `${BASE_URL}/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    headers: getHeaders(token),
  });
  
  if (!response.ok) {
    if (response.status === 404) return []; // Empty repo or bad path
    throw new Error('Failed to fetch contents');
  }
  return response.json();
};

// Create or Update File
export const putFile = async (
  token: string, 
  owner: string, 
  repo: string, 
  path: string, 
  contentBase64: string, 
  message: string,
  sha?: string
) => {
  const url = `${BASE_URL}/repos/${owner}/${repo}/contents/${path}`;
  const body: any = {
    message,
    content: contentBase64,
  };
  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to save file');
  }
  return response.json();
};

// Delete File
export const deleteFile = async (
  token: string,
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string
) => {
  const url = `${BASE_URL}/repos/${owner}/${repo}/contents/${path}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(token),
    body: JSON.stringify({
      message,
      sha,
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to delete file');
  }
  return response.json();
};

// Helper to convert string to base64 (UTF-8 safe)
export const toBase64 = (str: string): string => {
  return window.btoa(
    encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    })
  );
};

// Helper to convert base64 to string (UTF-8 safe)
export const fromBase64 = (str: string): string => {
  return decodeURIComponent(
    Array.prototype.map.call(window.atob(str), (c: string) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')
  );
};

// Helper to read file as Base64
export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove Data URI prefix if present (e.g., "data:text/plain;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};