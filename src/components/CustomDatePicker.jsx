import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaChevronLeft, FaChevronRight, FaCalendarAlt } from 'react-icons/fa';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ---- helpers -------------------------------------------------------------
const pad2 = (n) => String(n).padStart(2, '0');

const toISO = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

const parseISO = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
};

const formatDisplay = (iso) => {
    const dt = parseISO(iso);
    if (!dt) return '';
    return `${pad2(dt.getDate())}-${pad2(dt.getMonth() + 1)}-${dt.getFullYear()}`;
};

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const isSameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * CustomDatePicker
 * A fully custom, dependency-free date picker where the year, month and day
 * can each be navigated/selected independently:
 *   - Click the month label in the header to jump into a month grid
 *   - Click the year label in the header to jump into a year grid
 *   - Otherwise browse days with prev/next arrows
 *
 * value: ISO string 'YYYY-MM-DD' (or '')
 * onChange: (isoString) => void
 */
const CustomDatePicker = ({
    value,
    onChange,
    disabled = false,
    placeholder = 'Select date',
    minDate,
    maxDate,
    id
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('days'); // 'days' | 'months' | 'years'
    const selectedDate = useMemo(() => parseISO(value), [value]);
    const [viewDate, setViewDate] = useState(selectedDate || new Date());
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setViewDate(selectedDate || new Date());
            setView('days');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const today = new Date();
    const min = minDate ? new Date(minDate) : null;
    const max = maxDate ? new Date(maxDate) : null;

    const isDisabledDate = (d) => {
        if (min && d < new Date(min.getFullYear(), min.getMonth(), min.getDate())) return true;
        if (max && d > new Date(max.getFullYear(), max.getMonth(), max.getDate())) return true;
        return false;
    };

    const handleSelectDay = (day) => {
        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (isDisabledDate(d)) return;
        onChange(toISO(viewDate.getFullYear(), viewDate.getMonth(), day));
        setIsOpen(false);
    };

    const goPrev = () => {
        if (view === 'days') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
        else if (view === 'months') setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
        else setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1));
    };

    const goNext = () => {
        if (view === 'days') setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
        else if (view === 'months') setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
        else setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1));
    };

    const decadeStart = Math.floor(viewDate.getFullYear() / 12) * 12;

    // Build the day grid (with leading/trailing blanks from adjacent months)
    const buildDayGrid = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const totalDays = daysInMonth(year, month);
        const prevMonthDays = daysInMonth(year, month - 1);
        const cells = [];

        for (let i = firstWeekday - 1; i >= 0; i--) {
            cells.push({ day: prevMonthDays - i, current: false });
        }
        for (let d = 1; d <= totalDays; d++) {
            cells.push({ day: d, current: true });
        }
        while (cells.length % 7 !== 0) {
            cells.push({ day: cells.length - (firstWeekday + totalDays) + 1, current: false });
        }
        return cells;
    };

    const headerLabel = view === 'years'
        ? `${decadeStart} - ${decadeStart + 11}`
        : null;

    return (
        <div className="cdp-wrapper" ref={wrapperRef}>
            <button
                type="button"
                id={id}
                className="cdp-input"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen((o) => !o)}
            >
                <span className={value ? 'cdp-input-value' : 'cdp-input-placeholder'}>
                    {value ? formatDisplay(value) : placeholder}
                </span>
                <FaCalendarAlt className="cdp-input-icon" />
            </button>

            {isOpen && !disabled && (
                <div className="cdp-popover" role="dialog" aria-label="Choose date">
                    <div className="cdp-header">
                        <button type="button" className="cdp-nav-btn" onClick={goPrev} aria-label="Previous">
                            <FaChevronLeft size={12} />
                        </button>

                        {view === 'days' && (
                            <div className="cdp-header-labels">
                                <button type="button" className="cdp-label-btn" onClick={() => setView('months')}>
                                    {MONTHS[viewDate.getMonth()]}
                                </button>
                                <button type="button" className="cdp-label-btn" onClick={() => setView('years')}>
                                    {viewDate.getFullYear()}
                                </button>
                            </div>
                        )}
                        {view === 'months' && (
                            <button type="button" className="cdp-label-btn" onClick={() => setView('years')}>
                                {viewDate.getFullYear()}
                            </button>
                        )}
                        {view === 'years' && (
                            <span className="cdp-label-btn cdp-label-static">{headerLabel}</span>
                        )}

                        <button type="button" className="cdp-nav-btn" onClick={goNext} aria-label="Next">
                            <FaChevronRight size={12} />
                        </button>
                    </div>

                    {view === 'days' && (
                        <div className="cdp-body">
                            <div className="cdp-weekdays">
                                {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
                            </div>
                            <div className="cdp-days-grid">
                                {buildDayGrid().map((cell, idx) => {
                                    const cellDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), cell.day);
                                    const disabledCell = cell.current && isDisabledDate(cellDate);
                                    const selected = cell.current && isSameDay(cellDate, selectedDate);
                                    const isToday = cell.current && isSameDay(cellDate, today);
                                    return (
                                        <button
                                            type="button"
                                            key={idx}
                                            className={
                                                'cdp-day' +
                                                (!cell.current ? ' cdp-day-muted' : '') +
                                                (selected ? ' cdp-day-selected' : '') +
                                                (isToday && !selected ? ' cdp-day-today' : '')
                                            }
                                            disabled={disabledCell}
                                            onClick={() => cell.current && handleSelectDay(cell.day)}
                                            tabIndex={cell.current ? 0 : -1}
                                        >
                                            {cell.day}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {view === 'months' && (
                        <div className="cdp-grid-3">
                            {MONTHS_SHORT.map((m, idx) => (
                                <button
                                    type="button"
                                    key={m}
                                    className={'cdp-grid-cell' + (idx === viewDate.getMonth() ? ' cdp-grid-cell-selected' : '')}
                                    onClick={() => {
                                        setViewDate(new Date(viewDate.getFullYear(), idx, 1));
                                        setView('days');
                                    }}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    )}

                    {view === 'years' && (
                        <div className="cdp-grid-3">
                            {Array.from({ length: 12 }, (_, i) => decadeStart + i).map((y) => (
                                <button
                                    type="button"
                                    key={y}
                                    className={'cdp-grid-cell' + (y === viewDate.getFullYear() ? ' cdp-grid-cell-selected' : '')}
                                    onClick={() => {
                                        setViewDate(new Date(y, viewDate.getMonth(), 1));
                                        setView('months');
                                    }}
                                >
                                    {y}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="cdp-footer">
                        <button
                            type="button"
                            className="cdp-today-btn"
                            onClick={() => {
                                if (isDisabledDate(today)) return;
                                onChange(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
                                setIsOpen(false);
                            }}
                        >
                            Today
                        </button>
                        {value && (
                            <button
                                type="button"
                                className="cdp-clear-btn"
                                onClick={() => { onChange(''); setIsOpen(false); }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                .cdp-wrapper {
                    position: relative;
                    width: 100%;
                }
                .cdp-input {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    padding: 0.5rem 0.75rem;
                    border-radius: 8px;
                    border: 1px solid var(--border-color, #ced4da);
                    background: var(--input-bg, #fff);
                    color: var(--text-main, #212529);
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: border-color 150ms ease, box-shadow 150ms ease;
                }
                .cdp-input:hover:not(:disabled) {
                    border-color: var(--accent, #0d6efd);
                }
                .cdp-input:focus-visible {
                    outline: none;
                    border-color: var(--accent, #0d6efd);
                    box-shadow: 0 0 0 3px var(--accent-soft, rgba(13,110,253,0.15));
                }
                .cdp-input:disabled {
                    cursor: not-allowed;
                    opacity: 0.65;
                }
                .cdp-input-placeholder { color: var(--text-muted, #6c757d); }
                .cdp-input-value { color: var(--text-main, #212529); font-weight: 500; }
                .cdp-input-icon { color: var(--accent, #0d6efd); flex-shrink: 0; }

                .cdp-popover {
                    position: absolute;
                    z-index: 1000;
                    top: calc(100% + 6px);
                    left: 0;
                    width: 280px;
                    background: var(--card-bg, #fff);
                    border: 1px solid var(--border-color, #e5e7eb);
                    border-radius: 12px;
                    box-shadow: 0 12px 32px rgba(0,0,0,0.18);
                    padding: 12px;
                    animation: cdp-pop-in 140ms ease;
                }
                @keyframes cdp-pop-in {
                    from { opacity: 0; transform: translateY(-6px) scale(0.98); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .cdp-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .cdp-header-labels { display: flex; gap: 6px; }
                .cdp-label-btn {
                    background: transparent;
                    border: none;
                    font-weight: 600;
                    font-size: 0.9rem;
                    color: var(--text-main, #212529);
                    padding: 4px 8px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: background 120ms ease;
                }
                .cdp-label-btn:hover { background: var(--surface-soft, #f1f3f5); }
                .cdp-label-static { cursor: default; }
                .cdp-label-static:hover { background: transparent; }
                .cdp-nav-btn {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    background: var(--surface-soft, #f1f3f5);
                    color: var(--text-main, #212529);
                    border-radius: 50%;
                    cursor: pointer;
                    transition: background 120ms ease, transform 120ms ease;
                }
                .cdp-nav-btn:hover { background: var(--accent-soft, rgba(13,110,253,0.15)); color: var(--accent, #0d6efd); }
                .cdp-nav-btn:active { transform: scale(0.92); }

                .cdp-weekdays {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    text-align: center;
                    font-size: 0.72rem;
                    color: var(--text-muted, #6c757d);
                    margin-bottom: 4px;
                    font-weight: 600;
                }
                .cdp-days-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 2px;
                }
                .cdp-day {
                    aspect-ratio: 1;
                    border: none;
                    background: transparent;
                    color: var(--text-main, #212529);
                    border-radius: 8px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: background 120ms ease, color 120ms ease, transform 120ms ease;
                }
                .cdp-day:hover:not(:disabled) { background: var(--accent-soft, rgba(13,110,253,0.15)); }
                .cdp-day:active:not(:disabled) { transform: scale(0.9); }
                .cdp-day-muted { color: var(--text-muted, #adb5bd); opacity: 0.5; }
                .cdp-day-today { border: 1px solid var(--accent, #0d6efd); font-weight: 700; }
                .cdp-day-selected {
                    background: var(--accent, #0d6efd);
                    color: #fff;
                    font-weight: 700;
                }
                .cdp-day-selected:hover { background: var(--accent, #0d6efd); }
                .cdp-day:disabled { opacity: 0.3; cursor: not-allowed; }

                .cdp-grid-3 {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 6px;
                    padding: 4px 0;
                }
                .cdp-grid-cell {
                    padding: 10px 4px;
                    text-align: center;
                    border: none;
                    background: var(--surface-soft, #f1f3f5);
                    color: var(--text-main, #212529);
                    border-radius: 8px;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: background 120ms ease, transform 120ms ease;
                }
                .cdp-grid-cell:hover { background: var(--accent-soft, rgba(13,110,253,0.15)); }
                .cdp-grid-cell:active { transform: scale(0.94); }
                .cdp-grid-cell-selected { background: var(--accent, #0d6efd); color: #fff; font-weight: 700; }

                .cdp-footer {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 8px;
                    padding-top: 8px;
                    border-top: 1px solid var(--border-color, #e9ecef);
                }
                .cdp-today-btn, .cdp-clear-btn {
                    border: none;
                    background: transparent;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    padding: 4px 6px;
                    border-radius: 6px;
                }
                .cdp-today-btn { color: var(--accent, #0d6efd); }
                .cdp-today-btn:hover { background: var(--accent-soft, rgba(13,110,253,0.15)); }
                .cdp-clear-btn { color: #dc3545; }
                .cdp-clear-btn:hover { background: rgba(220,53,69,0.12); }
            `}</style>
        </div>
    );
};

export default CustomDatePicker;