# Admin Onboarding - React Component Implementation Guide

**Purpose**: Implementation-ready component specifications for frontend developers  
**Stack**: React 18+, TypeScript, Tailwind CSS, Framer Motion (animations)  
**Status**: Ready to implement

---

## 📦 Component Library Structure

```
src/
  components/
    onboarding/
      ├── OnboardingProvider.tsx          // Global state management
      ├── OnboardingContainer.tsx         // Main wrapper
      │
      ├── dashboard/
      │   ├── WelcomeDashboard.tsx       // Empty state (0%)
      │   ├── ProgressDashboard.tsx      // Partial state (1-99%)
      │   └── ChecklistModule.tsx        // Checklist items
      │
      ├── flows/
      │   ├── BrandCreationFlow.tsx      // 3-step brand wizard
      │   ├── ProductAdditionFlow.tsx    // 4-step product wizard
      │   ├── RetailerRegistrationFlow.tsx
      │   ├── SalesmanSetupFlow.tsx
      │   ├── InventorySetupFlow.tsx
      │   └── FirstOrderFlow.tsx
      │
      ├── shared/
      │   ├── StepIndicator.tsx          // Progress bar
      │   ├── CelebrationModal.tsx       // Celebration UI
      │   ├── FormField.tsx              // Reusable form field
      │   ├── AutoSuggestDropdown.tsx
      │   └── MultiStepWizard.tsx
      │
      ├── navigation/
      │   ├── NavItemLocked.tsx
      │   ├── NavItemPreview.tsx
      │   └── NavItemAvailable.tsx
      │
      └── hooks/
          ├── useOnboarding.ts
          ├── useOnboardingStep.ts
          ├── useFormValidation.ts
          └── useAnimationTrigger.ts
```

---

## 🎯 Core Hook: useOnboarding

```typescript
// src/components/onboarding/hooks/useOnboarding.ts

import { useContext, useCallback } from 'react';
import { OnboardingContext } from '../OnboardingProvider';

interface UseOnboardingReturn {
  // State
  state: OnboardingState;
  progress: {
    percentage: number;
    completed: number;
    total: number;
  };
  currentStep: OnboardingStep;
  unlocked: UnlockedFeatures;
  data: OnboardingData;
  
  // Actions
  goToStep: (step: OnboardingStep) => void;
  completeStep: (step: OnboardingStep, data: any) => void;
  skipStep: (step: OnboardingStep) => void;
  
  // Helpers
  isStepCompleted: (step: OnboardingStep) => boolean;
  isFeatureUnlocked: (feature: string) => boolean;
  getNextIncompleteStep: () => OnboardingStep | null;
}

export function useOnboarding(): UseOnboardingReturn {
  const context = useContext(OnboardingContext);
  
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  
  const { state, dispatch } = context;
  
  const completeStep = useCallback((step: OnboardingStep, data: any) => {
    dispatch({
      type: 'STEP_COMPLETED',
      payload: { step, data }
    });
    
    // Track analytics
    analytics.track('onboarding_step_completed', {
      step,
      timestamp: new Date(),
      timeTaken: state.stepStartTime ? Date.now() - state.stepStartTime : 0
    });
  }, [dispatch, state.stepStartTime]);
  
  const goToStep = useCallback((step: OnboardingStep) => {
    dispatch({ type: 'SET_STEP', payload: { step } });
  }, [dispatch]);
  
  const isFeatureUnlocked = useCallback((feature: string) => {
    const thresholds: Record<string, number> = {
      products: 17,
      retailers: 33,
      orders: 50,
      team: 67,
      inventory: 83,
      analytics: 100
    };
    
    return state.progress.percentage >= (thresholds[feature] || 0);
  }, [state.progress.percentage]);
  
  return {
    state: state.currentState,
    progress: state.progress,
    currentStep: state.currentStep,
    unlocked: {
      products: isFeatureUnlocked('products'),
      retailers: isFeatureUnlocked('retailers'),
      orders: isFeatureUnlocked('orders'),
      team: isFeatureUnlocked('team'),
      inventory: isFeatureUnlocked('inventory'),
      analytics: isFeatureUnlocked('analytics')
    },
    data: state.onboardingData,
    completeStep,
    goToStep,
    skipStep: (step) => dispatch({ type: 'SKIP_STEP', payload: { step } }),
    isStepCompleted: (step) => state.completedSteps.includes(step),
    isFeatureUnlocked,
    getNextIncompleteStep: () => {
      const steps: OnboardingStep[] = [
        'ADD_BRAND',
        'ADD_PRODUCT',
        'ADD_RETAILER',
        'ADD_SALESMAN',
        'SET_INVENTORY',
        'PLACE_ORDER'
      ];
      
      return steps.find(step => !state.completedSteps.includes(step)) || null;
    }
  };
}
```

