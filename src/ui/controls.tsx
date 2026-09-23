import { useEffect, useState, type ReactNode } from 'react';

/**
 * Sayısal alan + kaydırıcı. Kaydırıcı sürüklenirken `onChange(v, true)` (geçici),
 * sayısal girişte Enter/odak kaybında `onChange(v, false)` (geri alınabilir) çağrılır.
 * Kaydırma başlangıcında `onBegin` ile geri alma noktası alınır.
 */
export function RangeField({
  label, value, min, max, step = 1, unit = 'cm', onChange, onBegin, disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number, transient: boolean) => void;
  onBegin?: () => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(Math.round(value * 10) / 10));
  useEffect(() => setText(String(Math.round(value * 10) / 10)), [value]);
  const commitText = () => {
    const v = Number(text.replace(',', '.'));
    if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)), false);
    else setText(String(value));
  };
  return (
    <div className={`field ${disabled ? 'is-disabled' : ''}`}>
      <div className="field__row">
        <label className="field__label">{label}</label>
        <span className="field__num">
          <input
            inputMode="decimal"
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
            aria-label={label}
          />
          <em>{unit}</em>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(max, Math.max(min, value))}
        disabled={disabled}
        onPointerDown={onBegin}
        onKeyDown={onBegin}
        onChange={(e) => onChange(Number(e.target.value), true)}
        aria-label={`${label} kaydırıcı`}
      />
    </div>
  );
}

/** Genel renk paleti (ahşap, kumaş, metal ve boya tonları) */
export const FULL_PALETTE = [
  '#ffffff', '#f4f1ec', '#e9e5de', '#e3ddd3', '#d8c6aa', '#c9b08c', '#b7a58c', '#a07c5a', '#8a6a4a', '#6f4e37', '#5a3e2b', '#3b2c21',
  '#f5f5f5', '#d9d9d9', '#b9b6b0', '#8c8f94', '#6d7580', '#58606b', '#4a4f5a', '#3b3b3b', '#2b2b2b', '#1a1a1a',
  '#c9d3cf', '#9fb09a', '#7d8b74', '#6b7b5e', '#3d5a45', '#2f4a3a', '#d6dde6', '#b9c4c9', '#7d98b3', '#3f4a5a', '#2f3b4a', '#27384a',
  '#e9d8cf', '#e0b8a8', '#d19a8a', '#c97b5f', '#a55d4a', '#8a3b30', '#f0d9a0', '#d8b56d', '#c9a45c', '#b07a2c', '#e8c4c4', '#9e7ba8',
];

export function Swatches({ colors, value, onChange, label }: { colors: string[]; value?: string; onChange: (c: string) => void; label?: string }) {
  const [more, setMore] = useState(false);
  const extra = FULL_PALETTE.filter((c) => !colors.includes(c));
  return (
    <div className="swatch-wrap">
    <div className="swatches" role="radiogroup" aria-label={label ?? 'Renk'}>
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          className={`swatch ${value === c ? 'is-active' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
          title={c}
        />
      ))}
      <label className="swatch swatch--custom" title="Özel renk seç">
        <input type="color" value={value ?? '#ffffff'} onChange={(e) => onChange(e.target.value)} />
        <span>+</span>
      </label>
      <button type="button" className="swatch-more" onClick={() => setMore(!more)} aria-expanded={more}>
        {more ? 'Daha az' : 'Tüm renkler'}
      </button>
    </div>
    {more && (
      <div className="swatches swatches--full" role="radiogroup" aria-label={`${label ?? 'Renk'} – tüm renkler`}>
        {extra.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={value === c} className={`swatch swatch--sm ${value === c ? 'is-active' : ''}`} style={{ background: c }} onClick={() => onChange(c)} title={c} />
        ))}
      </div>
    )}
    {value && <span className="swatch-hex">{value.toUpperCase()}</span>}
    </div>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="section">
      <header className="section__head">
        <h3>{title}</h3>
        {actions}
      </header>
      {children}
    </section>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: ReactNode; title?: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} title={o.title} className={value === o.value ? 'is-active' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
