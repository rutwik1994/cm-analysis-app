"use client";
import React from "react";
import { Button } from "./primitives";
import { Icon } from "./icons";

interface HeaderProps {
  breadcrumbs?: string[];
  title: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  onAskAi?: () => void;
  dark?: boolean;
}

export function SageHeader({ breadcrumbs = [], title, subtitle, primaryAction, onAskAi, dark }: HeaderProps) {
  const palette = dark
    ? { bg: '#00178C', fg: '#FFF', muted: 'rgba(255,255,255,.65)', border: 'rgba(255,255,255,.10)' }
    : { bg: '#FFF',    fg: '#242424', muted: '#676767', border: '#EEE' };

  return (
    <header style={{
      background: palette.bg, color: palette.fg,
      borderBottom: `1px solid ${palette.border}`,
      padding: '20px 32px',
    }}>
      {breadcrumbs.length > 0 && (
        <div style={{ font: '400 13px/16px var(--font-body)', color: palette.muted, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span style={{ opacity: 0.4 }}>/</span>}
              <span style={{ color: i === breadcrumbs.length - 1 ? palette.fg : palette.muted }}>{b}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 24 }}>
        <div>
          <h1 style={{ font: '500 32px/40px var(--font-display)', margin: 0, color: palette.fg }}>{title}</h1>
          {subtitle && <div style={{ font: '400 14px/20px var(--font-body)', color: palette.muted, marginTop: 4 }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onAskAi && (
            <Button variant="outline" color="ai" size="md" onClick={onAskAi}
              leadingIcon={<Icon name="ai" size={16} />}>
              Ask Sage
            </Button>
          )}
          {primaryAction}
        </div>
      </div>
    </header>
  );
}
