import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const NhifClaimsPage: React.FC = () => (
  <DeferredFeaturePage
    title="NHIF Claims Module"
    description="This module will prepare, validate, and submit pharmacy NHIF claims once the production accreditation path is officially available."
    dependency="NHIF Breeze API accreditation"
    dependencyStatus="Waiting for official accreditation and production access approval from NHIF."
  />
);
