import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const PrescriptionManagementPage: React.FC = () => (
  <DeferredFeaturePage
    title="Prescription Management"
    description="This module will digitize prescription capture, review, and fulfilment once the legal and policy framework for digital prescriptions is stable."
    dependency="PC + TMDA digital framework"
    dependencyStatus="Monitoring the Pharmacy Council and TMDA policy framework before implementation."
  />
);
