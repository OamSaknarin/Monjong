import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { RelatedLink } from '../types';
import { Bookmark, Search, Plus, Trash2, Edit3, X, ExternalLink, Globe, Link2, Download, Printer } from 'lucide-react';
import RelatedWebsitesPdfModal from './RelatedWebsitesPdfModal';
import { exportToExcel } from '../utils/export';
import { motion } from 'motion/react';

interface RelatedWebsitesProps {
  links: RelatedLink[];
  onSaveLinks: (updated: RelatedLink[]) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, type: 'save' | 'edit' | 'delete' | 'default') => Promise<boolean>;
}

export default function RelatedWebsites({ links, onSaveLinks, showToast, showConfirm }: RelatedWebsitesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Form Inputs
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [url, setUrl] = useState('');

  const handleExport = () => {
    const data = links.map(l => ({
      'ชื่อเว็บไซต์': l.name,
      'รายละเอียด': l.details,
      'ลิงก์': l.url
    }));
    exportToExcel(data, 'เว็บไซต์เกี่ยวข้อง', 'รายการทั้งหมด');
    showToast('ส่งออกไฟล์ Excel เรียบร้อย', 'success');
  };

  const handleOpenAddLink = () => {
    setEditingLinkId(null);
    setName('');
    setDetails('');
    setUrl('');
    setIsModalOpen(true);
  };

  const handleOpenEditLink = (link: RelatedLink) => {
    setEditingLinkId(link.id);
    setName(link.name);
    setDetails(link.details);
    setUrl(link.url);
    setIsModalOpen(true);
  };

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) {
      showToast('กรุณากรอกชื่อเว็บไซต์และลิงก์ URL ให้ครบถ้วน', 'error');
      return;
    }

    // จัดรูปแบบ URL ให้ปลอดภัย
    let formattedUrl = url.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    const updatedLink: RelatedLink = {
      id: editingLinkId || 'link-' + Date.now(),
      name: name.trim(),
      details: details.trim(),
      url: formattedUrl
    };

    if (editingLinkId) {
      const confirmed = await showConfirm(
        'ยืนยันการแก้ไขข้อมูลเว็บไซต์',
        `คุณต้องการบันทึกการแก้ไขข้อมูลเว็บไซต์ "${name.trim()}" ใช่หรือไม่?`,
        'edit'
      );
      if (!confirmed) return;

      const updated = links.map(l => l.id === editingLinkId ? updatedLink : l);
      onSaveLinks(updated);
      showToast('แก้ไขข้อมูลเว็บไซต์เชื่อมโยงเรียบร้อย', 'success');
    } else {
      const confirmed = await showConfirm(
        'ยืนยันการเพิ่มเว็บไซต์ใหม่',
        `คุณต้องการเพิ่มเว็บไซต์ "${name.trim()}" เข้าระบบแผงหน้าปัดใช่หรือไม่?`,
        'save'
      );
      if (!confirmed) return;

      onSaveLinks([...links, updatedLink]);
      showToast('เพิ่มลิงก์เว็บไซต์เชื่อมโยงใหม่เรียบร้อย', 'success');
    }
    setIsModalOpen(false);
  };

  const handleDeleteLink = async (id: string) => {
    const linkToDelete = links.find(l => l.id === id);
    const label = linkToDelete ? linkToDelete.name : 'เว็บไซต์นี้';

    const confirmed = await showConfirm(
      'ยืนยันการลบข้อมูลเว็บไซต์',
      `คุณต้องการลบข้อมูลเว็บไซต์ "${label}" ออกจากระบบแผงหน้าปัดใช่หรือไม่?`,
      'delete'
    );
    if (confirmed) {
      const filtered = links.filter(l => l.id !== id);
      onSaveLinks(filtered);
      showToast('ลบลิงก์เชื่อมโยงสำเร็จ', 'success');
    }
  };

  const filteredLinks = useMemo(() => {
    return links.filter(link => {
      return link.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             link.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
             link.url.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [links, searchQuery]);

  return (
    <div className="bg-white rounded-3xl border-2 border-pink-200 p-6 sm:p-8 shadow-xl relative overflow-hidden flex-grow flex flex-col" id="related-websites-panel">
      {/* Top Gradient Glow Accent Bar */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-pink-500 to-rose-600" />
      
      {isModalOpen ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6 animate-in fade-in duration-200 z-10 relative">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-50 text-pink-600 rounded-2xl border border-pink-100">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingLinkId ? 'แก้ไขข้อมูลเว็บไซต์' : 'เพิ่มเว็บไซต์สารสนเทศใหม่'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">กรอกข้อมูลระบบงานสารสนเทศเพื่อใช้งานในองค์กร</p>
              </div>
            </div>
            
          </div>

          <form onSubmit={handleLinkSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ชื่อเรียกระบบ / ชื่อเว็บไซต์ *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=""
                  className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">สรุปรายละเอียดและคำจำกัดความย่อ</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder=""
                  rows={3}
                  className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-sans transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 font-heading font-semibold">ที่อยู่เว็บไซต์ URL *</label>
                <input
                  type="text"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder=""
                  className="w-full p-2.5 bg-white/60 focus:bg-white/90 backdrop-blur-xs border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 font-mono transition-all"
                />
              </div>

              
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 font-semibold text-gray-600 transition-colors cursor-pointer text-sm"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleLinkSubmit}
                className="px-6 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 flex items-center justify-center gap-2 font-bold shadow-md shadow-pink-500/20 transition-all cursor-pointer text-sm"
              >
                {editingLinkId ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
{/* Background visual graphics */}
      <div className="absolute -top-10 -right-10 w-80 h-80 bg-gradient-to-br from-pink-500/10 to-rose-500/5 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-gradient-to-tr from-rose-500/10 to-pink-400/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-pink-100 pb-6 mb-6 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="p-4 bg-gradient-to-tr from-pink-500 to-rose-600 text-white rounded-2xl shadow-lg shadow-pink-500/30">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-heading text-xl sm:text-2xl font-black text-pink-950 tracking-tight">เว็บไซต์และระบบภายในที่เกี่ยวข้อง</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 font-medium">รวบรวมพอร์ทัลสัญจรของหน่วยงาน ระบบบริหารกลาง สารบรรณจังหวัด และเครื่องมืออำนวยความสะดวกภายนอก</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-pink-300 bg-pink-50/80 hover:bg-pink-100/90 text-pink-900 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
            title="พิมพ์หรือส่งออกรายงาน PDF เว็บไซต์เกี่ยวข้อง"
          >
            <Printer className="w-4 h-4 text-pink-600" />
            <span>พิมพ์ / รายงาน PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 border-pink-200 text-pink-800 hover:text-white hover:bg-pink-500 hover:border-pink-500 text-xs sm:text-sm font-heading font-extrabold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>excel</span>
          </button>
        </div>
      </div>

      {/* Search & Add bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-orange-50/20 p-4 rounded-xl border border-orange-100 justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหา"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-orange-500 transition"
          />
        </div>

        <button
          onClick={handleOpenAddLink}
          className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-heading text-xs font-semibold flex items-center gap-1.5 transition shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มหมุดเว็บไซต์</span>
        </button>
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredLinks.length === 0 ? (
          <div className="col-span-full p-12 text-center text-gray-400">
            ไม่พบระบบเว็บไซต์เกี่ยวข้องที่ตรงกับเงื่อนไขการกรอง
          </div>
        ) : (
          filteredLinks.map(link => (
            <div 
              key={link.id} 
              className="bg-orange-50/10 hover:bg-orange-50/30 rounded-xl border border-orange-100 p-5 flex flex-col justify-between hover:shadow-md transition-all group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2.5 bg-orange-100/50 rounded-lg text-orange-600">
                    <Bookmark className="w-4.5 h-4.5" />
                  </div>
                  
                  {/* Actions */}
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleOpenEditLink(link)}
                      className="p-1 rounded text-gray-400 hover:text-orange-600 hover:bg-white transition border border-transparent hover:border-orange-100"
                      title="แก้ไขลิ้งก์"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-white transition border border-transparent hover:border-orange-100"
                      title="ลบ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-heading font-bold text-orange-950 text-sm mb-1 line-clamp-1">{link.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-sans mb-3 line-clamp-2 h-9">{link.details}</p>
                
                <div className="text-[10px] text-gray-400 font-mono truncate bg-gray-50 p-1.5 rounded border border-gray-100/60 mb-4 flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 shrink-0 text-orange-400" />
                  <span>{link.url}</span>
                </div>
              </div>

              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 bg-white border border-orange-200 text-orange-800 hover:bg-orange-50 font-heading font-semibold text-xs rounded-lg flex items-center justify-center space-x-1.5 transition active:scale-95"
              >
                <span>เข้าสู่เว็บไซต์โดยตรง</span>
                <ExternalLink className="w-3.5 h-3.5 text-orange-500" />
              </a>
            </div>
          ))
        )}
      </div>

      {/* --- ADD/EDIT PORTAL MODAL --- */}
      

        </>
      )}

      {/* Related Websites PDF Report Modal */}
      {isPdfModalOpen && (
        <RelatedWebsitesPdfModal
          links={links.filter(l => l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.details.toLowerCase().includes(searchQuery.toLowerCase()) || l.url.toLowerCase().includes(searchQuery.toLowerCase()))}
          allLinks={links}
          onClose={() => setIsPdfModalOpen(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