---

## 🎨 Component 1: WelcomeDashboard

```typescript
// src/components/onboarding/dashboard/WelcomeDashboard.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '../hooks/useOnboarding';
import { ChecklistModule } from './ChecklistModule';

export function WelcomeDashboard() {
  const { data, progress, goToStep } = useOnboarding();
  const distributorName = data.distributorInfo?.firmName || 'Distributor';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white shadow-sm"
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="SupplySetu" className="h-8" />
            <span className="text-lg font-semibold text-gray-800">
              Welcome, {distributorName}
            </span>
          </div>
          <button className="text-gray-600 hover:text-gray-900">Menu</button>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Hero Zone */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-lg p-12 mb-8"
        >
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-6xl mb-4"
            >
              👋
            </motion.div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Welcome to Your SupplySetu Workspace
            </h1>
            
            <h2 className="text-xl text-gray-700 mb-4">
              "{distributorName}"
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Setup takes ~10 minutes. Let's get started building your distribution network!
            </p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progress: {progress.percentage}%
                </span>
                <span className="text-sm text-gray-600">
                  {progress.completed}/{progress.total} complete
                </span>
              </div>
              
              <motion.div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </motion.div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => goToStep('ADD_BRAND')}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-shadow"
              >
                🚀 START SETUP
              </motion.button>
              
              <button className="border-2 border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-gray-400">
                View Demo
              </button>
              
              <button className="text-blue-600 hover:text-blue-700 font-medium px-4">
                Skip for Now
              </button>
            </div>
          </div>
        </motion.section>

        {/* Checklist Zone */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ChecklistModule />
        </motion.section>

        {/* Info Zone */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 rounded-xl p-6 mt-8 border border-blue-200"
        >
          <h3 className="font-semibold text-gray-900 mb-3">💡 Why These Steps?</h3>
          <ul className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <li>• <strong>Brands</strong> = What you sell</li>
            <li>• <strong>Products</strong> = Your catalog</li>
            <li>• <strong>Retailers</strong> = Your customers</li>
            <li>• <strong>Salesmen</strong> = Your distribution team</li>
            <li>• <strong>Inventory</strong> = What's in stock</li>
            <li>• <strong>Orders</strong> = Revenue tracking</li>
          </ul>
        </motion.section>

        {/* Support Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-600">
            📞 Need Help? 
            <button className="ml-2 text-blue-600 hover:text-blue-700 font-medium">
              Chat with Support
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
```

---

## 📋 Component 2: ChecklistModule

