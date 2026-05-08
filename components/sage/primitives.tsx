"use client";
import React, { useState } from "react";

type BtnVariant = 'fill' | 'outline' | 'text';
type BtnColor = 'positive' | 'negative' | 'neutral' | 'ai';
type BtnSize = 'sm' | 'md' | 'lg';

const btnSizes: Record<BtnSize, React.CSSProperties> = {
  sm: { height: 32, padding: '0 12px', fontSize: 14 },
  md: { height: 40, padding: '0 12px', fontSize: 14 },
  lg: { height: 48, padding: '0 16px', fontSize: 16 },
};

const palettes: Record<BtnColor, { fill: string; fillH: string; fg: string; tint: string; border?: string }> = {
  positive: { fill: '#067A46', fillH: '#056835', fg: '#fff', tint: '#F6FDE9' },
  negative: { fill: '#DB1D1D', fillH: '#B30000', fg: '#fff', tint: '#FFEAE9' },
  neutral:  { fill: '#242424', fillH: '#4B4B4B', fg: '#fff', tint: '#F8F8F8', border: '#E4E4E4' },
  ai:       { fill: '#6747D2', fillH: '#5236B8', fg: '#fff', tint: '#F5F2FF' },
};

export function Button({
  children, variant = 'fill', color = 'positive', size = 'md',
  leadingIcon, trailingIcon, onClick, disabled, fullWidth, style, type = 'button',
}: {
  children?: React.ReactNode;
  variant?: BtnVariant;
  color?: BtnColor;
  size?: BtnSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit' | 'reset';
}) {
  const [hover, setHover] = useState(false);
  const palette = palettes[color];
  const sizeStyle = btnSizes[size];

  let visual: React.CSSProperties = {};
  if (disabled) {
    visual = { background: variant === 'fill' ? '#E4E4E4' : 'transparent', color: '#BBB', borderColor: variant === 'outline' ? '#E4E4E4' : 'transparent', cursor: 'not-allowed' };
  } else if (variant === 'fill') {
    visual = { background: hover ? palette.fillH : palette.fill, color: palette.fg };
  } else if (variant === 'outline') {
    visual = { background: hover ? palette.tint : 'transparent', color: palette.fill, borderColor: palette.border || palette.fill };
  } else {
    visual = { background: hover ? palette.tint : 'transparent', color: palette.fill };
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'var(--font-body)', fontWeight: 600, lineHeight: '20px',
        border: '1px solid transparent', borderRadius: 'var(--radius-xs)',
        cursor: 'pointer', transition: 'all 200ms var(--ease-out)', whiteSpace: 'nowrap',
        width: fullWidth ? '100%' : 'auto',
        ...sizeStyle, ...visual, ...style,
      }}
    >
      {leadingIcon}
      {children && <span>{children}</span>}
      {trailingIcon}
    </button>
  );
}

type ChipColor = 'positive' | 'negative' | 'warning' | 'info' | 'ai' | 'neutral';

export function Chip({
  children, variant = 'subtle', color = 'neutral', leadingIcon, onRemove, size = 'md',
}: {
  children?: React.ReactNode;
  variant?: 'subtle' | 'fill';
  color?: ChipColor;
  leadingIcon?: React.ReactNode;
  onRemove?: () => void;
  size?: 'sm' | 'md';
}) {
  const chipPalettes: Record<ChipColor, { sub: { bg: string; fg: string }; fill: { bg: string; fg: string } }> = {
    positive: { sub: { bg: '#F6FDE9', fg: '#067A46' }, fill: { bg: '#067A46', fg: '#fff' } },
    negative: { sub: { bg: '#FFEAE9', fg: '#B30000' }, fill: { bg: '#DB1D1D', fg: '#fff' } },
    warning:  { sub: { bg: '#FFECD3', fg: '#A43700' }, fill: { bg: '#EF670A', fg: '#fff' } },
    info:     { sub: { bg: '#E9FAFF', fg: '#001DB2' }, fill: { bg: '#1268FF', fg: '#fff' } },
    ai:       { sub: { bg: '#F5F2FF', fg: '#5236B8' }, fill: { bg: '#6747D2', fg: '#fff' } },
    neutral:  { sub: { bg: '#EEEEEE', fg: '#242424' }, fill: { bg: '#242424', fg: '#fff' } },
  };
  const tone = variant === 'fill' ? chipPalettes[color].fill : chipPalettes[color].sub;
  const h = size === 'sm' ? 24 : 28;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, height: h,
      padding: '0 10px', borderRadius: 336, background: tone.bg, color: tone.fg,
      font: '600 13px/16px var(--font-body)',
    }}>
      {leadingIcon}
      {children}
      {onRemove && (
        <span onClick={onRemove} style={{ cursor: 'pointer', display: 'inline-flex', opacity: 0.8, marginLeft: 2 }}>
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </span>
  );
}

