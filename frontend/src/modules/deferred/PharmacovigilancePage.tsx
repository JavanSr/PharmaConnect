import React from 'react';
import { DeferredFeaturePage } from './DeferredFeaturePage';

export const PharmacovigilancePage: React.FC = () => (
  <DeferredFeaturePage
    title="Adverse Drug Reaction Reporting"
    description="Report suspected adverse reactions directly to TMDA from APOTEKH. Structured ADR forms, automatic reference tracking, and submission history — launching when TMDA's electronic reporting integration is ready."
    dependency="TMDA electronic ADR reporting system integration"
    dependencyStatus="Awaiting TMDA electronic ADR reporting integration before reports can be submitted from APOTEKH."
  />
);
