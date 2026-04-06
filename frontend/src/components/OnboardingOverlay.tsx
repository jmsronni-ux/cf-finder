import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useOnboarding, TUTORIAL_STEPS, PHASE_1_STEPS, PHASE_2_STEPS } from '../contexts/OnboardingContext';
import './onboarding.css';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

const PADDING = 10; // px padding around highlighted element
const TOOLTIP_GAP = 16; // gap from the highlighted element

const OnboardingOverlay: React.FC = () => {
  const {
    isActive,
    currentPhase,
    currentStep,
    currentStepData,
    totalSteps,
    phase2Resuming,
    nextStep,
    prevStep,
    dismiss,
    completePhase,
  } = useOnboarding();

  const navigate = useNavigate();
  const location = useLocation();
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{
    top: number;
    left: number;
    arrow: string;
    arrowX?: string;
    arrowY?: string;
  }>({ top: 0, left: 0, arrow: 'top' });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const observerRef = useRef<ResizeObserver | null>(null);
  const animFrameRef = useRef<number>(0);
  const retryRef = useRef<NodeJS.Timeout | null>(null);

  // Determine if current page matches the current step's page
  const currentPage = location.pathname.includes('/dashboard') ? 'dashboard' : 'profile';
  const stepBelongsToCurrentPage = currentStepData?.page === currentPage;

  // Find and measure the target element
  const measureTarget = useCallback(() => {
    if (!currentStepData) return;

    const el = document.querySelector(
      `[data-onboarding-step="${currentStepData.target}"]`
    ) as HTMLElement | null;

    if (!el) {
      setTargetRect(null);
      return;
    }

    const rect = el.getBoundingClientRect();
    setTargetRect({
      top: rect.top - PADDING,
      left: rect.left - PADDING,
      width: rect.width + PADDING * 2,
      height: rect.height + PADDING * 2,
      bottom: rect.bottom + PADDING,
      right: rect.right + PADDING,
    });
  }, [currentStepData]);

  // Position tooltip relative to the target
  useEffect(() => {
    if (!targetRect || !currentStepData) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tooltipWidth = Math.min(360, vw - 32);
    const tooltipHeight = 220; // estimate

    let pos = currentStepData.position || 'auto';

    if (pos === 'auto') {
      // Pick the side with most space
      const spaceRight = vw - targetRect.right;
      const spaceLeft = targetRect.left;
      const spaceBottom = vh - targetRect.bottom;
      const spaceTop = targetRect.top;
      const maxSpace = Math.max(spaceRight, spaceLeft, spaceBottom, spaceTop);

      if (maxSpace === spaceBottom) pos = 'bottom';
      else if (maxSpace === spaceTop) pos = 'top';
      else if (maxSpace === spaceRight) pos = 'right';
      else pos = 'left';
    }

    let top = 0;
    let left = 0;
    let arrow = 'top';

    switch (pos) {
      case 'bottom':
        top = targetRect.bottom + TOOLTIP_GAP;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrow = 'bottom';
        break;
      case 'top':
        top = targetRect.top - tooltipHeight - TOOLTIP_GAP;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrow = 'top';
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + TOOLTIP_GAP;
        arrow = 'right';
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - tooltipWidth - TOOLTIP_GAP;
        arrow = 'left';
        break;
    }

    // Apply optional Y offset
    if (currentStepData.offsetY) {
      top += currentStepData.offsetY;
    }

    const originalLeft = left;
    const originalTop = top;

    // Clamp to viewport
    left = Math.max(16, Math.min(vw - tooltipWidth - 16, left));
    top = Math.max(16, Math.min(vh - tooltipHeight - 16, top));

    // Calculate arrow shift if clamped
    let arrowX = '50%';
    let arrowY = '50%';

    if (arrow === 'top' || arrow === 'bottom') {
      const shiftX = originalLeft - left;
      arrowX = `calc(50% + ${shiftX}px)`;
    } else {
      const shiftY = originalTop - top;
      arrowY = `calc(50% + ${shiftY}px)`;
    }

    setTooltipPos({ top, left, arrow, arrowX, arrowY });
  }, [targetRect, currentStepData]);

  // Lock body scroll when overlay is active
  useEffect(() => {
    if (isActive && stepBelongsToCurrentPage) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isActive, stepBelongsToCurrentPage]);

  // Auto-scroll target element into view when step changes
  useEffect(() => {
    if (!isActive || !currentStepData || !stepBelongsToCurrentPage) return;

    const scrollToTarget = () => {
      const el = document.querySelector(
        `[data-onboarding-step="${currentStepData.target}"]`
      ) as HTMLElement | null;

      if (!el) return false;

      const rect = el.getBoundingClientRect();
      const elementMidY = rect.top + window.scrollY + rect.height / 2;
      const viewportMidY = window.innerHeight / 2;
      const scrollOffset = currentStepData.scrollOffsetY ?? 0;

      window.scrollTo({
        top: elementMidY - viewportMidY + scrollOffset,
        behavior: 'smooth',
      });

      return true;
    };

    // Try immediately, then retry if element isn't mounted yet
    if (!scrollToTarget()) {
      const scrollRetry = setInterval(() => {
        if (scrollToTarget()) clearInterval(scrollRetry);
      }, 300);
      // Give up after 6 seconds
      setTimeout(() => clearInterval(scrollRetry), 6000);
    }
  }, [isActive, currentStep, currentStepData, stepBelongsToCurrentPage]);

  // Observe target element for size/position changes
  useEffect(() => {
    if (!isActive || !currentStepData || !stepBelongsToCurrentPage) return;
    // Don't start searching while Phase 2 is resuming (viewport still animating).
    // When phase2Resuming flips to false, this effect re-runs with fresh retries.
    if (phase2Resuming) return;

    // Clear previous retry timers
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }

    // Initial measurement with retry for elements that haven't mounted yet
    const tryFind = (attempt: number) => {
      measureTarget();
      const el = document.querySelector(
        `[data-onboarding-step="${currentStepData.target}"]`
      );
      if (!el && attempt < 20) {
        retryRef.current = setTimeout(() => tryFind(attempt + 1), 300);
      } else if (el) {
        // Set up observer
        observerRef.current = new ResizeObserver(() => {
          animFrameRef.current = requestAnimationFrame(measureTarget);
        });
        observerRef.current.observe(el);
      }
    };

    tryFind(0);

    // Scroll events: measure synchronously so the highlight doesn't lag
    const handleScroll = () => {
      measureTarget();
    };
    // Resize events can still use RAF since they're less frequent
    const handleResize = () => {
      animFrameRef.current = requestAnimationFrame(measureTarget);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      observerRef.current?.disconnect();
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (retryRef.current) {
        clearTimeout(retryRef.current);
      }
    };
  }, [isActive, currentStepData, stepBelongsToCurrentPage, measureTarget, phase2Resuming]);

  // ESC key to dismiss
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, dismiss]);

  // Handle "Next" button click
  const handleNext = useCallback(() => {
    if (!currentStepData) return;

    // Complete-phase: ends the current phase cleanly
    if (currentStepData.action === 'complete-phase') {
      completePhase();
      return;
    }

    if (currentStepData.action === 'navigate' && currentStepData.navigateTo) {
      setIsTransitioning(true);
      nextStep();
      navigate(currentStepData.navigateTo);
      setTimeout(() => setIsTransitioning(false), 500);
      return;
    }

    setIsTransitioning(true);
    nextStep();
    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentStepData, nextStep, navigate, completePhase]);

  // Listen for external auto-advance events (e.g. from AddWalletPopup)
  useEffect(() => {
    const handleAutoAdvance = () => {
      // Small delay just to allow the form submission to visually complete
      setTimeout(() => {
        handleNext();
      }, 500);
    };

    window.addEventListener('onboarding-auto-advance', handleAutoAdvance);
    return () => window.removeEventListener('onboarding-auto-advance', handleAutoAdvance);
  }, [handleNext]);

  // Handle "Previous" button click
  const handlePrev = useCallback(() => {
    if (currentStep <= 1) return;

    const prevStepData = TUTORIAL_STEPS[currentStep - 2]; // 0-indexed
    const currentPageNow = location.pathname.includes('/dashboard') ? 'dashboard' : 'profile';

    setIsTransitioning(true);
    prevStep();

    // Navigate if going back to a different page
    if (prevStepData.page !== currentPageNow) {
      const dest = prevStepData.page === 'profile' ? '/profile' : '/dashboard';
      navigate(dest);
    }

    setTimeout(() => setIsTransitioning(false), 300);
  }, [currentStep, prevStep, navigate, location.pathname]);

  // Generate clip-path polygon for the mask with cutout
  const getClipPath = () => {
    if (!targetRect) return 'none';

    const { top, left, width, height } = targetRect;
    const r = 12; // border radius of cutout

    // Full viewport polygon with a rectangular cutout (using rounded inset approach via clip-path)
    // We use a polygon approach: outer rectangle → inner cutout (counterclockwise)
    return `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${left + r}px ${top}px,
      ${left}px ${top + r}px,
      ${left}px ${top + height - r}px,
      ${left + r}px ${top + height}px,
      ${left + width - r}px ${top + height}px,
      ${left + width}px ${top + height - r}px,
      ${left + width}px ${top + r}px,
      ${left + width - r}px ${top}px,
      ${left + r}px ${top}px
    )`;
  };

  // Don't render anything if not active
  if (!isActive || !currentStepData) return null;

  // Suppress overlay while FlowCanvas is zooming to the node after a Phase 2 page refresh
  if (phase2Resuming) return null;

  // If current step is for a different page, don't render overlay
  // (the redirect logic in Dashboard/UserProfile will handle navigation)
  if (!stepBelongsToCurrentPage) return null;

  const isPhaseEnd = currentStepData.action === 'complete-phase';
  // Only show "waiting" state when fingerprint nodes truly don't exist yet (initial animation).
  // During resume, nodes exist in DOM but aren't tagged with data-onboarding-step yet while
  // the viewport animates — in that case we hide the overlay entirely until the tag is set.
  const isWaiting = !targetRect
    && currentStepData.target === 'fingerprint-node'
    && !document.querySelector('.react-flow__node-fingerprintNode');

  // Phase-aware step display
  const stepIndexInPhase = currentPhase === 1
    ? currentStep
    : currentStep - PHASE_1_STEPS.length;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Dark mask with spotlight cutout */}
        <div
          className={`onboarding-mask ${targetRect ? 'active' : ''}`}
          style={{
            clipPath: targetRect ? getClipPath() : 'none',
            background: targetRect ? undefined : 'rgba(0,0,0,0.78)',
          }}
          onClick={(e) => {
            // Clicking the mask (outside spotlight) does nothing
            e.stopPropagation();
          }}
        />

        {/* Pulsing highlight ring */}
        {targetRect && (
          <div
            className="onboarding-highlight-ring"
            style={{
              top: targetRect.top,
              left: targetRect.left,
              width: targetRect.width,
              height: targetRect.height,
            }}
          />
        )}

        {/* Tooltip */}
        {!isTransitioning && (targetRect || isWaiting) && (
          <motion.div
            className={`onboarding-tooltip ${isWaiting ? 'onboarding-waiting' : ''}`}
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={
              isWaiting
                ? {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                  }
                : {
                    top: tooltipPos.top,
                    left: tooltipPos.left,
                  }
            }
          >
            {/* Arrow */}
            {targetRect && !isWaiting && (
              <div 
                className={`onboarding-arrow arrow-${tooltipPos.arrow}`} 
                style={{
                  left: (tooltipPos.arrow === 'top' || tooltipPos.arrow === 'bottom') ? tooltipPos.arrowX : undefined,
                  top: (tooltipPos.arrow === 'left' || tooltipPos.arrow === 'right') ? tooltipPos.arrowY : undefined
                }}
              />
            )}

            {/* Step badge */}
            <div className="onboarding-step-badge">
              <span className="dot" />
              Step {stepIndexInPhase} of {totalSteps}
            </div>

            {/* Title */}
            <h3 className="onboarding-title">{currentStepData.title}</h3>

            {/* Message */}
            <p className="onboarding-message">
              {isWaiting
                ? 'Waiting for your scan to complete. Nodes will appear on the canvas shortly…'
                : currentStepData.message}
            </p>

            {/* Actions */}
            <div className="onboarding-actions">
              {((currentPhase === 1 && currentStep === 1) || (currentPhase === 2 && stepIndexInPhase === 1)) && (
                <button
                  className="onboarding-btn-skip"
                  onClick={dismiss}
                >
                  Skip tutorial
                </button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flex: 1 }}>
                {((currentPhase === 1 && currentStep > 2) || (currentPhase === 2 && stepIndexInPhase > 1)) && (
                  <button
                    className="onboarding-btn-prev"
                    onClick={handlePrev}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                  </button>
                )}

                {!isWaiting && currentStepData.action !== 'wait-action' && (
                  <button
                    className="onboarding-btn-next"
                    onClick={handleNext}
                  >
                    {isPhaseEnd ? (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Got it!
                      </>
                    ) : currentStepData.action === 'navigate' ? (
                      <>
                        Go to Dashboard
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Progress dots */}
            <div className="onboarding-progress">
              {(currentPhase === 1 ? PHASE_1_STEPS : PHASE_2_STEPS).map((_, i) => (
                <div
                  key={i}
                  className={`onboarding-progress-dot ${
                    i + 1 === stepIndexInPhase
                      ? 'active'
                      : i + 1 < stepIndexInPhase
                      ? 'completed'
                      : ''
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default OnboardingOverlay;
