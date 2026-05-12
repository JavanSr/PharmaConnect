import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const ControlledSubstancesPage: React.FC = () => (
  <DeferredFeaturePage
    title="Controlled Substances TMDA Reporting"
    description="This module will generate and submit the regulated monthly and quarterly controlled substances reports directly to TMDA once the agency's electronic reporting notification and approval is in place."
    dependency="TMDA notification and electronic reporting approval"
    dependencyStatus="Awaiting formal notification from TMDA before any controlled substance data is transmitted electronically."
  />
);
