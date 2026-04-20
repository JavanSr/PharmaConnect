import type { Request, Response } from 'express';

type DeferredFeatureConfig = {
  feature: string;
  dependency: string;
  dependencyStatus: string;
};

export function sendDeferredFeature(
  res: Response,
  config: DeferredFeatureConfig,
  status = 410,
) {
  return res.status(status).json({
    error: 'FEATURE_DEFERRED',
    feature: config.feature,
    dependency: config.dependency,
    dependencyStatus: config.dependencyStatus,
  });
}

export function deferredFeatureHandler(config: DeferredFeatureConfig) {
  return (_req: Request, res: Response) => sendDeferredFeature(res, config);
}
