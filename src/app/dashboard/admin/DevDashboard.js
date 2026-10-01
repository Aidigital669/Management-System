'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Code2, Plus, X, Edit2, Trash2, Search,
  LayoutGrid, List, Clock, AlertCircle, CheckCircle2,
  Circle, Loader2, Activity, RefreshCw, MoreVertical,
  ArrowRight, Cpu, Award, Terminal, GitBranch, Layers,
  ChevronDown, Upload
} from 'lucide-react';

// ─── Config ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  TODO: {
    label: 'Backlog', icon: Circle,
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    header: 'from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/20',
  },
  IN_PROGRESS: {
    label: 'In Progress', icon: Activity,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    dot: 'bg-blue-500',
    header: 'from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/20',
  },
  REVIEW: {
    label: 'In Review', icon: GitBranch,
    bg: 'bg-violet-50 dark:bg-violet-950/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800/60',
    dot: 'bg-violet-500',
    header: 'from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/20',
  },
  DONE: {
    label: 'Completed', icon: CheckCircle2,
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    dot: 'bg-emerald-500',
    header: 'from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20',
  },
  OVERDUE: {
    label: 'Overdue', icon: AlertCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800/60',
    dot: 'bg-red-500',
    header: 'from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/20',
  },
};

const PRIORITY_CONFIG = {
  Urgent: { badge: 'bg-red-500 text-white',   stripe: 'bg-red-500',    icon: '🔴' },
  High:   { badge: 'bg-orange-400 text-white', stripe: 'bg-orange-400', icon: '🟠' },
  Normal: { badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', stripe: 'bg-blue-400', icon: '🔵' },
  Low:    { badge: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400', stripe: 'bg-slate-300 dark:bg-slate-600', icon: '⚪' },
};

const TAG_OPTIONS = ['Frontend','Backend','API','UI/UX','Bug Fix','Feature','DevOps','Database','Mobile','Testing','Security','Performance'];

const TAG_COLORS = [
  'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
  'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  'bg-lime-100 text-lime-700 dark:bg-lime-950/40 dark:text-lime-300',
  'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
  'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tagColor(tag) {
  const idx = TAG_OPTIONS.indexOf(tag);
  return TAG_COLORS[idx >= 0 ? idx : (tag.charCodeAt(0) % TAG_COLORS.length)];
}

function parseTags(description) {
  if (!description) return [];
  try {
    const match = description.match(/\[TAGS:(.*?)\]/);
    if (match) return match[1].split(',').map(t => t.trim()).filter(Boolean);
  } catch {}
  return [];
}

function injectTags(description, tags) {
  const base = (description || '').replace(/\s*\[TAGS:.*?\]/g, '').trim();
  if (!tags || tags.length === 0) return base;
  return base + ` [TAGS:${tags.join(',')}]`;
}

function cleanDesc(description) {
  if (!description) return '';
  return description.replace(/\s*\[TAGS:.*?\]/g, '').trim();
}

function getDevEmoji(name) {
  if (!name) return '👤';
  const pool = ['🧑‍💻','👨‍💻','👩‍💻','🧑‍🔧','👨‍🔧','👩‍🔧'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return pool[Math.abs(h) % pool.length];
}

function getDueMeta(dueDate) {
  if (!dueDate) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const due = new Date(dueDate); due.setHours(0,0,0,0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, cls: 'text-red-600 dark:text-red-400 font-bold' };
  if (days === 0) return { label: 'Due today',    cls: 'text-orange-600 dark:text-orange-400 font-bold' };
  if (days === 1) return { label: 'Due tomorrow', cls: 'text-amber-600 dark:text-amber-400 font-bold' };
  return { label: `Due in ${days}d`, cls: 'text-slate-400 dark:text-slate-500' };
}

// ─── MetricCard ──────────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, colorClass, glowClass }) {
  return (
    <div className={`relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 xl:p-5 shadow-sm overflow-hidden group hover:-translate-y-0.5 transition-all duration-200`}>
      <div className={`absolute -right-5 -top-5 w-24 h-24 rounded-full blur-2xl opacity-50 pointer-events-none group-hover:scale-150 transition-transform duration-500 ${glowClass}`} />
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
          <p className={`text-2xl xl:text-3xl font-black ${colorClass}`}>{value}</p>
        </div>
        <div className={`w-9 h-9 xl:w-11 xl:h-11 rounded-xl flex items-center justify-center shadow-sm border border-white dark:border-slate-700 ${glowClass} bg-opacity-20`}>
          <Icon className={`w-4 h-4 xl:w-5 xl:h-5 ${colorClass}`} />
        </div>
      </div>
    </div>
  );
}

// ─── DevCard ─────────────────────────────────────────────────────────────────

function DevCard({ dev, tasks }) {
  const mine = tasks.filter(t => t.assignedToId === dev.id);
  const done = mine.filter(t => ['DONE','Completed','Completion'].includes(t.status)).length;
  const active = mine.filter(t => t.status === 'IN_PROGRESS' || t.status === 'REVIEW').length;
  const overdue = mine.filter(t => t.status === 'OVERDUE').length;
  const total = mine.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-base shadow-sm shrink-0">
          {dev.avatar || getDevEmoji(dev.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs text-slate-900 dark:text-white truncate">{dev.name}</p>
          <p className="text-[9px] text-violet-500 dark:text-violet-400 font-semibold truncate">{dev.designation || 'Developer'}</p>
        </div>
        {overdue > 0 && (
          <span className="shrink-0 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded-full animate-pulse">{overdue}!</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {[
          { v: total,  l: 'Total',  cls: 'text-slate-700 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-800/60' },
          { v: active, l: 'Active', cls: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/30' },
          { v: done,   l: 'Done',   cls: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
        ].map(({ v, l, cls, bg }) => (
          <div key={l} className={`text-center py-1.5 rounded-lg ${bg}`}>
            <p className={`text-sm font-black ${cls}`}>{v}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase">{l}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-1">
          <span>Progress</span><span>{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 30 ? 'bg-amber-500' : 'bg-red-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── TaskCard ────────────────────────────────────────────────────────────────

const NEXT = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'REVIEW', REVIEW: 'DONE', DONE: 'TODO', OVERDUE: 'IN_PROGRESS' };

function TaskCard({ task, onEdit, onDelete, onMove }) {
  const [menu, setMenu] = useState(false);
  const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO;
  const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Normal;
  const tags = parseTags(task.description);
  const desc = cleanDesc(task.description);
  const due = getDueMeta(task.dueDate);
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
  const subDone = subtasks.filter(s => s.status === 'DONE').length;
  const subPct = subtasks.length > 0 ? Math.round((subDone / subtasks.length) * 100) : 0;

  return (
    <div className={`group relative bg-white dark:bg-slate-900 rounded-xl border ${sc.border} shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 p-3.5`}>
      {/* Priority stripe */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${pc.stripe}`} />

      <div className="pl-3">
        {/* Title row */}
        <div className="flex items-start gap-2 mb-2">
          <p className="flex-1 text-xs font-bold text-slate-900 dark:text-white leading-snug">{task.title}</p>
          <div className="relative shrink-0">
            <button onClick={() => setMenu(p => !p)} className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition cursor-pointer">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
            {menu && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-6 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[110px]">
                  <button onClick={() => { onEdit(task); setMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 cursor-pointer">
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => { onDelete(task.id); setMenu(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 cursor-pointer">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {desc && <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">{desc}</p>}
        {task.module && <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold mb-1">Module: {task.module}</p>}
        {task.dependency && <p className="text-[10px] text-orange-500 dark:text-orange-400 font-semibold mb-1">Dep: {task.dependency}</p>}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {tags.slice(0, 4).map(t => (
              <span key={t} className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${tagColor(t)}`}>{t}</span>
            ))}
          </div>
        )}

        {/* Subtask bar */}
        {subtasks.length > 0 && (
          <div className="mb-2">
            <div className="flex justify-between text-[8px] font-bold text-slate-400 mb-0.5">
              <span>{subDone}/{subtasks.length} subtasks</span><span>{subPct}%</span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${subPct}%` }} />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs">{task.assignedTo?.avatar || getDevEmoji(task.assignedTo?.name)}</span>
            <span className="text-[9px] font-bold text-slate-500 truncate max-w-[70px]">{task.assignedTo?.name || '—'}</span>
            <span className={`px-1.5 py-0.5 rounded text-[7px] font-extrabold uppercase ${pc.badge}`}>{task.priority || 'Normal'}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {due && <span className={`text-[8px] ${due.cls}`}>{due.label}</span>}
            {task.status !== 'DONE' && (
              <button
                onClick={() => onMove(task.id, NEXT[task.status] || 'IN_PROGRESS')}
                title={`Move to ${STATUS_CONFIG[NEXT[task.status]]?.label || 'next'}`}
                className="p-1 rounded-md bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-400 hover:text-indigo-600 transition cursor-pointer"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KanbanColumn ────────────────────────────────────────────────────────────

function KanbanColumn({ status, tasks, onEdit, onDelete, onMove, onAdd }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col min-w-[270px] max-w-[300px] flex-1">
      <div className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl mb-2 bg-gradient-to-b ${cfg.header} border ${cfg.border}`}>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${cfg.dot} ${status === 'IN_PROGRESS' || status === 'OVERDUE' ? 'animate-pulse' : ''}`} />
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${cfg.bg} ${cfg.text} border ${cfg.border}`}>{tasks.length}</span>
        </div>
        {status === 'TODO' && (
          <button onClick={onAdd} className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-400 hover:text-indigo-600 transition cursor-pointer" title="Add task">
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div
        className="flex flex-col gap-2.5 flex-1 overflow-y-auto pb-3 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700"
        style={{ maxHeight: 'calc(100vh - 360px)', minHeight: '180px' }}
      >
        {tasks.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-8 rounded-xl border-2 border-dashed ${cfg.border} opacity-50`}>
            <Icon className={`w-5 h-5 mb-1 ${cfg.text}`} />
            <p className="text-[9px] font-bold text-slate-400">Empty</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── TaskFormModal ────────────────────────────────────────────────────────────

function TaskFormModal({ isOpen, onClose, onSubmit, devs, editTask, loading }) {
  const [title, setTitle]   = useState('');
  const [desc, setDesc]     = useState('');
  const [dev, setDev]       = useState('');
  const [priority, setPri]  = useState('Normal');
  const [due, setDue]       = useState('');
  const [tags, setTags]     = useState([]);
  const [module, setModule] = useState('');
  const [dependency, setDependency] = useState('');
  const [expectedOutput, setExpectedOutput] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editTask) {
      setTitle(editTask.title || '');
      setDesc(cleanDesc(editTask.description) || '');
      setDev(String(editTask.assignedToId || ''));
      setPri(editTask.priority || 'Normal');
      setDue(editTask.dueDate || '');
      setTags(parseTags(editTask.description));
      setModule(editTask.module || '');
      setDependency(editTask.dependency || '');
      setExpectedOutput(editTask.expectedOutput || '');
    } else {
      setTitle(''); setDesc(''); setDev(''); setPri('Normal'); setDue(''); setTags([]); setModule(''); setDependency(''); setExpectedOutput('');
    }
  }, [isOpen, editTask]);

  if (!isOpen) return null;

  const toggle = tag => setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  const submit = e => {
    e.preventDefault();
    if (!title.trim() || !dev) return;
    onSubmit({ 
      title: title.trim(), 
      description: injectTags(desc, tags), 
      assignedToId: parseInt(dev), 
      priority, 
      dueDate: due || undefined, 
      department: 'Software Development',
      module,
      dependency,
      expectedOutput
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 dark:text-white">{editTask ? 'Edit Dev Task' : 'Assign Dev Task'}</h3>
              <p className="text-[9px] text-slate-400 font-semibold">Software Development Dept.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form id="dev-task-form" onSubmit={submit} className="flex-1 overflow-y-auto p-5 space-y-4">

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Task Title <span className="text-red-500">*</span></label>
            <input
              value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="e.g. Build REST API for user management"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="Describe the task requirements and acceptance criteria..."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Assign To <span className="text-red-500">*</span></label>
              <select
                value={dev} onChange={e => setDev(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
              >
                <option value="">Select developer…</option>
                {devs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Priority</label>
              <select
                value={priority} onChange={e => setPri(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
              >
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {k}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Module</label>
            <input
              value={module} onChange={e => setModule(e.target.value)}
              placeholder="e.g. Authentication, Dashboard"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Due Date (Day)</label>
              <input
                type="date" value={due} onChange={e => setDue(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Dependency</label>
              <input
                value={dependency} onChange={e => setDependency(e.target.value)}
                placeholder="e.g. API Gateway"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1.5">Expected Output</label>
            <textarea
              value={expectedOutput} onChange={e => setExpectedOutput(e.target.value)} rows={2}
              placeholder="What is the expected result of this task?"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-2">Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {TAG_OPTIONS.map(tag => (
                <button
                  key={tag} type="button" onClick={() => toggle(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition cursor-pointer ${
                    tags.includes(tag)
                      ? `${tagColor(tag)} border-current ring-2 ring-indigo-400 ring-offset-1`
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
            Cancel
          </button>
          <button
            form="dev-task-form" type="submit" disabled={loading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-60 text-white text-sm font-black shadow-md shadow-indigo-500/25 transition flex items-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Code2 className="w-4 h-4" />}
            {editTask ? 'Update Task' : 'Assign Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DevDashboard({ usersList = [], tasksList = [], refreshData }) {
  const [view, setView]           = useState('kanban');
  const [search, setSearch]       = useState('');
  const [devFilter, setDevFilter] = useState('ALL');
  const [priFilter, setPriFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask]   = useState(null);
  const [formLoading, setFL]      = useState(false);
  const [toast, setToast]         = useState(null);
  const [delId, setDelId]         = useState(null);
  const fileInputRef              = useRef(null);
  const [uploadingExcel, setUploadingExcel] = useState(false);
  const [showDelAllModal, setShowDelAllModal] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // All tasks for Software Development dept
  const devTasks = useMemo(() => tasksList.filter(t => {
    const dept = (t.department || t.assignedTo?.department || '').toLowerCase();
    return dept.includes('software') || dept.includes('dev') || dept.includes('web') || dept.includes('tech');
  }), [tasksList]);

  // Developers list
  const devs = useMemo(() => usersList.filter(u => {
    const dept = (u.department || '').toLowerCase();
    return dept.includes('software') || dept.includes('dev') || dept.includes('web') || dept.includes('tech');
  }), [usersList]);

  // Filtered tasks
  const filtered = useMemo(() => devTasks.filter(t => {
    if (devFilter !== 'ALL' && String(t.assignedToId) !== String(devFilter)) return false;
    if (priFilter !== 'ALL' && t.priority !== priFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const allText = [t.title, cleanDesc(t.description), t.assignedTo?.name, parseTags(t.description).join(' ')].join(' ').toLowerCase();
      if (!allText.includes(q)) return false;
    }
    return true;
  }), [devTasks, devFilter, priFilter, search]);

  // Kanban groups
  const kanban = useMemo(() => ({
    TODO:        filtered.filter(t => t.status === 'TODO'),
    IN_PROGRESS: filtered.filter(t => t.status === 'IN_PROGRESS'),
    REVIEW:      filtered.filter(t => t.status === 'REVIEW'),
    DONE:        filtered.filter(t => ['DONE','Completed','Completion'].includes(t.status)),
    OVERDUE:     filtered.filter(t => t.status === 'OVERDUE'),
  }), [filtered]);

  // Metrics
  const M = useMemo(() => ({
    total:  devTasks.length,
    active: devTasks.filter(t => t.status === 'IN_PROGRESS').length,
    review: devTasks.filter(t => t.status === 'REVIEW').length,
    done:   devTasks.filter(t => ['DONE','Completed','Completion'].includes(t.status)).length,
    over:   devTasks.filter(t => t.status === 'OVERDUE').length,
    devs:   devs.length,
  }), [devTasks, devs]);

  // ─ API calls ─

  async function handleSubmit(data) {
    setFL(true);
    try {
      const url    = editTask ? `/api/tasks/${editTask.id}` : '/api/tasks';
      const method = editTask ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json   = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      showToast(editTask ? '✅ Task updated!' : '🚀 Task assigned!');
      setShowModal(false);
      setEditTask(null);
      if (refreshData) await refreshData();
    } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
    finally { setFL(false); }
  }

  async function handleMove(id, status) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error('Failed');
      if (refreshData) await refreshData();
    } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
  }

  async function handleDel(id) {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
      showToast('🗑️ Task deleted');
      setDelId(null);
      if (refreshData) await refreshData();
    } catch (err) { showToast(`❌ ${err.message}`, 'error'); }
  }

  async function handleDelAll() {
    if (devTasks.length === 0) return;
    setDeletingAll(true);
    try {
      const taskIds = devTasks.map(t => t.id);
      const res = await fetch('/api/tasks/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to delete tasks');
      showToast(`🗑️ ${result.count} tasks deleted successfully!`);
      setShowDelAllModal(false);
      if (refreshData) await refreshData();
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
    } finally {
      setDeletingAll(false);
    }
  }

  async function handleExcelUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingExcel(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });

      const tasksToCreate = [];

      for (const row of json) {
        const title = row['Task Title'] || row['Title'] || row['Task'];
        if (!title) continue;

        const desc = row['Description'] || '';
        const priority = row['Priority'] || 'Normal';
        let dueDate = row['Due Date'] || '';
        
        // Ensure due date is valid format if it exists, or just pass as string
        if (dueDate && typeof dueDate === 'string') {
          // If the date is something like 2026-10-01, it's fine.
          dueDate = dueDate.trim();
        }

        const devName = row['Assignee'] || row['Developer'] || row['Assigned To'];
        let assignedToId = null;
        if (devName) {
           const dev = devs.find(d => d.name.toLowerCase() === String(devName).trim().toLowerCase());
           if (dev) assignedToId = dev.id;
        }

        const moduleVal = row['Module'] || '';
        const dependency = row['Dependency'] || '';
        const expectedOutput = row['Expected Output'] || '';

        if (assignedToId) {
          tasksToCreate.push({
            title: String(title).trim(),
            description: String(desc),
            assignedToId,
            priority: String(priority),
            dueDate: dueDate ? String(dueDate) : undefined,
            department: 'Software Development',
            module: String(moduleVal),
            dependency: String(dependency),
            expectedOutput: String(expectedOutput)
          });
        }
      }

      if (tasksToCreate.length === 0) {
        showToast('❌ No valid tasks found in Excel. Make sure columns like "Title" and "Assignee" exist.', 'error');
        return;
      }

      const res = await fetch('/api/tasks/bulk', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ tasks: tasksToCreate }) 
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to upload tasks');

      showToast(`✅ Excel imported: ${result.count} tasks created!`);
      if (refreshData) await refreshData();
    } catch (err) {
      showToast(`❌ Error parsing Excel: ${err.message}`, 'error');
    } finally {
      setUploadingExcel(false);
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">Dev Task Board</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Software Development · {M.devs} developer{M.devs !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { if (refreshData) refreshData(); }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* View toggle */}
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {[['kanban', LayoutGrid, 'Kanban'], ['list', List, 'List']].map(([v, Icon, lbl]) => (
              <button
                key={v} onClick={() => setView(v)}
                className={`px-3 py-2 text-[10px] font-bold flex items-center gap-1.5 transition cursor-pointer ${view === v ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {lbl}
              </button>
            ))}
          </div>

          <input 
            type="file" 
            accept=".xlsx, .xls, .csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleExcelUpload} 
          />
          <button
            onClick={() => setShowDelAllModal(true)}
            disabled={devTasks.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-700 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 text-xs font-black shadow-sm transition cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Trash2 className="w-4 h-4" /> Delete All
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black shadow-sm transition cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            {uploadingExcel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Excel
          </button>

          <button
            onClick={() => { setEditTask(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black shadow-md shadow-indigo-500/25 transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Assign Task
          </button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard icon={Layers}       label="Total Tasks" value={M.total}  colorClass="text-indigo-600 dark:text-indigo-400" glowClass="bg-indigo-100 dark:bg-indigo-900/20" />
        <MetricCard icon={Activity}     label="In Progress" value={M.active} colorClass="text-blue-600 dark:text-blue-400"    glowClass="bg-blue-100 dark:bg-blue-900/20" />
        <MetricCard icon={GitBranch}    label="In Review"   value={M.review} colorClass="text-violet-600 dark:text-violet-400" glowClass="bg-violet-100 dark:bg-violet-900/20" />
        <MetricCard icon={CheckCircle2} label="Completed"   value={M.done}   colorClass="text-emerald-600 dark:text-emerald-400" glowClass="bg-emerald-100 dark:bg-emerald-900/20" />
        <MetricCard icon={AlertCircle}  label="Overdue"     value={M.over}   colorClass="text-red-600 dark:text-red-400"    glowClass="bg-red-100 dark:bg-red-900/20" />
        <MetricCard icon={Cpu}          label="Developers"  value={M.devs}   colorClass="text-amber-600 dark:text-amber-400" glowClass="bg-amber-100 dark:bg-amber-900/20" />
      </div>

      {/* ── Developer Overview ── */}
      {devs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-violet-500" />
            <h2 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Developer Workload</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {devs.map(d => <DevCard key={d.id} dev={d} tasks={devTasks} />)}
          </div>
        </div>
      )}

      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks, devs, tags…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <select
          value={devFilter} onChange={e => setDevFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
        >
          <option value="ALL">All Developers</option>
          {devs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <select
          value={priFilter} onChange={e => setPriFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
        >
          <option value="ALL">All Priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {k}</option>)}
        </select>

        {(search || devFilter !== 'ALL' || priFilter !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setDevFilter('ALL'); setPriFilter('ALL'); }}
            className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/20 text-xs font-bold text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40 transition cursor-pointer flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        <span className="ml-auto text-[10px] text-slate-400 font-semibold">
          {filtered.length} task{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Kanban Board ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-3" style={{ minHeight: '350px' }}>
          {Object.entries(kanban).map(([status, tasks]) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks}
              onEdit={t => { setEditTask(t); setShowModal(true); }}
              onDelete={id => setDelId(id)}
              onMove={handleMove}
              onAdd={() => { setEditTask(null); setShowModal(true); }}
            />
          ))}
        </div>
      )}

      {/* ── List View ── */}
      {view === 'list' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Title</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Assignee</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Day</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Task ID</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Module</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Task to Assign</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Priority</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Dependency</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Expected Output</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Status</th>
                  <th className="px-4 py-3 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="11">
                      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Terminal className="w-10 h-10 mb-3 opacity-25" />
                        <p className="font-bold text-sm">No dev tasks found</p>
                        <p className="text-xs mt-1 opacity-60">Try adjusting filters or assign a new task</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  [...filtered].reverse().map((task, i) => {
                    const sc = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO;
                    const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.Normal;
                    const due = getDueMeta(task.dueDate);
                    const desc = cleanDesc(task.description);
                    
                    return (
                      <tr key={task.id} className={`border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition group ${i % 2 === 0 ? '' : 'bg-slate-50/20 dark:bg-slate-800/10'}`}>
                        <td className="px-4 py-3 align-top">
                          <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2" title={task.title}>{task.title}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{task.assignedTo?.avatar || getDevEmoji(task.assignedTo?.name)}</span>
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 truncate">{task.assignedTo?.name || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {due ? <span className={`text-[9px] font-bold ${due.cls}`}>{task.dueDate}</span> : <span className="text-[9px] text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">#{task.id}</span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold line-clamp-2">{task.module || '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-top max-w-[200px]">
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2" title={desc}>{desc || '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`px-2 py-1 rounded-lg text-[8px] font-extrabold uppercase ${pc.badge}`}>{task.priority || 'Normal'}</span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-[10px] text-orange-500 dark:text-orange-400 font-semibold line-clamp-2">{task.dependency || '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-top max-w-[200px]">
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2" title={task.expectedOutput}>{task.expectedOutput || '—'}</p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-extrabold uppercase ${sc.bg} ${sc.text} border ${sc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => { setEditTask(task); setShowModal(true); }} className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-400 hover:text-indigo-600 transition cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => setDelId(task.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 transition cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Task Form Modal ── */}
      <TaskFormModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditTask(null); }}
        onSubmit={handleSubmit}
        devs={devs}
        editTask={editTask}
        loading={formLoading}
      />

      {/* ── Delete Confirm ── */}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDelId(null)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Delete Task?</h3>
                <p className="text-[10px] text-slate-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">The task and all its data will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer">Cancel</button>
              <button onClick={() => handleDel(delId)} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black shadow-md shadow-red-500/20 transition cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete All Confirm ── */}
      {showDelAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deletingAll && setShowDelAllModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900/60 shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900 dark:text-white">Delete All Tasks?</h3>
                <p className="text-[10px] text-slate-400">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">You are about to delete <strong>{devTasks.length}</strong> tasks in the Software Development department.</p>
            <div className="flex gap-3">
              <button disabled={deletingAll} onClick={() => setShowDelAllModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50">Cancel</button>
              <button disabled={deletingAll} onClick={handleDelAll} className="flex-1 py-2.5 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-black shadow-md shadow-red-500/20 transition cursor-pointer disabled:opacity-50">
                {deletingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-xl shadow-2xl border text-sm font-bold transition-all ${
          toast.type === 'error'
            ? 'bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800'
            : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
