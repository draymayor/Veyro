import { Button } from '@react-email/components';
import type { ReactNode } from 'react';
import { emailTheme } from './theme';

interface EmailButtonProps {
  href: string;
  children: ReactNode;
}

// The one CTA button style used across every template: pill-shaped,
// terracotta fill, white text.
export function EmailButton({ href, children }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={{
        backgroundColor: emailTheme.primary,
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: 600,
        borderRadius: 999,
        padding: '14px 32px',
        textDecoration: 'none',
        display: 'inline-block',
      }}
    >
      {children}
    </Button>
  );
}
