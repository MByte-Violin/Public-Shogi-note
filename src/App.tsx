/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  History, 
  Link as LinkIcon, 
  BarChart2, 
  ExternalLink, 
  ChevronLeft, 
  Trash2, 
  Folder, 
  FileText, 
  Copy, 
  Settings as SettingsIcon,
  X,
  PlusCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { QRCodeSVG } from 'qrcode.react';
import { GitHubService } from './services/githubService';
import { AppData, GitHubConfig, KifuMetadata, LinkItem } from './types';
import { cn } from './lib/utils';

// --- Constants ---
const SPECIAL_TAGS = ["読みの精度", "形/筋の不足", "局面判断"];

type Screen = 'main' | 'register' | 'review' | 'links' | 'analysis' | 'detail' | 'settings' | 'name_input';

// --- Components ---

const Button = ({ 
  children, 
  onClick, 
  className, 
  variant = 'default' 
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string;
  variant?: 'blue' | 'red' | 'purple' | 'green' | 'white' | 'default';
}) => {
  const variants = {
    blue: 'bg-blue-600 text-white',
    red: 'bg-red-600 text-white',
    purple: 'bg-purple-600 text-white',
    green: 'bg-green-600 text-white',
    white: 'bg-white text-black border border-gray-200',
    default: 'bg-gray-800 text-white'
  };

  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-3 rounded-md font-bold shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
    >
      {children}
    </button>
  );
};

