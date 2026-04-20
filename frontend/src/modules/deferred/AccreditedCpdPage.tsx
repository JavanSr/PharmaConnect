import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const AccreditedCpdPage: React.FC = () => (
  <DeferredFeaturePage
    title="PC-Accredited CPD"
    description="This area will issue Pharmacy Council accredited certificates and point recognition once the necessary memorandum of understanding is agreed."
    dependency="Pharmacy Council MOU"
    dependencyStatus="Formal MOU discussions still need to begin before accredited rollout."
  />
);
