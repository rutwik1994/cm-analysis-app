"use client";
import React from "react";

export type IconName = 'cloche' | 'apple' | 'box' | 'recipe' | 'book' | 'scale' | 'truck' | 'home' | 'inv' | 'ai';

const SAGE_ICONS: Record<IconName, { path: string; label: string }> = {
  cloche: { path: '/icons/cloche-closed.svg',   label: 'cloche' },
  apple:  { path: '/icons/apple.svg',            label: 'apple' },
  box:    { path: '/icons/box-closed.svg',        label: 'box' },
  recipe: { path: '/icons/recipe-card.svg',       label: 'recipe card' },
  book:   { path: '/icons/book-fork-knife.svg',   label: 'cookbook' },
  scale:  { path: '/icons/kitchen-scale.svg',     label: 'scale' },
  truck:  { path: '/icons/truck-moving.svg',      label: 'truck' },
  home:   { path: '/icons/home-happy.svg',        label: 'home' },
  inv:    { path: '/icons/inventory.svg',         label: 'inventory' },
  ai:     { path: '/icons/ai.svg',               label: 'ai' },
};

export function Icon({ name, size = 20, style }: { name: IconName; size?: number; style?: React.CSSProperties }) {
  const meta = SAGE_ICONS[name];
  if (!meta) return null;
  return (
    <span
      role="img"
      aria-label={meta.label}
      style={{
        display: 'inline-flex', width: size, height: size,
        WebkitMaskImage: `url(${meta.path})`, maskImage: `url(${meta.path})`,
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
        WebkitMaskSize: 'contain', maskSize: 'contain',
        backgroundColor: 'currentColor',
        ...style,
      }}
    />
  );
}

export function Chevron({ dir = 'down', size = 16 }: { dir?: 'down' | 'up' | 'left' | 'right'; size?: number }) {
  const r = { down: 0, up: 180, left: 90, right: -90 }[dir];
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      style={{ transform: `rotate(${r}deg)`, transition: 'transform 200ms cubic-bezier(0,0,0.2,1)' }}>
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconPlus({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconEdit({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.5 4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2.5 4.5h11M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M4 4.5l.5 8.5a1 1 0 001 1h5a1 1 0 001-1L12 4.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 7.5v3M9.5 7.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconSort({ size = 12, dir }: { size?: number; dir?: 'asc' | 'desc' | null }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 1.5L9 4.5" stroke={dir === 'asc' ? '#067A46' : '#BBBBBB'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 7.5L6 10.5L9 7.5" stroke={dir === 'desc' ? '#067A46' : '#BBBBBB'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function CheckBox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }} onClick={e => e.stopPropagation()}>
      <span style={{
        width: 16, height: 16, borderRadius: 2,
        border: `1.5px solid ${checked ? '#067A46' : '#BBB'}`,
        background: checked ? '#067A46' : '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 150ms',
      }} onClick={onChange}>
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </span>
    </label>
  );
}
