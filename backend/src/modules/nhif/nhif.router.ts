import { Router } from 'express';
import { deferredFeatureHandler } from '../deferred/deferred-feature';

export const nhifRouter = Router();

nhifRouter.use(
  deferredFeatureHandler({
    feature: 'NHIF Claims Module',
    dependency: 'NHIF Breeze API accreditation',
    dependencyStatus: 'Deferred pending official NHIF accreditation and production access.',
  }),
);
