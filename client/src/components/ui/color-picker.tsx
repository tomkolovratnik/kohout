import * as React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';

export const COLOR_PALETTE = [
  // Saturated (Tailwind 500)
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
  // Pastel (Tailwind 300)
  '#fca5a5', '#fdba74', '#fde047', '#86efac', '#5eead4', '#93c5fd', '#a5b4fc', '#c4b5fd', '#f9a8d4',
];

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  colors?: string[];
  className?: string;
}

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ value, onChange, colors = COLOR_PALETTE, className }, ref) => {
    const nativeRef = React.useRef<HTMLInputElement>(null);
    const isCustom = value && !colors.includes(value);

    return (
      <div ref={ref} className={cn('flex flex-wrap gap-1.5', className)}>
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            className={cn(
              'h-7 w-7 rounded-full border-2 transition-all cursor-pointer',
              value === color
                ? 'border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
                : 'border-transparent hover:border-muted-foreground/50'
            )}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            title={color}
          />
        ))}
        <button
          type="button"
          className={cn(
            'h-7 w-7 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center',
            isCustom
              ? 'border-foreground ring-2 ring-primary ring-offset-2 ring-offset-background'
              : 'border-dashed border-muted-foreground/50 hover:border-muted-foreground'
          )}
          style={isCustom ? { backgroundColor: value } : undefined}
          onClick={() => nativeRef.current?.click()}
          title="Vlastní barva"
        >
          {!isCustom && <Plus className="h-3 w-3 text-muted-foreground" />}
        </button>
        <input
          ref={nativeRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
      </div>
    );
  }
);
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
