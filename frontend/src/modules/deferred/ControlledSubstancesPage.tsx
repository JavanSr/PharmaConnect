import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const ControlledSubstancesPage: React.FC = () => (
  <DeferredFeaturePage
    title="Controlled Substances Reporting"
    description="This module will support structured controlled-substance reporting once TMDA has issued the required notification and reporting instructions."
    dependency="TMDA notification"
    dependencyStatus="Held for Phase 2 until TMDA publishes the required reporting notice."
  />
);
