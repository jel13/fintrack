
"use client";

import { useEffect } from 'react';
import { driver, DriveStep } from 'driver.js';

interface UseDriverTourOptions {
  tourId: string;
  steps: DriveStep[];
  condition?: boolean;
}

export const useDriverTour = ({
  tourId,
  steps,
  condition = true,
}: UseDriverTourOptions) => {
  useEffect(() => {
    // Check condition and if tour has been seen this session
    const hasSeenTourThisSession = sessionStorage.getItem(tourId) === 'true';

    if (condition && !hasSeenTourThisSession) {
      const timer = setTimeout(() => {
        const driverObj = driver({
          showProgress: true,
          steps: steps,
          onDeselected: () => {
            sessionStorage.setItem(tourId, 'true');
            driverObj.destroy();
          },
          onDestroyed: () => {
            sessionStorage.setItem(tourId, 'true');
          }
        });
        driverObj.drive();
      }, 500); // A small delay to ensure the UI is ready for the tour.

      return () => clearTimeout(timer);
    }
  }, [tourId, condition, steps]);
};