const Modal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl"
      >
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold">いいえ</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded font-bold">はい</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  const [screen, setScreen] = useState<any>('main');
  const [githubConfig, setGithubConfig] = useState<any>(null);
  const [appData, setAppData] = useState<any>({ customTags: [], links: [], kifuMetadata: [] });
  const [dataSha, setDataSha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Registration State
  const [kifuText, setKifuText] = useState('');
  const [selectedSpecialTags, setSelectedSpecialTags] = useState<any[]>([]);
  const [selectedCustomTags, setSelectedCustomTags] = useState<any[]>([]);
  const [pendingKifuData, setPendingKifuData] = useState<any>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Review State
  const [filterSpecialTag, setFilterSpecialTag] = useState('');
  const [filterCustomTags, setFilterCustomTags] = useState<any[]>([]);
  const [selectedKifu, setSelectedKifu] = useState<any>(null);
  const [kifuContent, setKifuContent] = useState('');

  // Links State
  const [linkPath, setLinkPath] = useState<any[]>([]);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [showQR, setShowQR] = useState(false);

  // Modals
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [confirmModal, setConfirmModal] = useState<any>(null);

  const github = React.useMemo(() => githubConfig ? new GitHubService(githubConfig) : null, [githubConfig]);

  // Load Config
  useEffect(() => {
    // Check URL for config (QR code / Link share)
    const hash = window.location.hash;
    if (hash.startsWith('#config=')) {
      try {
        const base64 = hash.substring(8);
        const json = atob(base64);
        const config = JSON.parse(json);
        if (config.owner && config.repo && config.token) {
          localStorage.setItem('github_config', JSON.stringify(config));
          setGithubConfig(config);
          window.location.hash = ''; // Clear hash
          alert('GitHub連携設定を読み込みました');
        }
      } catch (e) {
        console.error('Failed to parse config from URL', e);
      }
    }

    const saved = localStorage.getItem('github_config');
    if (saved) {
      setGithubConfig(JSON.parse(saved));
    }
  }, []);

  // Load Data
  const loadData = useCallback(async () => {
    if (!github) {
      const localData = localStorage.getItem('local_app_data');
      if (localData) {
        setAppData(JSON.parse(localData));
      }
      return;
    }
    setLoading(true);
    try {
      const res = await github.loadAppData();
      setAppData(res.data);
      setDataSha(res.sha);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [githubConfig, github]);

  useEffect(() => {
    loadData();
  }, [githubConfig, loadData]);

  // Save Data Helper
  const saveData = async (newData: AppData) => {
    if (github) {
      await github.saveAppData(newData, dataSha);
      // Refresh SHA and data
      const res = await github.loadAppData();
      setDataSha(res.sha);
    } else {
      localStorage.setItem('local_app_data', JSON.stringify(newData));
    }
    setAppData(newData);
  };

  // --- Handlers ---

  const handleSaveConfig = async (config: GitHubConfig) => {
    setLoading(true);
    setError(null);
    try {
      const testGithub = new GitHubService(config);
      await testGithub.checkRepo();
      localStorage.setItem('github_config', JSON.stringify(config));
      setGithubConfig(config);
      setScreen('main');
    } catch (err: any) {
      setError(`接続エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const parseKifu = (text: string) => {
    const senteMatch = text.match(/先手：(.+)/);
    const goteMatch = text.match(/後手：(.+)/);
    const dateMatch = text.match(/開始日時：(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/);

    if (!senteMatch || !goteMatch || !dateMatch) return null;

    const dateStr = dateMatch[1].replace(/[\/ :]/g, '_');
    const id = `${senteMatch[1]}_${goteMatch[1]}_${dateStr}`;

    return {
      id,
      sente: senteMatch[1],
      gote: goteMatch[1],
      date: dateMatch[1]
    };
  };

  const handleRegisterKifu = async (customName?: string) => {
    setLoading(true);
    try {
      let metadata: Partial<KifuMetadata>;
      let content: string;

      if (customName) {
        metadata = { ...pendingKifuData?.metadata, id: customName };
        content = pendingKifuData?.content || '';
      } else {
        const parsed = parseKifu(kifuText);
        if (!parsed) {
          setPendingKifuData({ 
            content: kifuText, 
            metadata: { 
              specialTags: selectedSpecialTags, 
              tags: selectedCustomTags,
              sente: '不明',
              gote: '不明',
              date: new Date().toLocaleString()
            } 
          });
          setScreen('name_input');
          setLoading(false);
          return;
        }
        metadata = { ...parsed, specialTags: selectedSpecialTags, tags: selectedCustomTags };
        content = kifuText;
      }

      if (github) {
        await github.saveKifu(metadata.id!, content);
      } else {
        localStorage.setItem(`local_kifu_${metadata.id}`, content);
      }
      
      const newData = {
        ...appData,
        kifuMetadata: [...appData.kifuMetadata, metadata as KifuMetadata]
      };
      await saveData(newData);
      
      setKifuText('');
      setSelectedSpecialTags([]);
      setSelectedCustomTags([]);
      setScreen('main');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKifu = async (id: string) => {
    setLoading(true);
    try {
      if (github) {
        await github.deleteKifu(id);
      } else {
        localStorage.removeItem(`local_kifu_${id}`);
      }
      const newData = {
        ...appData,
        kifuMetadata: appData.kifuMetadata.filter((k: any) => k.id !== id)
      };
      await saveData(newData);
      setDeleteModal(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (name: string) => {
    if (!name) return;
    if (appData.customTags.includes(name)) return;
    const newData = { ...appData, customTags: [...appData.customTags, name] };
    try {
      await saveData(newData);
      setSelectedCustomTags(prev => [...prev, name]);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteTag = async (name: string) => {
    const newData = { 
      ...appData, 
      customTags: appData.customTags.filter((t: any) => t !== name),
      kifuMetadata: appData.kifuMetadata.map((k: any) => ({
        ...k,
        tags: k.tags.filter((t: any) => t !== name)
      }))
    };
    try {
      await saveData(newData);
      setDeleteModal(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewKifu = async (kifu: KifuMetadata) => {
    setLoading(true);
    try {
      let content: string | null = null;
      if (github) {
        content = await github.getKifu(kifu.id);
      } else {
        content = localStorage.getItem(`local_kifu_${kifu.id}`);
      }
      setKifuContent(content || 'データが見つかりませんでした');
      setSelectedKifu(kifu);
      setScreen('detail');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Link Helpers ---
  const getCurrentLinks = () => {
    let current = appData.links;
    for (const folder of linkPath) {
      const found = current.find((item: any) => item.id === folder.id);
      if (found && found.children) {
        current = found.children;
      } else {
        return [];
      }
    }
    return current;
  };

  const handleAddFolder = async (name: string) => {
    if (!name) return;
    const newFolder: LinkItem = { id: Date.now().toString(), name, type: 'folder', children: [] };
    
    const updateLinks = (items: LinkItem[], path: LinkItem[]): LinkItem[] => {
      if (path.length === 0) return [...items, newFolder];
      return items.map(item => {
        if (item.id === path[0].id) {
          return { ...item, children: updateLinks(item.children || [], path.slice(1)) };
        }
        return item;
      });
    };

    const newData = { ...appData, links: updateLinks(appData.links, linkPath) };
    try {
      await saveData(newData);
      setIsAddingFolder(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddLink = async (name: string, url: string) => {
    if (!name || !url) return;
    const newLink: LinkItem = { id: Date.now().toString(), name, type: 'link', url };
    
    const updateLinks = (items: LinkItem[], path: LinkItem[]): LinkItem[] => {
      if (path.length === 0) return [...items, newLink];
      return items.map(item => {
        if (item.id === path[0].id) {
          return { ...item, children: updateLinks(item.children || [], path.slice(1)) };
        }
        return item;
      });
    };

    const newData = { ...appData, links: updateLinks(appData.links, linkPath) };
    try {
      await saveData(newData);
      setIsAddingLink(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteLinkItem = async (id: string) => {
    const deleteFromLinks = (items: LinkItem[], targetId: string): LinkItem[] => {
      return items.filter(item => item.id !== targetId).map(item => ({
        ...item,
        children: item.children ? deleteFromLinks(item.children, targetId) : undefined
      }));
    };

    const newData = { ...appData, links: deleteFromLinks(appData.links, id) };
    try {
      await saveData(newData);
      setDeleteModal(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // --- Render Helpers ---

  const filteredKifus = appData.kifuMetadata.filter((k: any) => {
    const matchSpecial = !filterSpecialTag || k.specialTags.includes(filterSpecialTag);
    const matchCustom = filterCustomTags.every(t => k.tags.includes(t));
    return matchSpecial && matchCustom;
  });

  const analysisData = SPECIAL_TAGS.map(tag => ({
    name: tag,
    count: appData.kifuMetadata.filter((k: any) => k.specialTags.includes(tag)).length
  }));

  const tagStats = appData.customTags.map((tag: any) => {
    const count = appData.kifuMetadata.filter((k: any) => k.tags.includes(tag)).length;
    const percentage = appData.kifuMetadata.length > 0 ? (count / appData.kifuMetadata.length * 100).toFixed(1) : 0;
    return { tag, count, percentage };
  });

  // --- Screens ---

  const renderMain = () => (
    <div className="flex flex-col h-full bg-[#f5f5dc] p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black text-gray-800 border-b-4 border-red-600 pb-1">将棋ノート</h1>
        <button onClick={() => setScreen('settings')} className="p-2 text-gray-600">
          <SettingsIcon size={24} />
        </button>
      </div>

      {!githubConfig && (
        <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg flex flex-col gap-2">
          <p className="text-sm font-bold text-blue-800">
            GitHub連携が未設定です。データはブラウザ（ローカル）にのみ保存されます。
          </p>
          <button 
            onClick={() => setScreen('settings')}
            className="text-xs font-black text-blue-600 underline text-left"
          >
            クラウド同期（GitHub）を設定する
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Button variant="blue" className="h-32 text-lg" onClick={() => setScreen('register')}>
          <PlusCircle size={24} />
          棋譜データの登録
        </Button>
        <Button variant="red" className="h-32 text-lg" onClick={() => setScreen('review')}>
          <History size={24} />
          過去データ振返り
        </Button>
        <Button variant="purple" className="h-32 text-lg" onClick={() => setScreen('links')}>
          <LinkIcon size={24} />
          リンク登録
        </Button>
        <Button variant="green" className="h-32 text-lg" onClick={() => setScreen('analysis')}>
          <BarChart2 size={24} />
          データ分析
        </Button>
      </div>

      <div className="mt-auto pt-8">
        <Button 
          variant="white" 
          className="w-full py-6 text-xl" 
          onClick={() => window.open('https://lishogi.org/paste', '_blank')}
        >
          <ExternalLink size={24} />
          棋譜解析する
        </Button>
      </div>
    </div>
  );

  const renderRegister = () => (
    <div className="flex flex-col h-full p-4 overflow-y-auto bg-[#f5f5dc]">
      <div className="flex items-center mb-6">
        <Button variant="blue" onClick={() => setScreen('main')}>
          <ChevronLeft size={20} />
          メイン画面へ戻る
        </Button>
      </div>

      <textarea
        className="w-full h-64 p-4 bg-white border border-gray-300 rounded-md shadow-inner font-mono text-sm mb-6"
        placeholder="ここに棋譜データを貼り付けてください"
        value={kifuText}
        onChange={(e) => setKifuText(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-3">
          <h3 className="font-bold text-gray-700">特別タグ設定</h3>
          {SPECIAL_TAGS.map(tag => (
            <label key={tag} className="flex items-center gap-2 p-2 bg-white/50 rounded cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedSpecialTags.includes(tag)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedSpecialTags([...selectedSpecialTags, tag]);
                  else setSelectedSpecialTags(selectedSpecialTags.filter(t => t !== tag));
                }}
              />
              <span className="text-sm">{tag}</span>
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-700">追加タグ設定</h3>
            <button 
              onClick={() => setIsAddingTag(true)}
              className="text-xs bg-gray-200 px-2 py-1 rounded"
            >
              タグの作成
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {appData.customTags.map((tag: any) => (
              <div key={tag} className="flex items-center justify-between p-2 bg-white/50 rounded">
                <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                  <input 
                    type="checkbox" 
                    checked={selectedCustomTags.includes(tag)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCustomTags([...selectedCustomTags, tag]);
                      else setSelectedCustomTags(selectedCustomTags.filter(t => t !== tag));
                    }}
                  />
                  <span className="text-sm truncate">{tag}</span>
                </label>
                <button 
                  onClick={() => setDeleteModal({ type: 'tag', id: tag, name: tag })}
                  className="text-red-400 p-1 ml-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Button variant="default" className="w-full py-4 text-lg mt-auto" onClick={() => handleRegisterKifu()}>
        棋譜データの登録
      </Button>
    </div>
  );

  const renderReview = () => (
    <div className="flex flex-col h-full p-4 bg-[#f5f5dc]">
      <div className="flex items-center mb-6">
        <Button variant="blue" onClick={() => setScreen('main')}>
          <ChevronLeft size={20} />
          メイン画面へ戻る
        </Button>
      </div>

      <select 
        className="w-full p-3 bg-white border border-gray-300 rounded-md mb-4 shadow-sm"
        value={filterSpecialTag}
        onChange={(e) => setFilterSpecialTag(e.target.value)}
      >
        <option value="">特別タグを選択 (全て)</option>
        {SPECIAL_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
      </select>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        <div className="bg-white/40 p-3 rounded-lg">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">タグフィルタ</h3>
          <div className="flex flex-wrap gap-3">
            {appData.customTags.map((tag: any) => (
              <div key={tag} className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
                <input 
                  type="checkbox" 
                  className="w-4 h-4"
                  checked={filterCustomTags.includes(tag)}
                  onChange={(e) => {
                    if (e.target.checked) setFilterCustomTags([...filterCustomTags, tag]);
                    else setFilterCustomTags(filterCustomTags.filter(t => t !== tag));
                  }}
                />
                <span className="text-sm font-medium">{tag}</span>
                <button onClick={() => setDeleteModal({ type: 'tag', id: tag, name: tag })} className="text-red-400 ml-2 p-1">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-bold text-gray-700">該当棋譜データ ({filteredKifus.length})</h3>
          {filteredKifus.map((k: any) => (
            <div key={k.id} className="flex items-center gap-2 bg-white p-3 rounded-md shadow-sm border border-gray-100">
              <div 
                className="flex-1 cursor-pointer"
                onClick={() => setConfirmModal({
                  title: '確認',
                  message: '対局棋譜表示画面へ移動しますか？',
                  onConfirm: () => {
                    setConfirmModal(null);
                    handleViewKifu(k);
                  }
                })}
              >
                <div className="font-bold text-sm truncate">{k.id}</div>
                <div className="text-xs text-gray-500">{k.date}</div>
              </div>
              <button onClick={() => setDeleteModal({ type: 'kifu', id: k.id, name: k.id })} className="text-red-400 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDetail = () => (
    <div className="flex flex-col h-full p-4 bg-[#f5f5dc]">
      <div className="flex justify-between items-center mb-6">
        <Button variant="blue" onClick={() => setScreen('review')}>
          <ChevronLeft size={20} />
          前画面へ戻る
        </Button>
        <button 
          onClick={() => {
            navigator.clipboard.writeText(kifuContent);
            alert('コピーしました');
          }}
          className="p-3 bg-white rounded-full shadow-md text-gray-600"
        >
          <Copy size={20} />
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-inner border border-gray-300 flex-1 overflow-y-auto font-mono text-sm mb-6 whitespace-pre-wrap">
        {kifuContent}
      </div>

      <Button 
        variant="white" 
        className="w-full py-4 text-lg" 
        onClick={() => window.open('https://lishogi.org/paste', '_blank')}
      >
        <ExternalLink size={20} />
        棋譜解析する
      </Button>
    </div>
  );

  const renderLinks = () => {
    const currentLinks = getCurrentLinks();
    const isTopLevel = linkPath.length === 0;

    return (
      <div className="flex flex-col h-full p-4 bg-[#f5f5dc]">
        <div className="flex items-center mb-6">
          <Button 
            variant="blue" 
            onClick={() => {
              if (isTopLevel) setScreen('main');
              else setLinkPath(linkPath.slice(0, -1));
            }}
          >
            <ChevronLeft size={20} />
            {isTopLevel ? 'メイン画面へ戻る' : '戻る'}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 mb-6">
          {linkPath.length > 0 && (
            <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Folder size={12} /> {linkPath.map(p => p.name).join(' / ')}
            </div>
          )}

          {currentLinks.map((item: any) => (
            <div key={item.id} className="flex items-center gap-2 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div 
                className="flex-1 flex items-center gap-3 cursor-pointer"
                onClick={() => {
                  if (item.type === 'folder') {
                    if (linkPath.length < 3) setLinkPath([...linkPath, item]);
                    else alert('これ以上深い階層は作成できません');
                  } else {
                    window.open(item.url, '_blank');
                  }
                }}
              >
                {item.type === 'folder' ? <span className="text-2xl">📁</span> : <LinkIcon size={20} className="text-blue-500" />}
                <span className="font-bold text-gray-800">{item.name}</span>
              </div>
              <button onClick={() => setDeleteModal({ type: 'folder', id: item.id, name: item.name })} className="text-red-400 p-2">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          {linkPath.length < 3 && (
            <Button variant="default" className="w-full" onClick={() => setIsAddingFolder(true)}>
              フォルダを作成する
            </Button>
          )}
          {!isTopLevel && (
            <Button variant="purple" className="w-full" onClick={() => setIsAddingLink(true)}>
              リンクを登録する
            </Button>
          )}
        </div>
      </div>
    );
  };

  const renderAnalysis = () => (
    <div className="flex flex-col h-full p-4 bg-[#f5f5dc] overflow-y-auto">
      <div className="flex items-center mb-6">
        <Button variant="blue" onClick={() => setScreen('main')}>
          <ChevronLeft size={20} />
          メイン画面へ戻る
        </Button>
      </div>

      <div className="flex flex-col gap-6 pb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-80">
          <h3 className="font-bold text-gray-700 mb-4">特別タグ別対局数</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analysisData} layout="horizontal" margin={{ bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="name" 
                fontSize={10} 
                interval={0} 
                angle={-15} 
                textAnchor="end"
                height={50}
              />
              <YAxis type="number" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#4285F4" radius={[4, 4, 0, 0]}>
                {analysisData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#a855f7', '#22c55e'][index % 4]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-4">タグ統計</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-bottom border-gray-100 text-gray-400 text-left">
                <th className="pb-2 font-medium">タグ名</th>
                <th className="pb-2 font-medium text-right">対局数</th>
                <th className="pb-2 font-medium text-right">割合</th>
              </tr>
            </thead>
            <tbody>
              {tagStats.map((stat: any) => (
                <tr key={stat.tag} className="border-t border-gray-50">
                  <td className="py-2 font-bold text-gray-700">{stat.tag}</td>
                  <td className="py-2 text-right">{stat.count}</td>
                  <td className="py-2 text-right text-gray-500">{stat.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => {
    const configString = githubConfig ? btoa(JSON.stringify(githubConfig)) : '';
    const shareUrl = `${window.location.origin}${window.location.pathname}#config=${configString}`;

    return (
      <div className="flex flex-col h-full p-6 bg-[#f5f5dc] overflow-y-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setScreen('main')} className="p-2 text-gray-600">
            <ChevronLeft size={24} />
          </button>
          <h2 className="text-2xl font-black">GitHub連携設定</h2>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg mb-6 text-sm text-amber-800">
          <p className="font-bold mb-2">⚠️ 接続に失敗する場合のチェックリスト</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>ユーザー名:</strong> URLの <code>github.com/<strong>ここ</strong>/repo</code> の部分です。</li>
            <li><strong>リポジトリ名:</strong> URLの最後 <code>github.com/user/<strong>ここ</strong></code> の部分です。</li>
            <li><strong>トークンの権限:</strong> PAT作成時に <code>repo</code> スコープにチェックが入っているか確認してください。</li>
            <li><strong>リポジトリの初期化:</strong> リポジトリが完全に空だとエラーになります。README.md等を作成してください。</li>
          </ul>
        </div>

        <div className="space-y-4 mb-8">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">GitHub ユーザー名</label>
            <input 
              id="gh-owner"
              className="w-full p-3 border rounded bg-white" 
              defaultValue={githubConfig?.owner}
              placeholder="例: myusername"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">リポジトリ名 (プライベート推奨)</label>
            <input 
              id="gh-repo"
              className="w-full p-3 border rounded bg-white" 
              defaultValue={githubConfig?.repo}
              placeholder="例: my-shogi-data"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Personal Access Token (PAT)</label>
            <input 
              id="gh-token"
              type="password"
              className="w-full p-3 border rounded bg-white" 
              defaultValue={githubConfig?.token}
              placeholder="ghp_xxxxxxxxxxxx"
            />
            <p className="text-[10px] text-gray-400 mt-1">
              ※権限は 'repo' が必要です。
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="blue" className="w-full py-4 font-black" onClick={() => {
            const owner = (document.getElementById('gh-owner') as HTMLInputElement).value;
            const repo = (document.getElementById('gh-repo') as HTMLInputElement).value;
            const token = (document.getElementById('gh-token') as HTMLInputElement).value;
            if (owner && repo && token) {
              handleSaveConfig({ owner, repo, token });
            } else {
              alert('全ての項目を入力してください');
            }
          }}>
            設定を保存して接続テスト
          </Button>

          {githubConfig && (
            <Button variant="white" className="w-full py-4 font-black" onClick={() => setShowQR(!showQR)}>
              {showQR ? 'QRコードを閉じる' : 'スマホへ設定を共有 (QRコード)'}
            </Button>
          )}

          {showQR && githubConfig && (
            <div className="bg-white p-6 rounded-xl border-2 border-gray-200 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <p className="text-xs font-bold text-gray-500 text-center">
                スマホのカメラでスキャンすると、設定が自動的に読み込まれます。
              </p>
              <div className="bg-white p-2 rounded-lg shadow-sm">
                <QRCodeSVG value={shareUrl} size={200} />
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert('共有用URLをコピーしました');
                }}
                className="text-xs text-blue-600 font-bold underline"
              >
                共有用URLをコピー
              </button>
            </div>
          )}

          <Button variant="red" className="w-full py-4 font-black mt-4" onClick={() => {
            if (confirm('設定を削除しますか？（ローカルデータは残ります）')) {
              localStorage.removeItem('github_config');
              setGithubConfig(null);
              setScreen('main');
            }
          }}>
            設定を解除する
          </Button>
        </div>
      </div>
    );
  };

  const renderNameInput = () => (
    <div className="flex flex-col h-full p-6 bg-[#f5f5dc] items-center justify-center text-center">
      <h2 className="text-2xl font-black mb-4 text-red-600">名前を入力してください</h2>
      <p className="text-sm text-gray-600 mb-6">
        棋譜データから対局情報を自動取得できませんでした。<br/>
        保存する名前を入力してください。
      </p>
      <input 
        id="custom-kifu-name"
        className="w-full p-4 border-2 border-red-200 rounded-lg bg-white mb-6 text-lg font-bold"
        placeholder="例: 20240319_対局データ"
        autoFocus
      />
      <div className="flex gap-4 w-full">
        <Button variant="white" className="flex-1" onClick={() => setScreen('register')}>
          戻る
        </Button>
        <Button 
          variant="red" 
          className="flex-1"
          onClick={() => {
            const name = (document.getElementById('custom-kifu-name') as HTMLInputElement).value;
            if (name) handleRegisterKifu(name);
            else alert('名前を入力してください');
          }}
        >
          登録する
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-[#f5f5dc] font-sans text-gray-900 overflow-hidden relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={screen}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full w-full"
        >
          {screen === 'main' && renderMain()}
          {screen === 'register' && renderRegister()}
          {screen === 'review' && renderReview()}
          {screen === 'detail' && renderDetail()}
          {screen === 'links' && renderLinks()}
          {screen === 'analysis' && renderAnalysis()}
          {screen === 'settings' && renderSettings()}
          {screen === 'name_input' && renderNameInput()}
        </motion.div>
      </AnimatePresence>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-[100]">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="font-bold">通信中...</span>
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-xl z-[110] flex justify-between items-center">
          <span className="text-sm font-bold">{error}</span>
          <button onClick={() => setError(null)}><X size={20} /></button>
        </div>
      )}

      {/* Modals */}
      {/* Add Tag Modal */}
      {isAddingTag && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4">タグの作成</h3>
            <input 
              autoFocus
              className="w-full p-3 border rounded mb-6" 
              placeholder="タグ名を入力"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateTag(newTagName);
                  setNewTagName('');
                  setIsAddingTag(false);
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAddingTag(false)} className="px-4 py-2 text-gray-600">キャンセル</button>
              <button 
                onClick={() => {
                  handleCreateTag(newTagName);
                  setNewTagName('');
                  setIsAddingTag(false);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded font-bold"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {isAddingFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4">フォルダ作成</h3>
            <input 
              autoFocus
              className="w-full p-3 border rounded mb-6" 
              placeholder="フォルダ名"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddFolder(newFolderName);
                  setNewFolderName('');
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAddingFolder(false)} className="px-4 py-2 text-gray-600">キャンセル</button>
              <button 
                onClick={() => {
                  handleAddFolder(newFolderName);
                  setNewFolderName('');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded font-bold"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Link Modal */}
      {isAddingLink && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[120] p-4">
          <div className="bg-white rounded-lg p-6 w-full max-sm shadow-2xl">
            <h3 className="text-xl font-bold mb-4">リンク登録</h3>
            <input 
              className="w-full p-3 border rounded mb-3" 
              placeholder="タイトル" 
              value={newLinkTitle}
              onChange={(e) => setNewLinkTitle(e.target.value)}
            />
            <input 
              className="w-full p-3 border rounded mb-6" 
              placeholder="URL (https://...)" 
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setIsAddingLink(false)} className="px-4 py-2 text-gray-600">キャンセル</button>
              <button 
                onClick={() => {
                  handleAddLink(newLinkTitle, newLinkUrl);
                  setNewLinkTitle('');
                  setNewLinkUrl('');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded font-bold"
              >
                登録
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal 
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        onConfirm={() => {
          if (deleteModal?.type === 'tag') handleDeleteTag(deleteModal.id);
          if (deleteModal?.type === 'kifu') handleDeleteKifu(deleteModal.id);
          if (deleteModal?.type === 'folder') handleDeleteLinkItem(deleteModal.id);
        }}
        title="消去の確認"
        message={`「${deleteModal?.name}」を消しますか？`}
      />

      <Modal 
        isOpen={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        onConfirm={confirmModal?.onConfirm || (() => {})}
        title={confirmModal?.title || ''}
        message={confirmModal?.message || ''}
      />
    </div>
  );
}
