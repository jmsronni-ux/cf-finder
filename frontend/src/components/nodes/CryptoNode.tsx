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
    handles?: {
      target: {
        position: string;
      };
      source: {
        position: string;
      };
    };
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

  // Animate when node becomes visible
  useEffect(() => {
    if (!rootRef.current) return;
    
    if (data.hasStarted && !data.isVisible) {
      // Hide initially
      gsap.set(rootRef.current, {
        opacity: 0,
        scale: 0.5,
      });
    } else if (data.isVisible) {
      // Animate in
      gsap.to(rootRef.current, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: 'elastic.out(1, 0.5)',
      });
    }
  }, [data.isVisible, data.hasStarted]);

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
      {data.withdrawn && (
        <div className="absolute -top-1 -right-1">
          {/* simple visual mark; node is already dimmed */}
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full border border-black/50" />
        </div>
      )}
      <Handle
        type="source"
        position={getPosition(handles.source.position)}
      />
    </div>
  );
};

export default CryptoNode;
