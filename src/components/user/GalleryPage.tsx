import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Grid3x3, List, Trash2, Download, Eye, Clock, Sparkles, Filter } from 'lucide-react';
import { SavedReportModal } from '../SavedReportModal';

export function GalleryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [filterTag, setFilterTag] = useState<string>('all');

  const savedReports = [
    {
      id: '1',
      name: '日落海滩照片',
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400',
      date: '2025-11-08 14:30',
      tags: ['风景', '日落', '海滩'],
      views: 12,
      hasLR: true,
      hasPS: true,
    },
    {
      id: '2',
      name: '人像摄影作品',
      thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      date: '2025-11-08 10:15',
      tags: ['人像', '室内', '柔光'],
      views: 8,
      hasLR: true,
      hasPS: false,
    },
    {
      id: '3',
      name: '城市建筑摄影',
      thumbnail: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=400',
      date: '2025-11-07 16:45',
      tags: ['建筑', '城市', '蓝调'],
      views: 15,
      hasLR: true,
      hasPS: true,
    },
    {
      id: '4',
      name: '自然风光',
      thumbnail: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
      date: '2025-11-07 09:20',
      tags: ['风景', '山脉', '自然'],
      views: 20,
      hasLR: true,
      hasPS: true,
    },
    {
      id: '5',
      name: '美食摄影',
      thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
      date: '2025-11-06 18:00',
      tags: ['美食', '静物', '暖色调'],
      views: 6,
      hasLR: true,
      hasPS: false,
    },
    {
      id: '6',
      name: '街头摄影',
      thumbnail: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400',
      date: '2025-11-06 15:30',
      tags: ['街头', '黑白', '对比'],
      views: 10,
      hasLR: true,
      hasPS: true,
    },
  ];

  const allTags = ['all', ...Array.from(new Set(savedReports.flatMap(r => r.tags)))];

  const filteredReports = savedReports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         report.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterTag === 'all' || report.tags.includes(filterTag);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="px-8 py-8">
      {/* Header Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1" style={{ fontSize: '13px', fontWeight: 500 }}>
                总报告数
              </p>
              <p className="text-gray-900" style={{ fontSize: '28px', fontWeight: 700 }}>
                {savedReports.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1" style={{ fontSize: '13px', fontWeight: 500 }}>
                总浏览量
              </p>
              <p className="text-gray-900" style={{ fontSize: '28px', fontWeight: 700 }}>
                {savedReports.reduce((sum, r) => sum + r.views, 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-1" style={{ fontSize: '13px', fontWeight: 500 }}>
                本月新增
              </p>
              <p className="text-gray-900" style={{ fontSize: '28px', fontWeight: 700 }}>
                {savedReports.filter(r => r.date.includes('2025-11')).length}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索报告名称或标签..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              style={{ fontSize: '14px' }}
            />
          </div>
        </div>

        {/* View Mode & Filter */}
        <div className="flex items-center gap-3">
          {/* Tag Filter */}
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-xl">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-gray-700 cursor-pointer"
              style={{ fontSize: '13px', fontWeight: 500 }}
            >
              {allTags.map(tag => (
                <option key={tag} value={tag}>
                  {tag === 'all' ? '全部标签' : tag}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <Grid3x3 className={`w-4 h-4 ${viewMode === 'grid' ? 'text-gray-900' : 'text-gray-500'}`} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
            >
              <List className={`w-4 h-4 ${viewMode === 'list' ? 'text-gray-900' : 'text-gray-500'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Reports Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report, index) => (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all cursor-pointer"
              onClick={() => setSelectedReport(report.id)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  src={report.thumbnail}
                  alt={report.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedReport(report.id);
                    }}
                    className="p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-all"
                  >
                    <Eye className="w-5 h-5 text-gray-900" />
                  </button>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-all"
                  >
                    <Download className="w-5 h-5 text-gray-900" />
                  </button>
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="p-3 bg-white/90 backdrop-blur-sm rounded-xl hover:bg-white transition-all"
                  >
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </button>
                </div>

                {/* Badges */}
                <div className="absolute top-3 right-3 flex gap-2">
                  {report.hasLR && (
                    <div className="px-2 py-1 bg-cyan-500 text-white rounded-md shadow-lg">
                      <p style={{ fontSize: '10px', fontWeight: 600 }}>LR</p>
                    </div>
                  )}
                  {report.hasPS && (
                    <div className="px-2 py-1 bg-indigo-500 text-white rounded-md shadow-lg">
                      <p style={{ fontSize: '10px', fontWeight: 600 }}>PS</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h4 className="text-gray-900 mb-2 truncate" style={{ fontSize: '15px', fontWeight: 600 }}>
                  {report.name}
                </h4>
                
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {report.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md"
                      style={{ fontSize: '11px', fontWeight: 500 }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-gray-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span style={{ fontSize: '12px', fontWeight: 400 }}>
                      {report.date.split(' ')[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span style={{ fontSize: '12px', fontWeight: 400 }}>
                      {report.views}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredReports.map((report, index) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                onClick={() => setSelectedReport(report.id)}
              >
                <div className="flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img
                      src={report.thumbnail}
                      alt={report.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-900 mb-1 truncate" style={{ fontSize: '15px', fontWeight: 600 }}>
                      {report.name}
                    </h4>
                    <div className="flex items-center gap-3 mb-2">
                      {report.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md"
                          style={{ fontSize: '11px', fontWeight: 500 }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span style={{ fontSize: '12px', fontWeight: 400 }}>
                          {report.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        <span style={{ fontSize: '12px', fontWeight: 400 }}>
                          {report.views} 次查看
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2">
                    {report.hasLR && (
                      <div className="px-3 py-1.5 bg-cyan-50 text-cyan-600 rounded-lg border border-cyan-200">
                        <p style={{ fontSize: '11px', fontWeight: 600 }}>Lightroom</p>
                      </div>
                    )}
                    {report.hasPS && (
                      <div className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200">
                        <p style={{ fontSize: '11px', fontWeight: 600 }}>Photoshop</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReport(report.id);
                      }}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-gray-900 mb-2" style={{ fontSize: '18px', fontWeight: 600 }}>
            暂无报告
          </h3>
          <p className="text-gray-500" style={{ fontSize: '14px', fontWeight: 400 }}>
            {searchQuery ? '没有找到匹配的报告' : '开始分析照片以创建报告'}
          </p>
        </div>
      )}

      {/* Saved Report Modal */}
      <SavedReportModal
        reportId={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}
