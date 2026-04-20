import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const SymptomCheckerPage: React.FC = () => (
  <DeferredFeaturePage
    title="Clinical OTC Symptom Tool"
    description="This tool will guide structured OTC triage for minor symptom presentations once the profession issues a written position statement on safe deployment."
    dependency="PC written position statement"
    dependencyStatus="Pending a formal written position from the Pharmacy Council conversation path."
  />
);
