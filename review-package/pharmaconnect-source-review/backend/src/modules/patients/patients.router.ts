import { Router } from 'express';
import { deferredFeatureHandler } from '../deferred/deferred-feature';

export const patientsRouter = Router();

patientsRouter.use(
  deferredFeatureHandler({
    feature: 'Persistent Patient Data Storage',
    dependency: 'PDPC registration + MOH MOU',
    dependencyStatus: 'Deferred until PDPC registration and MOH data-sharing approval are in place.',
  }),
);
