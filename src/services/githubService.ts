import { AppData, GitHubConfig } from '../types';

const DATA_FILE_PATH = 'shogi_app_data.json';

export class GitHubService {
  private config: GitHubConfig;

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  private async request(path: string, options: RequestInit = {}) {
    const method = options.method || 'GET';
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}/contents/${path}`;
    const response = await fetch(url, {
      ...options,
      method,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
        ...options.headers,
      },
    });

    // If file not found on GET, return null (expected for first-time data load)
    if (response.status === 404 && method === 'GET') {
      return null;
    }

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        errorData = { message: 'Unknown Error' };
      }
      
      let message = errorData.message || 'GitHub API Error';
      if (response.status === 404) {
        message = 'GitHubリポジトリが見つからないか、アクセス権限がありません。設定画面で「ユーザー名」「リポジトリ名」「トークン」が正しいか確認してください。また、リポジトリが空の場合はREADME.mdを作成して初期化してください。';
      }
      throw new Error(message);
    }

    return response.json();
  }

  async getFileData(path: string): Promise<{ content: string; sha: string } | null> {
    const data = await this.request(path);
    if (!data) return null;

    // Handle base64 with Unicode support
    const binaryString = atob(data.content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const content = new TextDecoder().decode(bytes);

    return {
      content,
      sha: data.sha,
    };
  }

  async saveFile(path: string, content: string, message: string, sha?: string) {
    // Handle base64 with Unicode support
    const bytes = new TextEncoder().encode(content);
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64Content = btoa(binaryString);

    const body: any = {
      message,
      content: base64Content,
    };
    if (sha) {
      body.sha = sha;
    }

    return this.request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async deleteFile(path: string, message: string, sha: string) {
    return this.request(path, {
      method: 'DELETE',
      body: JSON.stringify({ message, sha }),
    });
  }

  async checkRepo() {
    const url = `https://api.github.com/repos/${this.config.owner}/${this.config.repo}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('リポジトリが見つかりません。ユーザー名とリポジトリ名が正しいか、リポジトリが公開されているか確認してください。');
      }
      if (response.status === 401) {
        throw new Error('トークンが無効です。正しいトークンを入力してください。');
      }
      if (response.status === 403) {
        throw new Error('アクセスが拒否されました。トークンの権限（repo）を確認してください。');
      }
      const error = await response.json();
      throw new Error(error.message || 'GitHub API Error');
    }
  }

  async loadAppData(): Promise<{ data: AppData; sha: string }> {
    // First, check if repo exists to distinguish from missing file
    await this.checkRepo();
    
    const res = await this.getFileData(DATA_FILE_PATH);
    if (!res) {
      return {
        data: { customTags: [], links: [], kifuMetadata: [] },
        sha: '',
      };
    }
    return {
      data: JSON.parse(res.content),
      sha: res.sha,
    };
  }

  async saveAppData(data: AppData, sha?: string) {
    return this.saveFile(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'Update app data', sha);
  }

  async saveKifu(filename: string, content: string) {
    const path = `kifus/${filename}.txt`;
    const existing = await this.getFileData(path);
    return this.saveFile(path, content, `Save kifu: ${filename}`, existing?.sha);
  }

  async getKifu(filename: string): Promise<string | null> {
    const res = await this.getFileData(`kifus/${filename}.txt`);
    return res ? res.content : null;
  }

  async deleteKifu(filename: string) {
    const path = `kifus/${filename}.txt`;
    const res = await this.getFileData(path);
    if (res) {
      await this.deleteFile(path, `Delete kifu: ${filename}`, res.sha);
    }
  }
}
