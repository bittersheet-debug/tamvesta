import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Trash2,
  Heart,
  MessageCircle,
  Video,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  AlertCircle,
  X,
  Play,
  RotateCcw,
} from 'lucide-react';
import type { StudentPost, Story } from '../../types/index.ts';
import { VerifiedBadge } from '../../components/VerifiedBadge.tsx';

interface SocialMonitorTabProps {
  posts: StudentPost[];
  stories: Story[];
  onDeletePost: (postId: string) => Promise<void>;
  onDeleteStory: (storyId: string) => Promise<void>;
  onRefresh: () => void;
}

export const SocialMonitorTab: React.FC<SocialMonitorTabProps> = ({
  posts,
  stories,
  onDeletePost,
  onDeleteStory,
  onRefresh,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'posts' | 'stories'>('posts');
  const [search, setSearch] = useState('');

  // Delete modal state
  const [postToDelete, setPostToDelete] = useState<StudentPost | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered lists
  const filteredPosts = posts.filter(
    (p) =>
      p.caption.toLowerCase().includes(search.toLowerCase()) ||
      p.authorName.toLowerCase().includes(search.toLowerCase()) ||
      p.authorUsername.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStories = stories.filter(
    (s) =>
      (s.caption && s.caption.toLowerCase().includes(search.toLowerCase())) ||
      s.authorName.toLowerCase().includes(search.toLowerCase()) ||
      s.authorUsername.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      await onDeletePost(postToDelete.id);
      setPostToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus postingan');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteStory = async () => {
    if (!storyToDelete) return;
    setIsDeleting(true);
    try {
      await onDeleteStory(storyToDelete.id);
      setStoryToDelete(null);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus story');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-xs font-bold text-amber-700 border border-amber-200 mb-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>MODERASI & PENGAWASAN KONTEN</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Manajemen Feed & Story Sekolah
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Pantau dan kelola seluruh konten feed dan story yang diunggah civitas sekolah. Postingan dan story tersimpan permanen serta tersinkronisasi real-time antarsemua perangkat.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* Sub Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setActiveSubTab('posts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'posts'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Feed Postingan</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-black">
              {posts.length}
            </span>
          </button>
          <button
            onClick={() => setActiveSubTab('stories')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'stories'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Story Sekolah</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 font-black">
              {stories.length}
            </span>
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari teks, pembuat konten..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Content View */}
      {activeSubTab === 'posts' ? (
        /* POSTS LIST */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">Tidak ada postingan feed ditemukan.</p>
            </div>
          ) : (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Author Header */}
                  <div className="p-4 flex items-center justify-between border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                        {post.authorAvatar ? (
                          <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full object-cover" />
                        ) : (
                          post.authorName.charAt(0)
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1 font-bold text-xs text-slate-900">
                          <span>{post.authorName}</span>
                          <VerifiedBadge
                            type={post.authorBadgeType === 'green' || post.authorRole === 'guru' ? 'green' : 'blue'}
                            size="xs"
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          @{post.authorUsername} • {new Date(post.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setPostToDelete(post)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Hapus Postingan (Moderasi Admin)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Media Preview */}
                  {post.mediaUrl && (
                    <div className="relative h-48 bg-slate-100 overflow-hidden">
                      {post.mediaType === 'video' ? (
                        <video src={post.mediaUrl} controls className="w-full h-full object-cover" />
                      ) : (
                        <img src={post.mediaUrl} alt="Post media" className="w-full h-full object-cover" />
                      )}
                    </div>
                  )}

                  {/* Caption */}
                  <div className="p-4">
                    <p className="text-xs text-slate-800 whitespace-pre-wrap line-clamp-4 leading-relaxed">
                      {post.caption}
                    </p>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-[11px] font-bold">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      {post.likes?.length || 0}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-bold">
                      <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
                      {post.comments?.length || 0}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                    Permanen
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* STORIES LIST */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredStories.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-400">
              <Sparkles className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-bold text-slate-700">Tidak ada story aktif ditemukan.</p>
            </div>
          ) : (
            filteredStories.map((story) => (
              <div
                key={story.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-slate-950 overflow-hidden">
                    {story.mediaType === 'video' ? (
                      <video src={story.mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={story.mediaUrl} alt="Story preview" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-black/60 text-white backdrop-blur-xs">
                        {story.mediaType === 'video' ? 'Video' : 'Foto'}
                      </span>
                      <button
                        onClick={() => setStoryToDelete(story)}
                        className="p-1 bg-black/60 hover:bg-rose-600 text-white rounded-lg transition"
                        title="Hapus Story"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 space-y-1">
                    <span className="font-bold text-xs text-slate-900 block truncate">{story.authorName}</span>
                    {story.caption && (
                      <p className="text-[11px] text-slate-600 line-clamp-2">{story.caption}</p>
                    )}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{new Date(story.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-bold text-emerald-700">Tersimpan</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS POSTINGAN */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Konfirmasi Penghapusan Permanen</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data ini secara permanen? Postingan oleh <strong>{postToDelete.authorName}</strong> akan dihapus selamanya dari database.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeletePost}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS STORY */}
      {storyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-900 text-base">Konfirmasi Penghapusan Permanen</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data ini secara permanen? Story dari <strong>{storyToDelete.authorName}</strong> akan dihapus selamanya dari database.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <button
                onClick={() => setStoryToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeleteStory}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus Permanen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
