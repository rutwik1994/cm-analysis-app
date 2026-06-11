"use client";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type NavItem = { id: string; label: string; path: string; icon: string };
type NavGroup = { id: string; label: string; defaultOpen?: boolean; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: 'purchaseorders', label: 'Purchase Orders', defaultOpen: true, items: [
      { id: 'catoverview', label: 'Category Spend Overview',  path: '/category',        icon: '📦' },
      { id: 'posummary',   label: 'Purchase Summary',         path: '/purchase-orders', icon: '🛒' },
    ],
  },
  {
    id: 'procurement', label: 'Strategic Procurement', defaultOpen: true, items: [
      { id: 'spend',        label: 'Spend Analysis',   path: '/',              icon: '₣' },
      { id: 'suppliers',    label: 'Supplier Tracker', path: '/suppliers',     icon: '🏭' },
      { id: 'topsuppliers', label: 'Top Suppliers',    path: '/top-suppliers', icon: '🏆' },
      { id: 'contracts',    label: 'Contract Monitor', path: '/contracts',     icon: '📋' },
      { id: 'budget',       label: 'Budget Forecast',  path: '/budget',        icon: '📊' },
    ],
  },
  {
    id: 'category', label: 'Category Management', items: [
      { id: 'catdach',    label: 'DACH',          path: '/category/dach',    icon: '🇩🇪' },
      { id: 'catus',      label: 'US',            path: '/category/us',      icon: '🇺🇸' },
      { id: 'catdkse',    label: 'DKSE',          path: '/category/dkse',    icon: '🇩🇰' },
      { id: 'catbenelux', label: 'BENELUX',       path: '/category/benelux', icon: '🇧🇪' },
      { id: 'catgb',      label: 'Great Britain', path: '/category/gb',      icon: '🇬🇧' },
      { id: 'catfr',      label: 'France',        path: '/category/fr',      icon: '🇫🇷' },
      { id: 'catau',      label: 'Australia',     path: '/category/au',      icon: '🇦🇺' },
      { id: 'catnz',      label: 'New Zealand',   path: '/category/nz',      icon: '🇳🇿' },
      { id: 'catie',      label: 'Ireland',       path: '/category/ie',      icon: '🇮🇪' },
      { id: 'catca',      label: 'Canada',        path: '/category/ca',      icon: '🇨🇦' },
    ],
  },
];

const C = {
  head: '#035624', body: '#0E6B2C', band: '#067A46',
  panel: '#0A5E27', activeBg: '#04401A', accent: '#96DC14',
  fg: '#FFFFFF', muted: 'rgba(255,255,255,.72)',
  hover: 'rgba(255,255,255,.06)', divider: 'rgba(255,255,255,.12)',
};

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const activeId = GROUPS.flatMap(g => g.items).find(
    i => pathname === i.path || pathname.startsWith(i.path + '/')
  )?.id ?? '';

  const [open, setOpen] = useState(() => new Set(GROUPS.filter(g => g.defaultOpen).map(g => g.id)));
  const [hover, setHover] = useState<string | null>(null);

  return (
    <aside style={{
      width: 256, background: C.body, color: C.fg,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Brand */}
      <div style={{
        background: C.head, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: `1px solid ${C.divider}`,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6, background: C.accent, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          color: C.head, font: '700 14px/1 var(--font-body)',
        }}>P</span>
        <div>
          <div style={{ font: '700 14px/18px var(--font-body)' }}>Procurement Analytics</div>
          <div style={{ font: '400 11px/14px var(--font-body)', color: C.muted }}>Category Management</div>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {GROUPS.map(g => {
          const isOpen = open.has(g.id);
          return (
            <div key={g.id}>
              <button
                onClick={() => setOpen(prev => { const n = new Set(prev); n.has(g.id) ? n.delete(g.id) : n.add(g.id); return n; })}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 16px', border: 0,
                  background: isOpen ? C.band : C.body, borderTop: `1px solid ${C.divider}`,
                  color: C.fg, cursor: 'pointer', font: '600 12px/16px var(--font-body)',
                  textAlign: 'left', letterSpacing: '.04em', textTransform: 'uppercase',
                }}>
                <span>{g.label}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ transform: `rotate(${isOpen ? 180 : 0}deg)`, transition: 'transform 200ms' }}>
                  <path d="M2.5 4.5l3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {isOpen && (
                <div style={{ background: C.panel, padding: '4px 0' }}>
                  {g.items.map(item => {
                    const isActive = activeId === item.id;
                    const isHovered = hover === item.id;
                    return (
                      <button key={item.id}
                        onClick={() => router.push(item.path)}
                        onMouseEnter={() => setHover(item.id)}
                        onMouseLeave={() => setHover(null)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                          padding: '9px 16px 9px 28px', border: 0, cursor: 'pointer',
                          background: isActive ? C.activeBg : isHovered ? C.hover : 'transparent',
                          color: isActive ? C.accent : C.fg,
                          font: `${isActive ? 600 : 400} 14px/20px var(--font-body)`,
                          textAlign: 'left', transition: 'all 150ms',
                          position: 'relative',
                        }}>
                        {isActive && (
                          <span style={{
                            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                            width: 4, height: 4, borderRadius: '50%', background: C.accent,
                          }} />
                        )}
                        <span style={{ fontSize: 14 }}>{item.icon}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer with logout */}
      <div style={{
        background: C.head, padding: '10px 16px', borderTop: `1px solid ${C.divider}`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,.16)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="6" r="2.5" stroke="white" strokeWidth="1.5"/>
            <path d="M3 13c1-2 3-3 5-3s4 1 5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: '600 12px/16px var(--font-body)', color: C.fg }}>Rutwik Godse</div>
          <div style={{ font: '400 11px/14px var(--font-body)', color: C.muted }}>Strategic Procurement</div>
        </div>
        <button
          title="Sign out"
          onClick={() => router.push('/api/logout')}
          style={{
            background: 'transparent', border: 0, cursor: 'pointer',
            color: C.muted, padding: 4, borderRadius: 4, display: 'flex',
          }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M10 3h3a1 1 0 011 1v8a1 1 0 01-1 1h-3M7 11l3-3-3-3M10 8H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </aside>
  );
}
