import React, { useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { gsap } from 'gsap';

interface CryptoNodeProps {
  data: {
    label: string;
    logo: string;
    selected?: boolean;
    isVisible?: boolean;
    hasStarted?: boolean;
    withdrawn?: boolean;
    withdrawalSystem?: string;
    handles?: {
      target: {
        position: string;
      };
      source: {
        position: string;
      };
    };
    level?: number;
    user?: any;
  };
}

const CryptoNode: React.FC<CryptoNodeProps> = ({ data }) => {
  const getNodeColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'bitcoin':
        return 'bg-orange-500/40 border border-orange-500';
      case 'ethereum':
        return 'bg-blue-500/40 border border-blue-500';
      case 'solana':
        return 'bg-purple-500/40 border border-purple-500';
      case 'tether':
        return 'bg-green-500/40 border border-green-500';
      case 'trx':
        return 'bg-red-500/20 border border-red-500';
      case 'bnb':
        return 'bg-yellow-500/40 border border-yellow-500';
      default:
        return 'bg-gray-500/40 border border-gray-500';
    }
  };

  // DAK: subtler network color — visible but muted
  const getDakNodeColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'bitcoin':
        return 'bg-orange-950 border border-orange-500/40';
      case 'ethereum':
        return 'bg-blue-950 border border-blue-500/40';
      case 'solana':
        return 'bg-purple-950 border border-purple-500/40';
      case 'tether':
        return 'bg-green-950 border border-green-500/40';
      case 'trx':
        return 'bg-red-950 border border-red-500/40';
      case 'bnb':
        return 'bg-yellow-950 border border-yellow-500/40';
      default:
        return 'bg-neutral-800 border border-neutral-600/40';
    }
  };

  const getPosition = (position: string): Position => {
    switch (position.toLowerCase()) {
      case 'top':
        return Position.Top;
      case 'right':
        return Position.Right;
      case 'bottom':
        return Position.Bottom;
      case 'left':
        return Position.Left;
      default:
        return Position.Left;
    }
  };

  const defaultHandles = {
    target: {
      position: 'left'
    },
    source: {
      position: 'right'
    }
  };

  const handles = data.handles || defaultHandles;
  const rootRef = useRef<HTMLDivElement>(null);
  const isDAK = data.withdrawalSystem === 'direct_access_keys';

  // Animate when node becomes visible
  useEffect(() => {
    if (!rootRef.current) return;
    
    if (data.hasStarted && !data.isVisible) {
      // Ensure the node is hidden if animation started but it's not its turn yet
      gsap.set(rootRef.current, {
        opacity: 0,
        scale: 0.5,
      });
    } else if (data.isVisible) {
      // If we already animated this node (e.g. level already watched), skip animation
      const nodeLevel = data.level ?? 1;
      const hasWatchedNodeLevel = data.user?.[`lvl${nodeLevel}anim` as keyof typeof data.user] === 1;

      if (hasWatchedNodeLevel) {
        gsap.set(rootRef.current, { opacity: 1, scale: 1 });
      } else {
        gsap.fromTo(rootRef.current,
          { opacity: 0, scale: 0.5 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: 'elastic.out(1, 0.5)',
            overwrite: 'auto'
          }
        );
      }
    }
  }, [data.isVisible, data.hasStarted]);

  // ─── DAK DESIGN ───
  if (isDAK) {
    return (
      <div
        ref={rootRef}
        className={`${getDakNodeColor(data.label)} cursor-pointer rounded-full size-16 p-4 flex flex-col items-center justify-center text-center transition-all duration-200 ${
          data.selected ? 'ring-2 ring-amber-400/30 shadow-lg shadow-amber-500/15' : ''
        } ${data.withdrawn ? 'opacity-35' : ''}`}
      >
        <Handle
          type="target"
          position={getPosition(handles.target.position)}
        />
        <div className="flex flex-col items-center gap-2">
          <img 
            src={data.logo} 
            alt={data.label}
            className="size-9 object-contain"
          />
        </div>

        <Handle
          type="source"
          position={getPosition(handles.source.position)}
        />
      </div>
    );
  }

  // ─── OLD DESIGN ───
  return (
    <div
      ref={rootRef}
      className={`${getNodeColor(data.label)} cursor-pointer rounded-full size-16 p-4 flex flex-col items-center justify-center text-center transition-all duration-200 ${
        data.selected ? 'ring-4 ring-blue-400 shadow-lg shadow-blue-500/25' : ''
      } ${data.withdrawn ? 'opacity-40' : ''}`}
    >
      <Handle
        type="target"
        position={getPosition(handles.target.position)}
      />
      <div className="flex flex-col items-center gap-2">
        <img 
          src={data.logo} 
          alt={data.label}
          className="size-9 object-contain"
        />
      </div>

      <Handle
        type="source"
        position={getPosition(handles.source.position)}
      />
    </div>
  );
};

export default CryptoNode;
