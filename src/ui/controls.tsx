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

export function Swatches({ colors, value, onChange, label }: { colors: string[]; value?: string; onChange: (c: string) => void; label?: string }) {
  return (
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
      <label className="swatch swatch--custom" title="Özel renk">
        <input type="color" value={value ?? '#ffffff'} onChange={(e) => onChange(e.target.value)} />
        <span>+</span>
      </label>
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