```typescript
// src/components/onboarding/dashboard/ChecklistModule.tsx

import React from 'react';
import { motion } from 'framer-motion';
import { useOnboarding } from '../hooks/useOnboarding';

interface ChecklistItemConfig {
  id: string;
  step: OnboardingStep;
  icon: string;
  number: number;
  title: string;
  description: string;
  timeMin: number;
  locked?: boolean;
  lockReason?: string;
}

const CHECKLIST_ITEMS: ChecklistItemConfig[] = [
  {
    id: 'brand',
    step: 'ADD_BRAND',
    icon: '🏢',
    number: 1,
    title: 'Add Your First Brand',
    description: 'e.g., "Hindustan Unilever", "ITC"',
    timeMin: 3,
  },
  {
    id: 'products',
    step: 'ADD_PRODUCT',
    icon: '📦',
    number: 2,
    title: 'Add 5+ Products Under Brand',
    description: 'SKUs, prices, images',
    timeMin: 5,
  },
  {
    id: 'retailers',
    step: 'ADD_RETAILER',
    icon: '🏪',
    number: 3,
    title: 'Register Your First Retailer',
    description: 'Shop owner details, location',
    timeMin: 2,
  },
  {
    id: 'salesman',
    step: 'ADD_SALESMAN',
    icon: '👔',
    number: 4,
    title: 'Assign Salesman to Route',
    description: 'Team member + territory',
    timeMin: 2,
  },
  {
    id: 'inventory',
    step: 'SET_INVENTORY',
    icon: '📊',
    number: 5,
    title: 'Record Opening Stock',
    description: 'Initial inventory from warehouse',
    timeMin: 3,
  },
  {
    id: 'order',
    step: 'PLACE_ORDER',
    icon: '📋',
    number: 6,
    title: 'Place Your First Test Order',
    description: 'See system in action',
    timeMin: 2,
    locked: true,
    lockReason: 'Unlocks after inventory setup',
  },
];

function ChecklistItem({ item, isCompleted, isLocked, onStart }: any) {
  const statusIcon = isCompleted ? '✅' : isLocked ? '⭕' : '☐';
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={!isLocked ? { x: 10 } : {}}
      className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-400 transition-colors cursor-pointer"
      onClick={() => !isLocked && onStart(item.step)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <span className="text-3xl">{item.icon}</span>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{statusIcon}</span>
              <h3 className="font-semibold text-gray-900 text-lg">
                {item.number}️⃣ {item.title}
              </h3>
            </div>
            
            <p className="text-gray-600 text-sm mt-1">
              {item.description}
            </p>
            
            {isLocked && item.lockReason && (
              <p className="text-orange-600 text-sm mt-2 font-medium">
                🔒 {item.lockReason}
              </p>
            )}
          </div>
        </div>
        
        <div className="text-right ml-4">
          <span className="text-sm font-medium text-gray-500">
            {item.timeMin} min
          </span>
          
          {isLocked && (
            <div className="mt-2">
              <span className="inline-block bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-medium">
                Locked
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChecklistModule() {
  const { goToStep, isStepCompleted, progress } = useOnboarding();
  
  const isRetailerLocked = progress.percentage < 33;
  const isSalesmanLocked = progress.percentage < 50;
  const isOrderLocked = progress.percentage < 83;
  
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        📋 YOUR SETUP CHECKLIST
      </h2>
      <p className="text-gray-600 mb-8">
        {progress.completed}/{progress.total} steps complete
      </p>
      
      <div className="space-y-4">
        {CHECKLIST_ITEMS.map((item) => {
          const isCompleted = isStepCompleted(item.step);
          let isLocked = false;
          
          if (item.step === 'ADD_RETAILER') isLocked = isRetailerLocked;
          if (item.step === 'ADD_SALESMAN') isLocked = isSalesmanLocked;
          if (item.step === 'PLACE_ORDER') isLocked = isOrderLocked;
          
          return (
            <ChecklistItem
              key={item.id}
              item={item}
              isCompleted={isCompleted}
              isLocked={isLocked}
              onStart={goToStep}
            />
          );
        })}
      </div>
    </div>
  );
}
```

---

## 🎁 Component 3: CelebrationModal

```typescript
// src/components/onboarding/shared/CelebrationModal.tsx

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

interface CelebrationModalProps {
  type: 'BRAND_CREATED' | 'PRODUCT_COMPLETE' | 'MILESTONE' | 'COMPLETION';
  title: string;
  message: string;
  items?: string[];
  primaryCTA: {
    label: string;
    onClick: () => void;
  };
  secondaryCTA?: {
    label: string;
    onClick: () => void;
  };
  onClose: () => void;
}

export function CelebrationModal({
  type,
  title,
  message,
  items,
  primaryCTA,
  secondaryCTA,
  onClose,
}: CelebrationModalProps) {
  const [showConfetti, setShowConfetti] = React.useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  const getEmojiByType = () => {
    switch (type) {
      case 'BRAND_CREATED': return '🎉';
      case 'PRODUCT_COMPLETE': return '📦';
      case 'MILESTONE': return '🚀';
      case 'COMPLETION': return '✨';
      default: return '🎊';
    }
  };
  
  return (
    <>
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
        />
      )}
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15 }}
          className="bg-white rounded-2xl shadow-2xl p-12 max-w-lg mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Emoji Animation */}
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, repeat: 2 }}
            className="text-7xl text-center mb-6"
          >
            {getEmojiByType()}
          </motion.div>
          
          {/* Title */}
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-3">
            {title}
          </h2>
          
          {/* Message */}
          <p className="text-center text-gray-700 mb-6">
            {message}
          </p>
          
          {/* Items List */}
          {items && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              {items.map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="text-sm text-gray-700 mb-2"
                >
                  • {item}
                </motion.div>
              ))}
            </div>
          )}
          
          {/* CTAs */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={primaryCTA.onClick}
              className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              {primaryCTA.label}
            </motion.button>
            
            {secondaryCTA && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={secondaryCTA.onClick}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:border-gray-400"
              >
                {secondaryCTA.label}
              </motion.button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
```

