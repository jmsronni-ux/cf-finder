import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// ─── Tutorial Step Definitions ───
export interface TutorialStep {
  id: number;
  phase: 1 | 2;
  page: 'profile' | 'dashboard';
  target: string;            // data-onboarding-step attribute value
  title: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  action?: 'next' | 'navigate' | 'wait-node' | 'wait-action' | 'complete-phase';
  navigateTo?: string;
  offsetY?: number;
  scrollOffsetY?: number; // extra px to shift the auto-scroll (positive = scroll further down)
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  // ── Phase 1: Initial onboarding ──
  {
    id: 1,
    phase: 1,
    page: 'profile',
    target: 'verification',
    title: 'Set Up Your Wallets',
    message:
      'Welcome to your Crypto Forensic Search Tool. First, choose the networks you use and provide your wallet addresses so we can scan for them.',
    position: 'top',
    action: 'wait-action',
    scrollOffsetY: -100,
  },
  {
    id: 2,
    phase: 1,
    page: 'profile',
    target: 'balance',
    title: 'Your Balance',
    message:
      'This is your balance. Successfully recovered funds appear here. To withdraw, transfer them to your available balance and then to your own exchange account.',
    position: 'right',
    offsetY: -35,
    action: 'next',
  },
  {
    id: 3,
    phase: 1,
    page: 'profile',
    target: 'go-to-dashboard',
    title: 'Crypto Search Engine',
    message:
      'Click here to access the Crypto Search Engine — your main scanning dashboard.',
    position: 'bottom',
    action: 'navigate',
    navigateTo: '/dashboard',
  },
  {
    id: 4,
    phase: 1,
    page: 'dashboard',
    target: 'center-node',
    title: 'This Is You',
    message:
      'The icon in the center represents you. Click on it to see your name and account details.',
    position: 'right',
    action: 'next',
  },
  {
    id: 5,
    phase: 1,
    page: 'dashboard',
    target: 'network-node',
    title: 'Networks',
    message:
      'Each network node around you represents a blockchain we scan. Each individual network may contain funds linked to your name — we scan across the top 6 networks to maximize recovery.',
    position: 'right',
    action: 'next',
  },
  {
    id: 6,
    phase: 1,
    page: 'dashboard',
    target: 'profile-icon',
    title: 'Your Account',
    message:
      'Manage your personal settings, adjust notification preferences, and securely access your profile details here.',
    position: 'bottom',
    action: 'next',
  },
  {
    id: 7,
    phase: 1,
    page: 'dashboard',
    target: 'dashboard-balances',
    title: 'Dashboard Balances',
    message:
      'Keep an eye on your balances right from the dashboard. Your available balance is used to generate access keys, and your onchain balance reflects recovered funds.',
    position: 'bottom',
    action: 'next',
  },
  {
    id: 8,
    phase: 1,
    page: 'dashboard',
    target: 'network-levels',
    title: 'Network Levels',
    message:
      'Your scanning operates in levels. Each level unlocks a new layer of transaction traces. Complete all nodes in a level to advance to the next one and reveal deeper connections.',
    position: 'right',
    action: 'next',
  },
  {
    id: 9,
    phase: 1,
    page: 'dashboard',
    target: 'start-scan',
    title: 'Verification Status',
    message:
      'Your wallet networks are currently pending verification by our system. Once approved, this button will allow you to start scanning, which will reveal all matching connected nodes.',
    position: 'bottom',
    action: 'complete-phase',
  },
  // ── Phase 2: Post-approval (auto-triggered when animation completes) ──
  {
    id: 10,
    phase: 2,
    page: 'dashboard',
    target: 'fingerprint-node',
    title: 'Your First Node',
    message:
      'A node has materialized on the canvas. Each node represents a detected transaction trace linked to your wallet.',
    position: 'right',
    action: 'next',
  },
  {
    id: 11,
    phase: 2,
    page: 'dashboard',
    target: 'node-details-panel',
    title: 'Node Details',
    message:
      'This panel shows full details about the selected node — its transaction amount, status, and the access key generation controls. From here you can generate keys to attempt fund recovery.',
    position: 'left',
    action: 'next',
  },
  {
    id: 12,
    phase: 2,
    page: 'dashboard',
    target: 'node-topup-button',
    title: 'Top Up Your Balance',
    message:
      'To generate access keys and start recovering funds from nodes, you need available balance. Use this button to submit a top-up request. Once your balance is funded, you can generate keys for any node!',
    position: 'left',
    action: 'next',
  },
  {
    id: 13,
    phase: 2,
    page: 'dashboard',
    target: 'node-key-section',
    title: 'Generate Access Keys',
    message:
      'This is the key generation panel. Once you top up your balance, the button below will change to "Generate Keys." Use it to attempt reconstruction of the transaction path. Each key costs a small fee — the more keys you generate, the higher the chance of recovery.',
    position: 'left',
    action: 'complete-phase',
  },
];

