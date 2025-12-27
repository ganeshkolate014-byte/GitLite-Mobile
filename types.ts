export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
  githubToken?: string;
  githubUsername?: string;
}

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export interface FileEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string; // For file content responses
  encoding?: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface CommitPayload {
  message: string;
  content: string; // Base64 encoded
  sha?: string; // Required for updates/deletes
}
