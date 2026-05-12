import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const PatientRecordsPage: React.FC = () => (
  <DeferredFeaturePage
    title="Persistent Patient Data"
    description="This future module will support longitudinal patient records only after the legal and regulatory basis for protected health data storage is in place."
    dependency="PDPC registration + MOH MOU"
    dependencyStatus="PDPC registration is urgent and the MOH data-sharing basis is still pending."
  />
);
