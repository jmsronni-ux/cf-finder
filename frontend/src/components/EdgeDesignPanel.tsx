import React, { useState } from 'react';
import {
  X,
  Zap,
  Circle,
  Sparkles,
  Minus,
  ChevronDown,
} from 'lucide-react';


interface EdgeDesignPanelProps {
  selectedEdge: any;
  onUpdateEdge: (edgeId: string, updates: any) => void;
  onClose: () => void;
}

const PATH_SHAPES = [
  { value: 'bezier', label: 'Bezier' },
  { value: 'straight', label: 'Straight' },
  { value: 'step', label: 'Step' },
  { value: 'smoothstep', label: 'Smooth' },
];



const PRESET_COLORS = ['#6b7280', '#8b5cf6', '#3b82f6', '#22c55e'];

const DOT_SHAPES = [
  { value: 'circle', label: '●' },
  { value: 'square', label: '■' },
  { value: 'diamond', label: '◆' },
  { value: 'triangle', label: '▲' },
  { value: 'star', label: '★' },
  { value: 'arrow', label: '►' },
];

// ─── Reusable slider row ────────────────────────────────────────
const SliderRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', onChange }) => (
  <div className="flex items-center gap-2">
    <span className="text-[10px] text-gray-500 w-14 flex-shrink-0">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="flex-1 h-1 rounded-full appearance-none bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:cursor-pointer"
    />
    <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{value}{unit}</span>
  </div>
);

// ─── Toggle row ─────────────────────────────────────────────────
const ToggleRow: React.FC<{
  label: string;
  icon?: React.ReactNode;
  enabled: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, icon, enabled, onChange }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-8 h-[16px] rounded-full transition-all ${
        enabled
          ? 'bg-cyan-500/40 border border-cyan-500/60'
          : 'bg-white/10 border border-white/15'
      }`}
    >
      <div
        className={`absolute top-[1.5px] w-3 h-3 rounded-full transition-all ${
          enabled
            ? 'left-[calc(100%-0.875rem)] bg-cyan-400 shadow-lg shadow-cyan-400/40'
            : 'left-[2px] bg-gray-500'
        }`}
      />
    </button>
  </div>
);

// ─── Accordion section ──────────────────────────────────────────
const AccordionSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  summary?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}> = ({ title, icon, summary, isOpen, onToggle, children }) => (
  <div className="border-t border-white/5 first:border-t-0">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2.5 group"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="text-gray-500 group-hover:text-gray-400 transition-colors">
          {icon}
        </div>
        <span className="text-[11px] font-medium text-gray-300 group-hover:text-white transition-colors">
          {title}
        </span>
        {!isOpen && summary && (
          <span className="text-[9px] text-gray-600 font-mono truncate ml-1">
            {summary}
          </span>
        )}
      </div>
      <ChevronDown
        size={12}
        className={`text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
      />
    </button>
    {isOpen && (
      <div className="pb-3 space-y-2">
        {children}
      </div>
    )}
  </div>
);