// Convenience accessors
export const PHASE_1_STEPS = TUTORIAL_STEPS.filter((s) => s.phase === 1);
export const PHASE_2_STEPS = TUTORIAL_STEPS.filter((s) => s.phase === 2);

// ─── Persisted State Shape ───
interface OnboardingPersisted {
  isComplete: boolean;       // Phase 1 complete
  phase2Complete: boolean;   // Phase 2 complete
  currentStep: number;
  dismissedAt?: string;
  completedAt?: string;
  phase2CompletedAt?: string;
  version: number;
}

const ONBOARDING_VERSION = 6; // bumped: removed Node vs Group Node step from Phase 2

// ─── Context Shape ───
interface OnboardingContextType {
  isActive: boolean;
  currentPhase: 1 | 2;
  currentStep: number;
  currentStepData: TutorialStep | null;
  totalSteps: number;        // steps in the current phase
  phase2Resuming: boolean;   // true while FlowCanvas is zooming to node after Phase 2 resume
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  dismiss: () => void;
  complete: () => void;
  completePhase: () => void;
  startPhase2: () => void;
  setPhase2Ready: () => void; // FlowCanvas calls this after zoom completes
  isStepForCurrentPage: (page: 'profile' | 'dashboard') => boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

// ─── Provider ───
interface OnboardingProviderProps {
  children: ReactNode;
}

const getStorageKey = (userId: string) => `cfinder_onboarding_${userId}`;

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0); // 0 = not started
  const [currentPhase, setCurrentPhase] = useState<1 | 2>(1);
  const [isActive, setIsActive] = useState(false);
  const [phase2Pending, setPhase2Pending] = useState(false); // waiting for node to trigger Phase 2
  const [phase2Resuming, setPhase2Resuming] = useState(false); // overlay suppressed until FlowCanvas zoom completes

  // Load persisted state when user is available
  useEffect(() => {
    if (!user?._id) return;

    console.log('[Onboarding] Init for user:', user._id, 'isAdmin:', user.isAdmin, 'isSubAdmin:', user.isSubAdmin);

    // Admins / subAdmins never see the tutorial
    if (user.isAdmin || user.isSubAdmin) {
      console.log('[Onboarding] Skipped: admin/subAdmin user');
      setIsActive(false);
      return;
    }

    const key = getStorageKey(user._id);
    try {
      const raw = localStorage.getItem(key);
      console.log('[Onboarding] Persisted data:', raw);
      if (raw) {
        const persisted: OnboardingPersisted = JSON.parse(raw);

        // Handle version migration
        if (persisted.version !== ONBOARDING_VERSION) {
          console.log('[Onboarding] Version mismatch. Had:', persisted.version, 'Need:', ONBOARDING_VERSION);

          // If both phases were already complete, don't force the user through again
          // — just silently bump the stored version.
          if (persisted.isComplete && persisted.phase2Complete) {
            console.log('[Onboarding] Already completed — bumping version silently');
            persist(user._id, { ...persisted, version: ONBOARDING_VERSION });
            setIsActive(false);
            return;
          }

          // User was mid-tutorial or dismissed before completing → restart fresh
          console.log('[Onboarding] Not yet completed — restarting fresh');
          setCurrentPhase(1);
          setCurrentStep(1);
          setIsActive(true);
          persist(user._id, {
            isComplete: false,
            phase2Complete: false,
            currentStep: 1,
            version: ONBOARDING_VERSION,
          });
          return;
        }

        if (persisted.dismissedAt) {
          console.log('[Onboarding] Dismissed at:', persisted.dismissedAt);
          // User dismissed — stay inactive
          setIsActive(false);
          // But if Phase 1 was complete and Phase 2 isn't, stand by
          if (persisted.isComplete && !persisted.phase2Complete) {
            setPhase2Pending(true);
          }
          return;
        }

        if (persisted.isComplete && persisted.phase2Complete) {
          console.log('[Onboarding] Both phases complete');
          // Both phases done
          setIsActive(false);
          return;
        }

        if (persisted.isComplete && !persisted.phase2Complete) {
          const phase2Start = PHASE_1_STEPS.length + 1;
          if (persisted.currentStep >= phase2Start) {
            console.log('[Onboarding] Resuming Phase 2 at step:', persisted.currentStep);
            // Phase 2 was already in progress — resume it actively
            setCurrentPhase(2);
            setCurrentStep(persisted.currentStep);
            setIsActive(true);
            setPhase2Pending(false);
            setPhase2Resuming(true); // suppress overlay until FlowCanvas zoom completes
          } else {
            console.log('[Onboarding] Phase 1 done, Phase 2 dormant');
            // Phase 1 done, Phase 2 not yet started — stand by (dormant)
            setIsActive(false);
            setPhase2Pending(true);
          }
          return;
        }

        // Phase 1 still in progress — resume
        console.log('[Onboarding] Resuming Phase 1 at step:', persisted.currentStep);
        setCurrentPhase(1);
        setCurrentStep(persisted.currentStep || 1);
        setIsActive(true);
        return;
      }
    } catch {
      // Corrupt data — start fresh
      console.log('[Onboarding] Corrupt persisted data, starting fresh');
    }

    // No persisted state — could be a genuinely new user OR an existing user
    // who was active before the onboarding feature was added.
    // Detect pre-existing users by checking for activity signals:
    const isPreExistingUser =
      user.lvl1anim === 1 ||           // already watched a scan animation
      user.walletVerified === true ||   // already verified wallets
      (user.balance ?? 0) > 0 ||       // has balance
      (user.availableBalance ?? 0) > 0; // has available balance

    if (isPreExistingUser) {
      console.log('[Onboarding] Pre-existing user detected — skipping onboarding');
      persist(user._id, {
        isComplete: true,
        phase2Complete: true,
        currentStep: TUTORIAL_STEPS.length,
        version: ONBOARDING_VERSION,
      });
      setIsActive(false);
      return;
    }

    // Genuinely new user → activate Phase 1
    console.log('[Onboarding] New user — activating Phase 1');
    setCurrentPhase(1);
    setCurrentStep(1);
    setIsActive(true);
    persist(user._id, {
      isComplete: false,
      phase2Complete: false,
      currentStep: 1,
      version: ONBOARDING_VERSION,
    });
  }, [user?._id, user?.isAdmin, user?.isSubAdmin]);

  const persist = useCallback(
    (userId: string, data: OnboardingPersisted) => {
      try {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(data));
      } catch {
        // Storage full or unavailable — silently fail
      }
    },
    []
  );

  const currentPhaseSteps = currentPhase === 1 ? PHASE_1_STEPS : PHASE_2_STEPS;
  const totalSteps = currentPhaseSteps.length;

  const nextStep = useCallback(() => {
    if (!user?._id) return;
    const next = currentStep + 1;
    if (next > TUTORIAL_STEPS.length) {
      // Past all steps entirely
      setIsActive(false);
      persist(user._id, {
        isComplete: true,
        phase2Complete: true,
        currentStep: next,
        completedAt: new Date().toISOString(),
        phase2CompletedAt: new Date().toISOString(),
        version: ONBOARDING_VERSION,
      });
      return;
    }
    setCurrentStep(next);
    persist(user._id, {
      isComplete: currentPhase === 2 || next > PHASE_1_STEPS.length,
      phase2Complete: false,
      currentStep: next,
      version: ONBOARDING_VERSION,
    });
  }, [currentStep, currentPhase, user?._id, persist]);

  const prevStep = useCallback(() => {
    if (!user?._id || currentStep <= 1) return;
    // Don't go back past the start of the current phase
    const phaseStart = currentPhase === 1 ? 1 : PHASE_1_STEPS.length + 1;
    if (currentStep <= phaseStart) return;

    const prev = currentStep - 1;
    setCurrentStep(prev);
    persist(user._id, {
      isComplete: false,
      phase2Complete: false,
      currentStep: prev,
      version: ONBOARDING_VERSION,
    });
  }, [currentStep, currentPhase, user?._id, persist]);

  const goToStep = useCallback(
    (step: number) => {
      if (!user?._id) return;
      const stepData = TUTORIAL_STEPS[step - 1];
      if (stepData) {
        setCurrentPhase(stepData.phase);
      }
      setCurrentStep(step);
      setIsActive(true);
      persist(user._id, {
        isComplete: false,
        phase2Complete: false,
        currentStep: step,
        version: ONBOARDING_VERSION,
      });
    },
    [user?._id, persist]
  );

  const dismiss = useCallback(() => {
    if (!user?._id) return;
    setIsActive(false);
    persist(user._id, {
      isComplete: currentPhase === 2, // if dismissing Phase 2, Phase 1 was already done
      phase2Complete: false,
      currentStep,
      dismissedAt: new Date().toISOString(),
      version: ONBOARDING_VERSION,
    });
  }, [user?._id, currentStep, currentPhase, persist]);

  // Complete everything (both phases)
  const complete = useCallback(() => {
    if (!user?._id) return;
    setIsActive(false);
    setPhase2Pending(false);
    persist(user._id, {
      isComplete: true,
      phase2Complete: true,
      currentStep: TUTORIAL_STEPS.length + 1,
      completedAt: new Date().toISOString(),
      phase2CompletedAt: new Date().toISOString(),
      version: ONBOARDING_VERSION,
    });
  }, [user?._id, persist]);

  // Complete current phase only
  const completePhase = useCallback(() => {
    if (!user?._id) return;

    if (currentPhase === 1) {
      // End Phase 1, go dormant waiting for Phase 2
      setIsActive(false);
      setPhase2Pending(true);
      persist(user._id, {
        isComplete: true,
        phase2Complete: false,
        currentStep: PHASE_1_STEPS.length,
        completedAt: new Date().toISOString(),
        version: ONBOARDING_VERSION,
      });
    } else {
      // End Phase 2 — everything is done
      complete();
    }
  }, [user?._id, currentPhase, persist, complete]);

  // Called externally (from FlowCanvas) to activate Phase 2
  const startPhase2 = useCallback(() => {
    if (!user?._id) return;
    if (!phase2Pending) return; // Only start if Phase 1 is complete and Phase 2 isn't

    const phase2FirstStep = PHASE_1_STEPS.length + 1; // step 6
    setCurrentPhase(2);
    setCurrentStep(phase2FirstStep);
    setIsActive(true);
    setPhase2Pending(false);
    persist(user._id, {
      isComplete: true,
      phase2Complete: false,
      currentStep: phase2FirstStep,
      version: ONBOARDING_VERSION,
    });
  }, [user?._id, phase2Pending, persist]);

  const currentStepData = isActive && currentStep >= 1 && currentStep <= TUTORIAL_STEPS.length
    ? TUTORIAL_STEPS[currentStep - 1]
    : null;

  const isStepForCurrentPage = useCallback(
    (page: 'profile' | 'dashboard') => {
      if (!currentStepData) return false;
      return currentStepData.page === page;
    },
    [currentStepData]
  );

  const setPhase2Ready = useCallback(() => {
    setPhase2Resuming(false);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentPhase,
        currentStep,
        currentStepData,
        totalSteps,
        phase2Resuming,
        nextStep,
        prevStep,
        goToStep,
        dismiss,
        complete,
        completePhase,
        startPhase2,
        setPhase2Ready,
        isStepForCurrentPage,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