export function Card({
  children, variant = 'elevated', selected, onClick, style,
}: {
  children?: React.ReactNode;
  variant?: 'filled' | 'elevated' | 'outlined';
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}) {
  const v: React.CSSProperties = {
    filled:   { background: '#F8F8F8' },
    elevated: { boxShadow: '0 2px 4px rgba(36,36,36,.08)' },
    outlined: { border: '1px solid #E4E4E4' },
  }[variant];
  const sel: React.CSSProperties = selected ? { border: '2px solid #067A46', padding: 15 } : {};

  return (
    <div onClick={onClick} style={{
      background: '#fff', borderRadius: 'var(--radius-sm)', padding: 16,
      transition: 'all 200ms var(--ease-out)', cursor: onClick ? 'pointer' : 'default',
      ...v, ...sel, ...style,
    }}>
      {children}
    </div>
  );
}

export function Field({
  label, helpText, error, children, style,
}: {
  label?: string;
  helpText?: string;
  error?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && <label style={{ font: '600 13px/20px var(--font-body)', color: '#242424' }}>{label}</label>}
      {children}
      {(helpText || error) && (
        <div style={{ font: '400 12px/16px var(--font-body)', color: error ? '#DB1D1D' : '#676767' }}>
          {error || helpText}
        </div>
      )}
    </div>
  );
}

export function SageInput({
  value, onChange, placeholder, leadingIcon, error, ...rest
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  leadingIcon?: React.ReactNode;
  error?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'center', height: 40, padding: '0 12px', gap: 8,
      borderRadius: 4, background: '#fff',
      border: `1px solid ${error ? '#DB1D1D' : focus ? '#067A46' : '#E4E4E4'}`,
      boxShadow: focus ? `0 0 0 3px ${error ? 'rgba(219,29,29,.18)' : 'rgba(6,122,70,.18)'}` : 'none',
    }}>
      {leadingIcon && <span style={{ color: '#676767' }}>{leadingIcon}</span>}
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ flex: 1, border: 0, outline: 'none', background: 'transparent', font: '400 14px/20px var(--font-body)', color: '#242424' }}
        {...rest}
      />
    </div>
  );
}

export function SageSelect({
  value, onChange, options, placeholder, error, ...rest
}: {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: boolean;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>) {
  const [focus, setFocus] = useState(false);
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        display: 'block', width: '100%', height: 40, padding: '0 12px',
        borderRadius: 4, background: '#fff',
        border: `1px solid ${error ? '#DB1D1D' : focus ? '#067A46' : '#E4E4E4'}`,
        boxShadow: focus ? `0 0 0 3px ${error ? 'rgba(219,29,29,.18)' : 'rgba(6,122,70,.18)'}` : 'none',
        font: '400 14px/20px var(--font-body)', color: value ? '#242424' : '#676767',
        cursor: 'pointer', outline: 'none', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 16 16' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%23676767' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: 36,
      }}
      {...rest}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function Alert({
  tone = 'info', title, children, leadingIcon,
}: {
  tone?: 'positive' | 'info' | 'warning' | 'negative' | 'ai';
  title?: string;
  children?: React.ReactNode;
  leadingIcon?: string;
}) {
  const alertStyles: Record<string, { bg: string; fg: string; icon: string }> = {
    positive: { bg: '#F6FDE9', fg: '#067A46', icon: '✓' },
    info:     { bg: '#E9FAFF', fg: '#001DB2', icon: 'i' },
    warning:  { bg: '#FFECD3', fg: '#A43700', icon: '!' },
    negative: { bg: '#FFEAE9', fg: '#B30000', icon: '×' },
    ai:       { bg: '#F5F2FF', fg: '#5236B8', icon: '✦' },
  };
  const s = alertStyles[tone];
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '12px 16px',
      background: s.bg, color: '#242424',
      borderLeft: `4px solid ${s.fg}`, borderRadius: 'var(--radius-sm)',
    }}>
      <span style={{
        width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
        background: s.fg, color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        font: '700 12px/12px var(--font-body)', marginTop: 2,
      }}>{leadingIcon || s.icon}</span>
      <div>
        {title && <div style={{ font: '600 14px/20px var(--font-body)' }}>{title}</div>}
        {children && <div style={{ font: '400 13px/18px var(--font-body)', color: '#4B4B4B' }}>{children}</div>}
      </div>
    </div>
  );
}
