import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { API_URL as API } from '../../config';

// ─── Status config ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    'Active':    { color: '#4f46e5', bg: 'rgba(79,70,229,0.1)',  label: 'Active' },
    'On Hold':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'On Hold' },
    'Completed': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Done' },
};

const TASK_STATUS = {
    'Todo':        { color: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
    'In Progress': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'Completed':   { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
};

// ─── Avatar ──────────────────────────────────────────────────────────────────
const Avatar = ({ name, size = 36, color = '#4f46e5' }) => {
    const safeName = typeof name === 'string' ? name : '';
    const initials = safeName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%',
            background: `${color}22`, color, fontWeight: 700,
            fontSize: size * 0.38, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, border: `2px solid ${color}44`,
            fontFamily: 'Inter, sans-serif',
        }}>
            {initials || '?'}
        </div>
    );
};

// ─── Progress ring ────────────────────────────────────────────────────────────
const ProgressRing = ({ pct, size = 52, stroke = 5 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const filled = circ * (pct / 100);
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(79,70,229,0.12)" strokeWidth={stroke} />
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#4f46e5" strokeWidth={stroke}
                strokeDasharray={`${filled} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
                style={{ transform: 'rotate(90deg)', transformOrigin: 'center', fontSize: 12, fontWeight: 700, fill: '#4f46e5', fontFamily: 'Inter' }}>
                {pct}%
            </text>
        </svg>
    );
};

// ─── Badge ───────────────────────────────────────────────────────────────────
const StatusBadge = ({ status, config }) => {
    const cfg = config[status] || { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: status };
    return (
        <span style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: cfg.bg, color: cfg.color, letterSpacing: '0.02em',
        }}>
            {cfg.label || status}
        </span>
    );
};

// ─── Modal shell ─────────────────────────────────────────────────────────────
const Modal = ({ show, onClose, title, subtitle, children, width = 620 }) => {
    useEffect(() => {
        const handler = e => { if (e.key === 'Escape') onClose(); };
        if (show) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [show, onClose]);

    if (!show) return null;
    return (
        <div onClick={onClose} style={{
            position: 'fixed', inset: 0, zIndex: 3000,
            background: 'rgba(15,23,42,0.55)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'fadeIn 0.2s ease',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--card-bg, #fff)',
                borderRadius: 20, width: '92vw', maxWidth: width,
                maxHeight: '88vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 32px 64px rgba(0,0,0,0.22)',
                animation: 'slideUp 0.25s cubic-bezier(.22,1,.36,1)',
            }}>
                {/* Header */}
                <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid var(--border-color, rgba(0,0,0,0.07))', flexShrink: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>{title}</h2>
                            {subtitle && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>{subtitle}</p>}
                        </div>
                        <button onClick={onClose} style={{
                            border: 'none', background: 'var(--surface-soft, rgba(0,0,0,0.07))', borderRadius: 10,
                            width: 36, height: 36, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            fontSize: 18, color: 'var(--text-muted, #6b7280)',
                            transition: 'background 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'var(--border-color, rgba(0,0,0,0.13))'}
                        onMouseOut={e => e.currentTarget.style.background = 'var(--surface-soft, rgba(0,0,0,0.07))'}
                        >×</button>
                    </div>
                </div>
                {/* Body */}
                <div style={{ overflowY: 'auto', padding: '24px 28px 28px', flexGrow: 1 }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

// ─── Input ───────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
    <div style={{ marginBottom: 18 }}>
        <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted, #6b7280)', marginBottom: 7 }}>
            {label}
        </label>
        {children}
    </div>
);

const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    padding: '11px 14px', borderRadius: 10, border: '1.5px solid var(--border-color, rgba(0,0,0,0.1))',
    background: 'var(--input-bg, rgba(0,0,0,0.03))', color: 'var(--text-main)',
    fontSize: 14, outline: 'none', fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.15s, box-shadow 0.15s',
};

const Inp = (props) => (
    <input {...props}
        style={{ ...inputStyle, ...props.style }}
        onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-color, rgba(0,0,0,0.1))'; e.target.style.boxShadow = 'none'; }}
    />
);

const Txt = (props) => (
    <textarea {...props}
        style={{ ...inputStyle, resize: 'vertical', minHeight: 90, ...props.style }}
        onFocus={e => { e.target.style.borderColor = '#4f46e5'; e.target.style.boxShadow = '0 0 0 3px rgba(79,70,229,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--border-color, rgba(0,0,0,0.1))'; e.target.style.boxShadow = 'none'; }}
    />
);

// ─── Project Card ─────────────────────────────────────────────────────────────
const ProjectCard = ({ project, tasks = [], employees, onAddTask, onUpdateTaskStatus, onUpdateProjectStatus, onEditProject, onDeleteProject, user, canCreateProject }) => {
    const [expanded, setExpanded] = useState(false);
    const pct = tasks.length === 0 ? 0 : Math.round(tasks.filter(t => t.status === 'Completed').length / tasks.length * 100);
    const teamColors = ['#4f46e5', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

    const myId = String(user?.empId || user?.id);
    const isMember = project.teamMembers?.some(m => String(m.id) === myId);
    const memberObj = project.teamMembers?.find(m => String(m.id) === myId);
    const isProjectLead = memberObj?.role?.toLowerCase()?.includes('lead') || canCreateProject;

    const getEmpName = (id) => employees.find(e => e.id === parseInt(id))?.name || id;

    return (
        <div style={{
            background: 'var(--card-bg, #fff)',
            borderRadius: 18, overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            border: '1px solid var(--border-color, rgba(0,0,0,0.06))',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex', flexDirection: 'column',
        }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.12)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; }}
        >
            {/* Color stripe */}
            <div style={{ height: 4, background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }} />

            <div style={{ padding: '20px 22px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {canCreateProject || isProjectLead ? (
                            <select
                                value={project.status || 'Active'}
                                onChange={(e) => onUpdateProjectStatus && onUpdateProjectStatus(project.id, e.target.value)}
                                style={{
                                    padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                    background: (STATUS_CONFIG[project.status || 'Active'] || STATUS_CONFIG['Active']).bg,
                                    color: (STATUS_CONFIG[project.status || 'Active'] || STATUS_CONFIG['Active']).color,
                                    border: 'none', cursor: 'pointer', outline: 'none'
                                }}
                            >
                                <option value="Active">Active</option>
                                <option value="On Hold">On Hold</option>
                                <option value="Completed">Done</option>
                            </select>
                        ) : (
                            <StatusBadge status={project.status || 'Active'} config={STATUS_CONFIG} />
                        )}

                        {isMember && (
                            <span style={{
                                padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: 'rgba(16,185,129,0.12)', color: '#10b981',
                                display: 'inline-flex', alignItems: 'center', gap: 4
                            }}>
                                ✓ Assigned {memberObj?.role ? `(${memberObj.role})` : ''}
                            </span>
                        )}
                    </div>
                    <ProgressRing pct={pct} size={48} stroke={4} />
                </div>

                {/* Title + description */}
                <h3 style={{ margin: '6px 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.2px', lineHeight: 1.3 }}>
                    {project.title}
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-muted, #6b7280)', lineHeight: 1.6, flexGrow: 1 }}>
                    {project.description?.length > 90 ? project.description.slice(0, 90) + '…' : project.description}
                </p>

                {/* Tech stack chips */}
                {project.techStack && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
                        {project.techStack.split(',').map(t => (
                            <span key={t} style={{
                                padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                                background: 'rgba(79,70,229,0.08)', color: '#4f46e5',
                            }}>{t.trim()}</span>
                        ))}
                    </div>
                )}

                {/* Meta row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    {/* Team avatars */}
                    <div style={{ display: 'flex' }}>
                        {(project.teamMembers || []).slice(0, 5).map((m, i) => (
                            <div key={m.id} title={getEmpName(m.id)} style={{ marginLeft: i === 0 ? 0 : -8, zIndex: 10 - i }}>
                                <Avatar name={getEmpName(m.id)} size={28} color={teamColors[i % teamColors.length]} />
                            </div>
                        ))}
                        {(project.teamMembers?.length || 0) > 5 && (
                            <div style={{
                                width: 28, height: 28, borderRadius: '50%', marginLeft: -8,
                                background: 'var(--surface-soft)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>+{project.teamMembers.length - 5}</div>
                        )}
                    </div>
                    {/* Deadline */}
                    {project.deadline && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                            </svg>
                            {project.deadline}
                        </div>
                    )}
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                    <div style={{ height: 6, background: 'var(--surface-soft, rgba(0,0,0,0.07))', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 4,
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                            transition: 'width 0.5s ease',
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{tasks.filter(t => t.status === 'Completed').length}/{tasks.length} tasks</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#4f46e5' }}>{pct}% complete</span>
                    </div>
                </div>

                {/* Tasks section */}
                <div style={{ borderTop: '1px solid var(--border-color, rgba(0,0,0,0.06))', paddingTop: 14 }}>
                    <button
                        onClick={() => setExpanded(v => !v)}
                        style={{
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: 0, marginBottom: expanded ? 10 : 0,
                            color: 'var(--text-muted, #6b7280)', fontSize: 12, fontWeight: 600,
                        }}>
                        <span>TASKS ({tasks.length})</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <polyline points="6 9 12 15 18 9"/>
                        </svg>
                    </button>

                    {expanded && (
                        <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                            {tasks.length === 0
                                ? <p style={{ textAlign: 'center', color: 'var(--text-muted, #6b7280)', fontSize: 13, padding: '12px 0', margin: 0 }}>No tasks yet</p>
                                : tasks.map(task => {
                                    const ts = TASK_STATUS[task.status] || TASK_STATUS['Todo'];
                                    // Check if current user is assigned (handles both array and single value formats)
                                    const assignedToList = Array.isArray(task.assignedToMultiple) 
                                        ? task.assignedToMultiple 
                                        : (task.assignedTo ? [task.assignedTo] : []);
                                    const isMyTask = assignedToList.some(id => String(id) === myId);
                                        
                                    return (
                                        <div key={task.id || task._id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 10px', borderRadius: 9, marginBottom: 6,
                                            background: isMyTask ? 'rgba(79,70,229,0.06)' : 'var(--surface-soft, rgba(0,0,0,0.025))',
                                            border: isMyTask ? '1px solid rgba(79,70,229,0.25)' : '1px solid transparent',
                                        }}>
                                            <div style={{ flexGrow: 1, marginRight: 8 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {task.title}
                                                    {isMyTask && <span style={{ fontSize: 10, background: '#4f46e5', color: '#fff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>Your Task</span>}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>→ {task.assignedToName || 'Unassigned'}</div>
                                            </div>
                                            <select
                                                value={task.status || 'Todo'}
                                                onChange={(e) => onUpdateTaskStatus(task.id || task._id, e.target.value)}
                                                style={{
                                                    padding: '3px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                                    background: ts.bg, color: ts.color, border: `1px solid ${ts.color}44`,
                                                    cursor: 'pointer', outline: 'none'
                                                }}
                                            >
                                                <option value="Todo">Todo</option>
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                            </select>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    )}
                </div>

                {/* Add task button - only for HR, TL, or Project Leads */}
                {(canCreateProject || isProjectLead) && (
                    <button onClick={() => onAddTask(project)} style={{
                        width: '100%', padding: '10px', border: '1.5px dashed rgba(79,70,229,0.35)',
                        borderRadius: 10, background: 'rgba(79,70,229,0.04)',
                        color: '#4f46e5', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'background 0.15s, border-color 0.15s', marginTop: 'auto',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.1)'; e.currentTarget.style.borderColor = '#4f46e5'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(79,70,229,0.04)'; e.currentTarget.style.borderColor = 'rgba(79,70,229,0.35)'; }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        Add Task
                    </button>
                )}

                {/* Edit / Delete row - only for HR / TL / project leads who can manage this project */}
                {(canCreateProject || isProjectLead) && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                            onClick={() => onEditProject && onEditProject(project)}
                            style={{
                                flex: 1, padding: '9px', border: '1.5px solid var(--border-color, rgba(0,0,0,0.1))',
                                borderRadius: 10, background: 'transparent',
                                color: 'var(--text-main)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                transition: 'background 0.15s',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'var(--surface-soft, rgba(0,0,0,0.04))'}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Edit
                        </button>
                        {canCreateProject && (
                            <button
                                onClick={() => onDeleteProject && window.confirm('Are you sure you want to delete this project?') && onDeleteProject(project.id)}
                                style={{
                                    flex: 1, padding: '9px', border: '1.5px solid rgba(239,68,68,0.25)',
                                    borderRadius: 10, background: 'rgba(239,68,68,0.05)',
                                    color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    transition: 'background 0.15s',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.12)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}
                            >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = ({ onNew, canCreateProject }) => (
    <div style={{
        gridColumn: '1 / -1', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '80px 20px',
        textAlign: 'center',
    }}>
        <div style={{
            width: 80, height: 80, borderRadius: 24, background: 'rgba(79,70,229,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="1.5">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: 'var(--text-main)' }}>
            {canCreateProject ? 'No projects yet' : 'No assigned projects'}
        </h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-muted, #6b7280)', maxWidth: 360 }}>
            {canCreateProject
                ? 'Create your first project to start managing tasks and tracking progress with your team.'
                : 'You have not been assigned to any projects yet. Your HR or Team Lead will assign you to projects.'}
        </p>
        {canCreateProject && (
            <button onClick={onNew} style={{
                padding: '12px 28px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
                fontSize: 14, fontWeight: 600, boxShadow: '0 4px 14px rgba(79,70,229,0.4)',
                display: 'flex', alignItems: 'center', gap: 8,
            }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Create First Project
            </button>
        )}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const ProjectManagement = () => {
    const { user, companies } = useAuth();
    
    const isHR = user?.type === 'hr' || user?.type === 'company' || user?.role === 'admin' || user?.isHeadHr;
    const isTL = user?.role === 'project_manager' || user?.role === 'team_lead' || user?.designation?.toLowerCase()?.includes('lead') || user?.designation?.toLowerCase()?.includes('manager');
    const canCreateProject = isHR || isTL;

    const [projects, setProjects]       = useState([]);
    const [taskMap,  setTaskMap]        = useState({});
    const [employees, setEmployees]     = useState([]);
    const [loading, setLoading]         = useState(true);
    const [filter, setFilter]           = useState(canCreateProject ? 'All' : 'Assigned to Me');

    const [projectModal, setProjectModal] = useState(false);
    const [taskModal, setTaskModal]       = useState(false);
    const [editModal, setEditModal]       = useState(false);
    const [targetProject, setTargetProject] = useState(null);
    const [editingProject, setEditingProject] = useState(null);

    const [pForm, setPForm] = useState({ title: '', description: '', deadline: '', techStack: '', teamMembers: [] });
    const [tForm, setTForm] = useState({ title: '', description: '', assignedTo: [], dueDate: '' });
    const [eForm, setEForm] = useState({ title: '', description: '', deadline: '', techStack: '', teamMembers: [] });
    const [submitting, setSubmitting]   = useState(false);

    const intervalRef = useRef(null);

    const loadProjects = useCallback(async (silent = false) => {
        if (!user?.companyId) return;
        if (!silent) setLoading(true);
        try {
            const res = await fetch(`${API}/projects/${user.companyId}`);
            if (!res.ok) return;
            const data = await res.json();
            setProjects(data);
            const taskResults = await Promise.all(
                data.map(p => fetch(`${API}/tasks/project/${p.id}`).then(r => r.ok ? r.json() : []).catch(() => []))
            );
            const map = {};
            data.forEach((p, i) => { map[p.id] = taskResults[i]; });
            setTaskMap(map);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user?.companyId]);

    useEffect(() => {
        loadProjects();
        intervalRef.current = setInterval(() => loadProjects(true), 10000);
        return () => clearInterval(intervalRef.current);
    }, [loadProjects]);

    useEffect(() => {
        if (companies && user?.companyId) {
            const co = companies.find(c => c.id === parseInt(user.companyId));
            if (co) {
                const subordinates = co.employeeAccounts || [];
                setEmployees(subordinates.map(e => ({ ...e, _isHr: false })));
            } else {
                setEmployees([]);
            }
        }
    }, [user, companies]);

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!canCreateProject) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...pForm, companyId: user.companyId, createdBy: user.name }),
            });
            if (res.ok) {
                setPForm({ title: '', description: '', deadline: '', techStack: '', teamMembers: [] });
                setProjectModal(false);
                loadProjects(true);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const toggleMember = (empId) => {
        setPForm(prev => {
            const has = prev.teamMembers.find(m => String(m.id) === String(empId));
            return {
                ...prev,
                teamMembers: has
                    ? prev.teamMembers.filter(m => String(m.id) !== String(empId))
                    : [...prev.teamMembers, { id: empId, role: '' }],
            };
        });
    };

    const openEditModal = (project) => {
        setEditingProject(project);
        setEForm({
            title: project.title || '',
            description: project.description || '',
            deadline: project.deadline || '',
            techStack: project.techStack || '',
            teamMembers: project.teamMembers ? project.teamMembers.map(m => ({ ...m })) : [],
        });
        setEditModal(true);
    };

    const toggleEditMember = (empId) => {
        setEForm(prev => {
            const has = prev.teamMembers.find(m => String(m.id) === String(empId));
            return {
                ...prev,
                teamMembers: has
                    ? prev.teamMembers.filter(m => String(m.id) !== String(empId))
                    : [...prev.teamMembers, { id: empId, role: '' }],
            };
        });
    };

    const handleUpdateProject = async (e) => {
        e.preventDefault();
        if (!editingProject) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API}/projects/${editingProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(eForm),
            });
            if (res.ok) {
                const updated = await res.json();
                setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, ...updated } : p));
                setEditModal(false);
                setEditingProject(null);
            } else {
                alert('Failed to update project.');
            }
        } catch (err) {
            console.error('Error updating project:', err);
            alert('Error updating project. Check console.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleTaskAssignee = (empId) => {
        setTForm(prev => {
            const strId = String(empId);
            const has = prev.assignedTo.includes(strId);
            return {
                ...prev,
                assignedTo: has 
                    ? prev.assignedTo.filter(id => id !== strId)
                    : [...prev.assignedTo, strId]
            };
        });
    };

    const handleAssignTask = async (e) => {
        e.preventDefault();
        if (!targetProject) return;
        if (tForm.assignedTo.length === 0) {
            alert("Please assign at least one employee to this task.");
            return;
        }
        setSubmitting(true);
        
        const assignedEmps = employees.filter(emp => tForm.assignedTo.includes(String(emp.id)));
        const assignedToNames = assignedEmps.map(e => e.name).join(', ');
        
        try {
            const res = await fetch(`${API}/project-tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: tForm.title,
                    description: tForm.description,
                    dueDate: tForm.dueDate,
                    projectId: targetProject.id,
                    projectTitle: targetProject.title,
                    assignedTo: tForm.assignedTo[0], // Send first employee as single value for backward compatibility
                    assignedToMultiple: tForm.assignedTo, // Send full array
                    assignedToName: assignedToNames,
                    assignedBy: user.name,
                }),
            });
            if (res.ok) {
                setTForm({ title: '', description: '', assignedTo: [], dueDate: '' });
                setTaskModal(false);
                loadProjects(true);
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to assign task:', errorData);
                alert('Failed to assign task. Please check console for details.');
            }
        } catch (err) {
            console.error('Error assigning task:', err);
            alert('Error assigning task. Check console.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateTaskStatus = async (taskId, newStatus) => {
        try {
            const res = await fetch(`${API}/project-tasks/${taskId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setTaskMap(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(pid => {
                        next[pid] = next[pid].map(t => (t.id === taskId || t._id === taskId) ? { ...t, status: newStatus } : t);
                    });
                    return next;
                });
            }
        } catch (err) {
            console.error('Error updating task status:', err);
        }
    };

    const handleUpdateProjectStatus = async (projectId, newStatus) => {
        try {
            const res = await fetch(`${API}/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });
            if (res.ok) {
                setProjects(prev => prev.map(p => p.id === projectId ? { ...p, status: newStatus } : p));
            }
        } catch (err) {
            console.error('Error updating project status:', err);
        }
    };

    const handleDeleteProject = async (projectId) => {
        try {
            const res = await fetch(`${API}/projects/${projectId}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setProjects(prev => prev.filter(p => String(p.id || p._id) !== String(projectId)));
                setTaskMap(prev => {
                    const next = { ...prev };
                    delete next[projectId];
                    return next;
                });
            } else {
                alert("Failed to delete project. Please check if the server is running.");
            }
        } catch (err) {
            console.error('Error deleting project:', err);
            alert("Error deleting project. Check console.");
        }
    };

    const openTaskModal = (project) => {
        setTargetProject(project);
        setTForm({ title: '', description: '', assignedTo: [], dueDate: '' });
        setTaskModal(true);
    };

    const myId = String(user?.empId || user?.id);
    const displayed = projects
        .filter(p => {
            if (filter === 'Assigned to Me') {
                return p.teamMembers?.some(m => String(m.id) === myId) || (taskMap[p.id] || []).some(t => {
                    const assignedToList = Array.isArray(t.assignedToMultiple) 
                        ? t.assignedToMultiple 
                        : (t.assignedTo ? [t.assignedTo] : []);
                    return assignedToList.some(id => String(id) === myId);
                });
            }
            if (filter === 'All' || filter === 'All Projects') return true;
            return (p.status || 'Active') === filter;
        })
        .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            
            if (dateA && dateB) return dateB - dateA;
            
            const idA = typeof a.id === 'string' ? (parseInt(a.id, 10) || 0) : (a.id || 0);
            const idB = typeof b.id === 'string' ? (parseInt(b.id, 10) || 0) : (b.id || 0);
            return idB - idA;
        });

    const totalTasks = Object.values(taskMap).flat().length;
    const doneTasks  = Object.values(taskMap).flat().filter(t => t.status === 'Completed').length;

    const filterTabs = canCreateProject
        ? ['All', 'Active', 'On Hold', 'Completed']
        : ['Assigned to Me', 'All Projects', 'Active', 'Completed'];

    return (
        <>
            <style>{`
                @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
                @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
                .pm-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
                .pm-stat { transition: box-shadow 0.2s; }
                .pm-stat:hover { box-shadow: 0 6px 24px rgba(0,0,0,0.1) !important; }
            `}</style>

            <div style={{ padding: '28px 32px', minHeight: '100%', boxSizing: 'border-box' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
                                Project Management
                            </h1>
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                            }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite' }}/>
                                LIVE
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--text-muted, #6b7280)' }}>
                            {projects.length} project{projects.length !== 1 ? 's' : ''} · {totalTasks} tasks · {doneTasks} completed
                        </p>
                    </div>

                    {canCreateProject ? (
                        <button onClick={() => setProjectModal(true)} style={{
                            padding: '11px 22px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff',
                            fontSize: 14, fontWeight: 600, boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                            display: 'flex', alignItems: 'center', gap: 8, transition: 'opacity 0.15s, transform 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            New Project
                        </button>
                    ) : (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 16px', borderRadius: 12,
                            background: 'rgba(79,70,229,0.08)', color: '#4f46e5',
                            fontSize: 13, fontWeight: 600, border: '1px solid rgba(79,70,229,0.18)'
                        }}>
                            <i className="bi bi-person-check-fill"></i>
                            Assigned Workspace
                        </div>
                    )}
                </div>

                {projects.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 26 }}>
                        {[
                            { label: 'Total', value: projects.length, color: '#4f46e5' },
                            { label: 'Active', value: projects.filter(p => (p.status || 'Active') === 'Active').length, color: '#4f46e5' },
                            { label: 'Completed', value: projects.filter(p => p.status === 'Completed').length, color: '#10b981' },
                            { label: 'On Hold', value: projects.filter(p => p.status === 'On Hold').length, color: '#f59e0b' },
                            { label: 'Tasks Done', value: `${doneTasks}/${totalTasks}`, color: '#06b6d4' },
                        ].map(s => (
                            <div key={s.label} className="pm-stat" style={{
                                background: 'var(--card-bg, #fff)', borderRadius: 14, padding: '16px 18px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.06)', border: '1px solid var(--border-color, rgba(0,0,0,0.05))',
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', fontWeight: 500, marginTop: 2 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {projects.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, marginBottom: 22, flexWrap: 'wrap' }}>
                        {filterTabs.map(f => (
                            <button key={f} onClick={() => setFilter(f)} style={{
                                padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                                background: filter === f ? '#4f46e5' : 'var(--card-bg, #fff)',
                                color: filter === f ? '#fff' : 'var(--text-muted, #6b7280)',
                                boxShadow: filter === f ? '0 2px 8px rgba(79,70,229,0.3)' : '0 1px 4px rgba(0,0,0,0.06)',
                                transition: 'all 0.15s',
                            }}>{f}</button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12, color: 'var(--text-muted, #6b7280)' }}>
                        <div style={{ width: 24, height: 24, border: '3px solid rgba(79,70,229,0.2)', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Loading projects…
                        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                    </div>
                ) : (
                    <div className="pm-grid">
                        {displayed.length === 0
                            ? <EmptyState onNew={() => setProjectModal(true)} canCreateProject={canCreateProject} />
                            : displayed.map(p => (
                                <ProjectCard
                                    key={p.id}
                                    project={p}
                                    tasks={taskMap[p.id] || []}
                                    employees={employees}
                                    onAddTask={openTaskModal}
                                    onUpdateTaskStatus={handleUpdateTaskStatus}
                                    onUpdateProjectStatus={handleUpdateProjectStatus}
                                    onEditProject={openEditModal}
                                    onDeleteProject={handleDeleteProject}
                                    user={user}
                                    canCreateProject={canCreateProject}
                                />
                            ))
                        }
                    </div>
                )}
            </div>

            <Modal show={projectModal} onClose={() => setProjectModal(false)} title="New Project" subtitle="Define scope, stack, and build your team" width={700}>
                <form onSubmit={handleCreateProject}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Field label="Project Title *">
                                <Inp type="text" placeholder="e.g. Q4 Website Redesign" required value={pForm.title}
                                    onChange={e => setPForm(p => ({ ...p, title: e.target.value }))} />
                            </Field>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Field label="Description *">
                                <Txt placeholder="Goals, deliverables, and context…" required value={pForm.description}
                                    onChange={e => setPForm(p => ({ ...p, description: e.target.value }))} />
                            </Field>
                        </div>
                        <Field label="Tech Stack">
                            <Inp type="text" placeholder="React, Node.js, Firebase…" value={pForm.techStack}
                                onChange={e => setPForm(p => ({ ...p, techStack: e.target.value }))} />
                        </Field>
                        <Field label="Deadline *">
                            <Inp type="date" required value={pForm.deadline}
                                onChange={e => setPForm(p => ({ ...p, deadline: e.target.value }))} />
                        </Field>
                    </div>

                    <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted, #6b7280)' }}>Team Members</label>
                            <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>{pForm.teamMembers.length} selected</span>
                        </div>
                        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {employees.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>No employees found.</p>
                            ) : (
                                <>
                                    {employees.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', margin: '5px 0 2px 4px' }}>EMPLOYEES</div>}
                                    {employees.map((emp, i) => {
                                        const selected = pForm.teamMembers.find(m => String(m.id) === String(emp.id));
                                        const color = ['#4f46e5','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4'][i % 6];
                                        return (
                                            <div key={emp.id} onClick={() => toggleMember(emp.id)} style={{
                                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                                border: `1.5px solid ${selected ? '#4f46e5' : 'var(--border-color, rgba(0,0,0,0.07))'}`,
                                                background: selected ? 'rgba(79,70,229,0.06)' : 'transparent', transition: 'all 0.15s',
                                            }}>
                                                <Avatar name={emp.name} size={34} color={color} />
                                                <div style={{ flexGrow: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{emp.designation || emp.employeeType || 'Employee'}</div>
                                                </div>
                                                {selected && (
                                                    <input type="text" placeholder="Role (e.g. Lead)" value={selected.role || ''}
                                                        onClick={e => e.stopPropagation()}
                                                        onChange={e => {
                                                            const role = e.target.value;
                                                            setPForm(prev => ({ ...prev, teamMembers: prev.teamMembers.map(m => String(m.id) === String(emp.id) ? { ...m, role } : m) }));
                                                        }}
                                                        style={{ ...inputStyle, width: 120, padding: '6px 10px', fontSize: 12, margin: 0 }}
                                                    />
                                                )}
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                                    border: `2px solid ${selected ? '#4f46e5' : 'var(--border-color, rgba(0,0,0,0.15))'}`,
                                                    background: selected ? '#4f46e5' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {selected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setProjectModal(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border-color, rgba(0,0,0,0.1))', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--text-muted, #6b7280)' }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(79,70,229,0.35)', opacity: submitting ? 0.7 : 1 }}>
                            {submitting ? 'Creating…' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={editModal} onClose={() => setEditModal(false)} title="Edit Project" subtitle="Update project details and team" width={700}>
                <form onSubmit={handleUpdateProject}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Field label="Project Title *">
                                <Inp type="text" placeholder="e.g. Q4 Website Redesign" required value={eForm.title}
                                    onChange={e => setEForm(p => ({ ...p, title: e.target.value }))} />
                            </Field>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <Field label="Description *">
                                <Txt placeholder="Goals, deliverables, and context…" required value={eForm.description}
                                    onChange={e => setEForm(p => ({ ...p, description: e.target.value }))} />
                            </Field>
                        </div>
                        <Field label="Tech Stack">
                            <Inp type="text" placeholder="React, Node.js, Firebase…" value={eForm.techStack}
                                onChange={e => setEForm(p => ({ ...p, techStack: e.target.value }))} />
                        </Field>
                        <Field label="Deadline *">
                            <Inp type="date" required value={eForm.deadline}
                                onChange={e => setEForm(p => ({ ...p, deadline: e.target.value }))} />
                        </Field>
                    </div>

                    <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <label style={{ fontSize: 11.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted, #6b7280)' }}>Team Members</label>
                            <span style={{ fontSize: 12, color: '#4f46e5', fontWeight: 600 }}>{eForm.teamMembers.length} selected</span>
                        </div>
                        <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {employees.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>No employees found.</p>
                            ) : (
                                <>
                                    {employees.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', margin: '5px 0 2px 4px' }}>EMPLOYEES</div>}
                                    {employees.map((emp, i) => {
                                        const selected = eForm.teamMembers.find(m => String(m.id) === String(emp.id));
                                        const color = ['#4f46e5','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4'][i % 6];
                                        return (
                                            <div key={emp.id} onClick={() => toggleEditMember(emp.id)} style={{
                                                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                                border: `1.5px solid ${selected ? '#4f46e5' : 'var(--border-color, rgba(0,0,0,0.07))'}`,
                                                background: selected ? 'rgba(79,70,229,0.06)' : 'transparent', transition: 'all 0.15s',
                                            }}>
                                                <Avatar name={emp.name} size={34} color={color} />
                                                <div style={{ flexGrow: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{emp.designation || emp.employeeType || 'Employee'}</div>
                                                </div>
                                                {selected && (
                                                    <input type="text" placeholder="Role (e.g. Lead)" value={selected.role || ''}
                                                        onClick={e => e.stopPropagation()}
                                                        onChange={e => {
                                                            const role = e.target.value;
                                                            setEForm(prev => ({ ...prev, teamMembers: prev.teamMembers.map(m => String(m.id) === String(emp.id) ? { ...m, role } : m) }));
                                                        }}
                                                        style={{ ...inputStyle, width: 120, padding: '6px 10px', fontSize: 12, margin: 0 }}
                                                    />
                                                )}
                                                <div style={{
                                                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                                    border: `2px solid ${selected ? '#4f46e5' : 'var(--border-color, rgba(0,0,0,0.15))'}`,
                                                    background: selected ? '#4f46e5' : 'transparent',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                }}>
                                                    {selected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setEditModal(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border-color, rgba(0,0,0,0.1))', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--text-muted, #6b7280)' }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(79,70,229,0.35)', opacity: submitting ? 0.7 : 1 }}>
                            {submitting ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal show={taskModal} onClose={() => setTaskModal(false)}
                title="Assign Task"
                subtitle={targetProject ? `→ ${targetProject.title}` : ''}
                width={520}
            >
                <form onSubmit={handleAssignTask}>
                    <Field label="Task Title *">
                        <Inp type="text" placeholder="What needs to be done?" required value={tForm.title}
                            onChange={e => setTForm(p => ({ ...p, title: e.target.value }))} />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                        <Field label="Assign Employees *">
                            <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, border: '1.5px solid var(--border-color, rgba(0,0,0,0.1))', borderRadius: 10, padding: 10, background: 'var(--surface-soft, rgba(0,0,0,0.02))' }}>
                                {employees.filter(emp => targetProject?.teamMembers?.some(m => String(m.id) === String(emp.id))).length === 0 ? (
                                    <p style={{ fontSize: 12, color: '#f59e0b', margin: 0, textAlign: 'center', padding: 10 }}>
                                        This project has no team members yet. Edit the project to add some before assigning tasks.
                                    </p>
                                ) : (
                                    employees
                                        .filter(emp => targetProject?.teamMembers?.some(m => String(m.id) === String(emp.id)))
                                        .map(emp => {
                                            const isSelected = tForm.assignedTo.includes(String(emp.id));
                                            const role = targetProject?.teamMembers?.find(m => String(m.id) === String(emp.id))?.role;
                                            const color = ['#4f46e5','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4'][employees.indexOf(emp) % 6];
                                            return (
                                                <div key={emp.id} onClick={() => toggleTaskAssignee(emp.id)} style={{
                                                    display: 'flex', alignItems: 'center', gap: 10,
                                                    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
                                                    border: `1.5px solid ${isSelected ? '#4f46e5' : 'transparent'}`,
                                                    background: isSelected ? 'rgba(79,70,229,0.06)' : 'transparent',
                                                    transition: 'all 0.15s',
                                                }}>
                                                    <Avatar name={emp.name} size={30} color={color} />
                                                    <div style={{ flexGrow: 1 }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{role || 'Team Member'}</div>
                                                    </div>
                                                    <div style={{
                                                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                                                        border: `2px solid ${isSelected ? '#4f46e5' : 'var(--border-color, rgba(0,0,0,0.15))'}`,
                                                        background: isSelected ? '#4f46e5' : 'transparent',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}>
                                                        {isSelected && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><polyline points="2,6 5,9 10,3" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                                                    </div>
                                                </div>
                                            );
                                        })
                                )}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 6 }}>
                                {tForm.assignedTo.length} employee(s) selected
                            </div>
                        </Field>
                        
                        <Field label="Due Date *">
                            <Inp type="date" required value={tForm.dueDate}
                                onChange={e => setTForm(p => ({ ...p, dueDate: e.target.value }))} />
                        </Field>
                    </div>

                    <Field label="Details">
                        <Txt placeholder="Specific instructions or notes…" value={tForm.description}
                            onChange={e => setTForm(p => ({ ...p, description: e.target.value }))} />
                    </Field>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                        <button type="button" onClick={() => setTaskModal(false)} style={{
                            padding: '10px 20px', borderRadius: 10, border: '1.5px solid var(--border-color, rgba(0,0,0,0.1))',
                            background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: 'var(--text-muted, #6b7280)',
                        }}>Cancel</button>
                        <button type="submit" disabled={submitting} style={{
                            padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
                            background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                            fontSize: 14, fontWeight: 600, boxShadow: '0 4px 12px rgba(16,185,129,0.35)',
                            opacity: submitting ? 0.7 : 1,
                        }}>
                            {submitting ? 'Assigning…' : 'Assign Task'}
                        </button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default ProjectManagement;