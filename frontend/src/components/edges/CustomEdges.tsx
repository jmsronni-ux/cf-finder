import React from 'react';
import {
  BaseEdge,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
} from 'reactflow';

// Default config values
const DEFAULTS = {
  pathShape: 'bezier',
  dashEnabled: false,
  dashLength: 8,
  dashGap: 4,
  dashAnimation: false,
  dashAnimationSpeed: 1,
  dotEnabled: false,
  dotShape: 'circle',
  dotSize: 4,
  dotSpeed: 2,
  dotColor: '',
  dotCustomPath: '',
  dotBounce: false,
  glowEnabled: false,
  glowIntensity: 0.15,
  glowSpread: 4,
};

// SVG shape renderers for the flowing dot
function DotShape({ shape, size, color, filterId, customPath }: { shape: string; size: number; color: string; filterId: string; customPath?: string }) {
  const common = { fill: color, filter: `url(#${filterId})` };
  const s = size;

  switch (shape) {
    case 'square':
      return <rect x={-s} y={-s} width={s * 2} height={s * 2} rx={1} {...common} />;
    case 'diamond':
      return <rect x={-s} y={-s} width={s * 2} height={s * 2} rx={1} transform={`rotate(45)`} {...common} />;
    case 'triangle':
      return <polygon points={`0,${-s} ${s},${s} ${-s},${s}`} {...common} />;
    case 'star': {
      const outer = s;
      const inner = s * 0.4;
      const points = Array.from({ length: 5 }, (_, i) => {
        const aOuter = (i * 72 - 90) * Math.PI / 180;
        const aInner = ((i * 72) + 36 - 90) * Math.PI / 180;
        return `${Math.cos(aOuter) * outer},${Math.sin(aOuter) * outer} ${Math.cos(aInner) * inner},${Math.sin(aInner) * inner}`;
      }).join(' ');
      return <polygon points={points} {...common} />;
    }
    case 'ring':
      return (
        <>
          <circle r={s} {...common} />
          <circle r={s * 0.5} fill="#0f0f0f" />
        </>
      );
    case 'arrow': {
      return <polygon points={`${s},0 ${-s},${-s * 0.7} ${-s * 0.3},0 ${-s},${s * 0.7}`} {...common} />;
    }
    case 'custom': {
      const scale = s / 10;
      return (
        <g transform={`scale(${scale})`}>
          <path d={customPath || 'M0,-10 L10,10 L-10,10 Z'} fill={color} filter={`url(#${filterId})`} />
        </g>
      );
    }
    case 'circle':
    default:
      return <circle r={s} {...common} />;
  }
}

function getPathForShape(
  shape: string,
  props: { sourceX: number; sourceY: number; targetX: number; targetY: number; sourcePosition: any; targetPosition: any }
): string {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition } = props;

  switch (shape) {
    case 'straight': {
      const [path] = getStraightPath({ sourceX, sourceY, targetX, targetY });
      return path;
    }
    case 'step': {
      const [path] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        borderRadius: 0,
      });
      return path;
    }
    case 'smoothstep': {
      const [path] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
      });
      return path;
    }
    case 'bezier':
    default: {
      const [path] = getBezierPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
      });
      return path;
    }
  }
}

export function ConfigurableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}: any) {
  // Merge data with defaults
  const cfg = { ...DEFAULTS, ...(data || {}) };
  const stroke = style?.stroke || '#6b7280';
  const strokeWidth = style?.strokeWidth || 2;

  const edgePath = getPathForShape(cfg.pathShape, {
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  });

  // Build style overrides
  const edgeStyle: React.CSSProperties = { ...style };

  if (cfg.dashEnabled) {
    edgeStyle.strokeDasharray = `${cfg.dashLength} ${cfg.dashGap}`;
    if (cfg.dashAnimation) {
      edgeStyle.animation = `configurableEdgeDash ${cfg.dashAnimationSpeed}s linear infinite`;
    }
  }

  // Unique glow filter ID per edge to avoid collisions
  const glowFilterId = `glow-${id}`;

  return (
    <>
      {/* Inject keyframe for dash animation */}
      {cfg.dashEnabled && cfg.dashAnimation && (
        <foreignObject width="0" height="0" overflow="visible">
          <style>{`
            @keyframes configurableEdgeDash {
              to { stroke-dashoffset: -${cfg.dashLength + cfg.dashGap}px; }
            }
          `}</style>
        </foreignObject>
      )}

      {/* Glow layers */}
      {cfg.glowEnabled && (
        <>
          <path
            d={edgePath}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth + cfg.glowSpread * 2}
            strokeOpacity={cfg.glowIntensity * 0.5}
            strokeLinecap="round"
          />
          <path
            d={edgePath}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth + cfg.glowSpread}
            strokeOpacity={cfg.glowIntensity}
            strokeLinecap="round"
          />
        </>
      )}

      {/* Core edge */}
      <BaseEdge id={id} path={edgePath} style={edgeStyle} markerEnd={markerEnd} />

      {/* Flowing dot */}
      {cfg.dotEnabled && (
        <>
          <g>
            <animateMotion
              dur={`${cfg.dotSpeed}s`}
              repeatCount="indefinite"
              path={edgePath}
              {...(cfg.dotBounce ? {
                keyPoints: "0;1;0",
                keyTimes: "0;0.5;1",
                calcMode: "linear",
              } : {})}
            />
            <DotShape
              shape={cfg.dotShape}
              size={cfg.dotSize}
              color={cfg.dotColor || stroke}
              filterId={glowFilterId}
              customPath={cfg.dotCustomPath}
            />
          </g>
          {/* Second trailing dot for bounce mode (creates a "busy transfer" feel) */}
          {cfg.dotBounce && (
            <g opacity={0.4}>
              <animateMotion
                dur={`${cfg.dotSpeed}s`}
                repeatCount="indefinite"
                path={edgePath}
                keyPoints="1;0;1"
                keyTimes="0;0.5;1"
                calcMode="linear"
              />
              <DotShape
                shape={cfg.dotShape}
                size={cfg.dotSize * 0.7}
                color={cfg.dotColor || stroke}
                filterId={glowFilterId}
                customPath={cfg.dotCustomPath}
              />
            </g>
          )}
          <defs>
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </>
      )}
    </>
  );
}
