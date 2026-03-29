export interface KifuMetadata {
  id: string; // filename
  specialTags: string[];
  tags: string[];
  sente: string;
  gote: string;
  date: string;
}

export interface LinkItem {
  id: string;
  name: string;
  type: 'folder' | 'link';
  url?: string;
  children?: LinkItem[];
}

export interface AppData {
  customTags: string[];
  links: LinkItem[];
  kifuMetadata: KifuMetadata[];
}
