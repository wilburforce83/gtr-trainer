import type { ComponentProps } from 'react';

interface Props extends ComponentProps<'a'> {
  label?: string;
  variant?: 'solid' | 'outline';
}

const KOFI_URL = 'https://ko-fi.com/willshearer';

export default function SupportButton({ label = 'Support on Ko-fi', variant = 'outline', className = '', ...rest }: Props) {
  return (
    <a
      href={KOFI_URL}
      target="_blank"
      rel="noreferrer"
      className={`support-button support-button--${variant} ${className}`.trim()}
      {...rest}
    >
      <span aria-hidden="true">☕</span>
      <span>{label}</span>
    </a>
  );
}