---

## 🔄 Component 4: MultiStepWizard

```typescript
// src/components/onboarding/shared/MultiStepWizard.tsx

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  id: string;
  title: string;
  component: React.ComponentType<any>;
}

interface MultiStepWizardProps {
  steps: Step[];
  onComplete: (data: any) => void;
  onCancel: () => void;
  title: string;
}

export function MultiStepWizard({
  steps,
  onComplete,
  onCancel,
  title,
}: MultiStepWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [stepData, setStepData] = useState<any>({});
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;
  
  const slideVariants = {
    enter: (dir: 'forward' | 'backward') => ({
      x: dir === 'forward' ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (dir: 'forward' | 'backward') => ({
      zIndex: 0,
      x: dir === 'forward' ? -1000 : 1000,
      opacity: 0,
    }),
  };
  
  const handleNext = (data: any) => {
    setStepData({ ...stepData, ...data });
    
    if (isLastStep) {
      onComplete({ ...stepData, ...data });
    } else {
      setDirection('forward');
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };
  
  const handleBack = () => {
    if (!isFirstStep) {
      setDirection('backward');
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };
  
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button
              onClick={onCancel}
              className="text-white/70 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
          </div>
          
          <div className="text-sm font-medium mb-2">
            Step {currentStepIndex + 1} of {steps.length}: {currentStep.title}
          </div>
          
          <motion.div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
            <motion.div
              className="bg-white h-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </motion.div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
            >
              <currentStep.component
                data={stepData}
                onNext={handleNext}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex gap-3 bg-gray-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleBack}
            disabled={isFirstStep}
            className="px-6 py-2 border-2 border-gray-300 text-gray-700 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </motion.button>
          
          <button
            onClick={onCancel}
            disabled={currentStepIndex === 0}
            className="px-6 py-2 text-gray-600 font-medium hover:text-gray-900"
          >
            Cancel
          </button>
          
          <div className="flex-1" />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            {isLastStep ? '✅ Create' : 'Next'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
```

---

##📌 Implementation Checklist

**Phase 1: Week 1**
- [ ] OnboardingProvider with Redux/Zustand state
- [ ] WelcomeDashboard component
- [ ] ChecklistModule component
- [ ] useOnboarding hook

**Phase 2: Week 2**
- [ ] MultiStepWizard component
- [ ] BrandCreationFlow (3 screens)
- [ ] ProductAdditionFlow (4 screens)
- [ ] CelebrationModal component

**Phase 3: Week 3**
- [ ] RetailerRegistrationFlow
- [ ] SalesmanSetupFlow
- [ ] FirstOrderFlow
- [ ] Navigation Lock system

**Phase 4: Week 4**
- [ ] Mobile responsiveness
- [ ] Animation polish
- [ ] Analytics tracking
- [ ] Error handling

---

## 🎯 Key Integration Points

1. **State Management**: Use Redux or Zustand for global onboarding state
2. **API Calls**: Integrate with backend endpoints (/api/brands, /api/products, etc.)
3. **Analytics**: Track every micro-interaction with segment/mixpanel
4. **Animations**: Use Framer Motion for smooth transitions
5. **Form Validation**: Implement real-time validation with clear errors
6. **Responsive**: Test on mobile, tablet, desktop viewports
7. **Accessibility**: ARIA labels, keyboard navigation, color contrast

This implementation guide provides production-ready component specifications for your frontend team to build the complete onboarding experience.
