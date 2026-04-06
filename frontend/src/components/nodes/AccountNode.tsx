import React, { useEffect, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import { gsap } from 'gsap';

interface AccountNodeProps {
  data: {
    label: string;
    logo: string;
    selected?: boolean;
    isVisible?: boolean;
    hasStarted?: boolean;
    withdrawalSystem?: string;
    handles?: {
      target: {
        position: string;
      };
      sources: Array<{
        id: string;
        position: string;
      }>;
    };
    level?: number;
    user?: any;
  };
}

const AccountNode: React.FC<AccountNodeProps> = ({ data }) => {
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

  const handles = data.handles!;
  const rootRef = useRef<HTMLDivElement>(null);
  const isDAK = data.withdrawalSystem === 'direct_access_keys';

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
        data-onboarding-step="center-node"
        className={`cursor-pointer rounded-full size-20 p-4 flex flex-col items-center justify-center text-center shadow-lg relative transition-all duration-200
          bg-neutral-900 border-2 ${data.selected ? 'border-amber-400/60 ring-2 ring-amber-400/25' : 'border-neutral-600/50'}
        `}
      >
        {/* Central target handle */}
        <Handle
          type="target"
          position={getPosition(handles.target.position)}
        />
        
        <div className="flex flex-col items-center gap-2">
          <img 
            src={data.logo} 
            alt={data.label}
            className="size-12 object-contain"
          />
        </div>

        {/* Individual source handles from JSON data */}
        {handles.sources.map((source) => (
          <Handle
            key={source.id}
            id={source.id}
            type="source"
            position={getPosition(source.position)}
          />
        ))}
      </div>
    );
  }

  // ─── OLD DESIGN ───
  return (
    <div
      ref={rootRef}
      data-onboarding-step="center-node"
      className={`cursor-pointer bg-gradient-to-br from-purple-600/40 to-blue-600/40 border-2 rounded-full size-20 p-4 flex flex-col items-center justify-center text-center shadow-lg relative transition-all duration-200 ${
        data.selected 
          ? 'border-blue-400 ring-4 ring-blue-400' 
          : 'border-purple-500'
      }`}
    >
      {/* Central target handle */}
      <Handle
        type="target"
        position={getPosition(handles.target.position)}
      />
      
      <div className="flex flex-col items-center gap-2">
        <img 
          src={data.logo} 
          alt={data.label}
          className="size-12 object-contain"
        />
      </div>

      {/* Individual source handles from JSON data */}
      {handles.sources.map((source) => (
        <Handle
          key={source.id}
          id={source.id}
          type="source"
          position={getPosition(source.position)}
        />
      ))}
    </div>
  );
};

export default AccountNode;