const EdgeDesignPanel: React.FC<EdgeDesignPanelProps> = ({
  selectedEdge,
  onUpdateEdge,
  onClose,
}) => {
  const [openSection, setOpenSection] = useState<string | null>('shape');

  if (!selectedEdge) return null;

  const d = selectedEdge.data || {};
  const currentStroke = selectedEdge.style?.stroke || '#6b7280';
  const currentStrokeWidth = selectedEdge.style?.strokeWidth || 2;

  // Helpers
  const updateData = (updates: Record<string, any>) => {
    onUpdateEdge(selectedEdge.id, {
      data: { ...(selectedEdge.data || {}), ...updates },
    });
  };

  const updateStyle = (updates: Record<string, any>) => {
    onUpdateEdge(selectedEdge.id, {
      style: { ...(selectedEdge.style || {}), ...updates },
    });
  };



  // Ensure we're using configurable type
  const ensureConfigurable = () => {
    if (selectedEdge.type !== 'configurable') {
      onUpdateEdge(selectedEdge.id, { type: 'configurable' });
    }
  };

  const setData = (updates: Record<string, any>) => {
    ensureConfigurable();
    updateData(updates);
  };

  const toggle = (key: string) =>
    setOpenSection((prev) => (prev === key ? null : key));

  // Build summaries for collapsed headers
  const shapeSummary = d.pathShape || 'bezier';
  const strokeSummary = `${currentStrokeWidth}px`;
  const dashSummary = d.dashEnabled ? `${d.dashLength ?? 8}/${d.dashGap ?? 4}${d.dashAnimation ? ' ⚡' : ''}` : 'off';
  const effectsSummary = [
    d.dotEnabled && 'dot',
    d.glowEnabled && 'glow',
  ].filter(Boolean).join(' + ') || 'off';

  return (
    <div className="absolute top-20 right-6 z-30 w-full max-w-[19rem]">
      <div className="relative bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Zap className="text-cyan-400" size={14} />
            <h2 className="text-xs font-semibold text-white">Edit Connection</h2>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-all"
          >
            <X size={12} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="px-4 max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">

          {/* ─── Shape & Marker ─── */}
          <AccordionSection
            title="Shape"
            icon={<Minus size={12} />}
            summary={shapeSummary}
            isOpen={openSection === 'shape'}
            onToggle={() => toggle('shape')}
          >
            <div className="grid grid-cols-4 gap-1">
              {PATH_SHAPES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setData({ pathShape: s.value })}
                  className={`px-1.5 py-1 rounded-md border text-[10px] font-medium text-center transition-all ${
                    (d.pathShape || 'bezier') === s.value
                      ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:border-white/20'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

          </AccordionSection>

          {/* ─── Stroke ─── */}
          <AccordionSection
            title="Stroke"
            icon={<Minus size={12} />}
            summary={strokeSummary}
            isOpen={openSection === 'stroke'}
            onToggle={() => toggle('stroke')}
          >
            {/* Color */}
            <div className="flex items-center gap-1.5">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateStyle({ stroke: color })}
                  className={`w-5 h-5 rounded-md border-2 transition-all hover:scale-110 ${
                    currentStroke === color
                      ? 'border-white shadow-lg shadow-white/10 scale-110'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                value={currentStroke}
                onChange={(e) => updateStyle({ stroke: e.target.value })}
                className="w-5 h-5 rounded-md border-2 border-dashed border-white/20 cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                title="Custom color"
              />
            </div>
            {/* Width */}
            <SliderRow
              label="Width"
              value={currentStrokeWidth}
              min={1}
              max={8}
              step={0.5}
              unit="px"
              onChange={(v) => updateStyle({ strokeWidth: v })}
            />

          </AccordionSection>

          {/* ─── Dash ─── */}
          <AccordionSection
            title="Dash"
            icon={<Minus size={12} />}
            summary={dashSummary}
            isOpen={openSection === 'dash'}
            onToggle={() => toggle('dash')}
          >
            <ToggleRow
              label="Enable"
              enabled={d.dashEnabled || false}
              onChange={(v) => setData({ dashEnabled: v })}
            />
            {d.dashEnabled && (
              <div className="space-y-1.5 mt-1">
                <SliderRow
                  label="Length"
                  value={d.dashLength ?? 8}
                  min={2}
                  max={30}
                  unit="px"
                  onChange={(v) => setData({ dashLength: v })}
                />
                <SliderRow
                  label="Gap"
                  value={d.dashGap ?? 4}
                  min={1}
                  max={20}
                  unit="px"
                  onChange={(v) => setData({ dashGap: v })}
                />
                <ToggleRow
                  label="Animated"
                  icon={<Zap size={10} className="text-gray-500" />}
                  enabled={d.dashAnimation || false}
                  onChange={(v) => setData({ dashAnimation: v })}
                />
                {d.dashAnimation && (
                  <SliderRow
                    label="Speed"
                    value={d.dashAnimationSpeed ?? 1}
                    min={0.2}
                    max={5}
                    step={0.1}
                    unit="s"
                    onChange={(v) => setData({ dashAnimationSpeed: v })}
                  />
                )}
              </div>
            )}
          </AccordionSection>

          {/* ─── Effects (Dot + Glow) ─── */}
          <AccordionSection
            title="Effects"
            icon={<Sparkles size={12} />}
            summary={effectsSummary}
            isOpen={openSection === 'effects'}
            onToggle={() => toggle('effects')}
          >
            {/* Flowing Dot */}
            <ToggleRow
              label="Flowing Dot"
              icon={<Circle size={10} className="text-gray-500" />}
              enabled={d.dotEnabled || false}
              onChange={(v) => setData({ dotEnabled: v })}
            />
            {d.dotEnabled && (
              <div className="space-y-1.5 mt-1 pl-1 border-l border-white/5 ml-1">
                {/* Shape */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-14 flex-shrink-0">Shape</span>
                  <div className="flex gap-1">
                    {DOT_SHAPES.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setData({ dotShape: s.value })}
                        className={`w-6 h-6 rounded-md border text-xs flex items-center justify-center transition-all ${
                          (d.dotShape || 'circle') === s.value
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8'
                        }`}
                        title={s.value}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <SliderRow
                  label="Size"
                  value={d.dotSize ?? 4}
                  min={2}
                  max={10}
                  unit="px"
                  onChange={(v) => setData({ dotSize: v })}
                />
                <SliderRow
                  label="Speed"
                  value={d.dotSpeed ?? 2}
                  min={0.5}
                  max={5}
                  step={0.1}
                  unit="s"
                  onChange={(v) => setData({ dotSpeed: v })}
                />
                {/* Color */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 w-14 flex-shrink-0">Color</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setData({ dotColor: '' })}
                      className={`px-1.5 py-0.5 rounded text-[9px] border transition-all ${
                        !d.dotColor
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      Auto
                    </button>
                    <input
                      type="color"
                      value={d.dotColor || currentStroke}
                      onChange={(e) => setData({ dotColor: e.target.value })}
                      className="w-4 h-4 rounded border border-white/15 cursor-pointer bg-transparent appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Divider between dot & glow */}
            <div className="border-t border-white/5 my-1" />

            {/* Glow */}
            <ToggleRow
              label="Glow"
              icon={<Sparkles size={10} className="text-gray-500" />}
              enabled={d.glowEnabled || false}
              onChange={(v) => setData({ glowEnabled: v })}
            />
            {d.glowEnabled && (
              <div className="space-y-1.5 mt-1 pl-1 border-l border-white/5 ml-1">
                <SliderRow
                  label="Intensity"
                  value={d.glowIntensity ?? 0.15}
                  min={0.05}
                  max={0.5}
                  step={0.01}
                  onChange={(v) => setData({ glowIntensity: v })}
                />
                <SliderRow
                  label="Spread"
                  value={d.glowSpread ?? 4}
                  min={2}
                  max={12}
                  unit="px"
                  onChange={(v) => setData({ glowSpread: v })}
                />
              </div>
            )}
          </AccordionSection>
        </div>
      </div>
    </div>
  );
};

export default EdgeDesignPanel;
