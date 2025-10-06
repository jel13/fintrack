
"use client";

import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { TourStep } from '@/hooks/use-tour';

interface GuidedTourProps {
  steps: TourStep[];
  currentStep: number;
  isRunning: boolean;
  onNext: () => void;
  onPrev: () => void;
  onFinish: () => void;
}

interface HighlightBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  currentStep,
  isRunning,
  onNext,
  onPrev,
  onFinish,
}) => {
  const [highlightBox, setHighlightBox] = useState<HighlightBox | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const currentTourStep = steps[currentStep];

  useLayoutEffect(() => {
    if (isRunning && currentTourStep) {
      const targetElement = document.querySelector(currentTourStep.target) as HTMLElement;
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const updatePosition = () => {
          const rect = targetElement.getBoundingClientRect();
          const box = {
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
          setHighlightBox(box);

          const popoverRect = { width: 320, height: 150 }; // Approximate popover size
          const spacing = 16;
          let newPos = { top: 0, left: 0 };

          switch (currentTourStep.placement) {
            case 'bottom':
              newPos = { top: rect.bottom + spacing, left: rect.left + rect.width / 2 - popoverRect.width / 2 };
              break;
            case 'top':
              newPos = { top: rect.top - popoverRect.height - spacing, left: rect.left + rect.width / 2 - popoverRect.width / 2 };
              break;
            case 'left':
              newPos = { top: rect.top + rect.height / 2 - popoverRect.height / 2, left: rect.left - popoverRect.width - spacing };
              break;
            case 'right':
              newPos = { top: rect.top + rect.height / 2 - popoverRect.height / 2, left: rect.right + spacing };
              break;
            default: // Default to bottom
              newPos = { top: rect.bottom + spacing, left: rect.left + rect.width / 2 - popoverRect.width / 2 };
          }
          
          // Adjust if off-screen
          if (newPos.left < spacing) newPos.left = spacing;
          if (newPos.left + popoverRect.width > window.innerWidth - spacing) {
            newPos.left = window.innerWidth - popoverRect.width - spacing;
          }
           if (newPos.top < spacing) newPos.top = spacing;

          setPopoverPosition(newPos);
        };
        
        // Timeout to allow for scroll and render
        const timer = setTimeout(updatePosition, 300);
        
        window.addEventListener('resize', updatePosition);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updatePosition);
        };
      } else {
        // If target not found, maybe skip or end tour
        onNext();
      }
    }
  }, [isRunning, currentStep, currentTourStep, onNext]);

  if (!isRunning || !highlightBox || !currentTourStep) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFinish}
      />
      
      {/* Highlight SVG */}
      <svg className="fixed inset-0 w-full h-full pointer-events-none">
        <defs>
          <mask id="highlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <motion.rect
              x={highlightBox.left - 4}
              y={highlightBox.top - 4}
              width={highlightBox.width + 8}
              height={highlightBox.height + 8}
              rx="8"
              fill="black"
              animate={{
                x: highlightBox.left - 4,
                y: highlightBox.top - 4,
                width: highlightBox.width + 8,
                height: highlightBox.height + 8,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="black"
          opacity="0"
          mask="url(#highlight-mask)"
        />
      </svg>
      
      {/* Popover Content */}
      <AnimatePresence>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="fixed z-[201] w-80 rounded-lg border bg-background p-4 shadow-xl"
          style={{
            top: popoverPosition.top,
            left: popoverPosition.left,
          }}
        >
          <button onClick={onFinish} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
          <h3 className="font-bold text-lg mb-2">{currentTourStep.title}</h3>
          <p className="text-sm text-muted-foreground mb-4">{currentTourStep.content}</p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {currentStep + 1} / {steps.length}
            </span>
            <div className="flex gap-2">
              {currentStep > 0 && <Button variant="outline" size="sm" onClick={onPrev}>Previous</Button>}
              <Button size="sm" onClick={onNext}>
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
