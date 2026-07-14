import type { BfVersionContext, BfSourceRef, BfScope } from './types';

/**
 * Documented baseline, verified this session directly against official
 * release tags (not GitHub's summarized release list):
 *   - firmware: git clone --depth 1 github.com/betaflight/betaflight, tag 2025.12.5
 *     (src/main/build/version.h: FC_VERSION_PATCH_LEVEL 5, FC_VERSION_YEAR/MONTH -> 2025.12)
 *   - App: git clone --depth 1 github.com/betaflight/betaflight-configurator, tag 2025.12.2
 *     (package.json "version": "2025.12.2")
 * Both repos were cloned read-only to a temp directory outside this
 * repository and are not included here.
 */
export const BF_VERSION_CONTEXT: BfVersionContext = {
  firmwareVersion: '2025.12.5',
  appVersion: '2025.12.2',
  releaseLine: '2025.12',
  stability: 'stable',
  reviewedAt: '2026-07-14',
};

const CONFIGURATOR_COMMIT_2025_12_2 = 'a2d0f50623cbb4fd492bc94eac2aec3acc8b2c5a';
const FIRMWARE_COMMIT_2025_12_5 = '7348054f268f0058574719c134e9f149565bb8ea';

/**
 * Every Configurator tab exposes its own doc link as
 * `https://betaflight.com/docs/wiki/app/${tab_id.replaceAll('_','-')}-tab`,
 * generated identically for every tab in src/js/gui.js (content_ready()):
 *   `https://betaflight.com/docs/wiki/app/${tRex}-tab`
 * where tRex = GUI.active_tab.replaceAll('_', '-').toLowerCase().
 * Verified directly in the cloned source this session.
 */
export function officialDocUrl(officialId: string): string {
  return `https://betaflight.com/docs/wiki/app/${officialId.replaceAll('_', '-')}-tab`;
}

export function makeConfiguratorSourceRef(params: {
  title: string;
  repoPath: string;
  applicability: BfScope;
  officialId: string;
}): BfSourceRef {
  return {
    title: params.title,
    url: officialDocUrl(params.officialId),
    repoPath: params.repoPath,
    commit: CONFIGURATOR_COMMIT_2025_12_2,
    reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
    firmwareVersion: BF_VERSION_CONTEXT.firmwareVersion,
    appVersion: BF_VERSION_CONTEXT.appVersion,
    applicability: params.applicability,
  };
}

export function makeFirmwareSourceRef(params: {
  title: string;
  repoPath: string;
  applicability: BfScope;
}): BfSourceRef {
  return {
    title: params.title,
    url: 'https://github.com/betaflight/betaflight',
    repoPath: params.repoPath,
    commit: FIRMWARE_COMMIT_2025_12_5,
    reviewedAt: BF_VERSION_CONTEXT.reviewedAt,
    firmwareVersion: BF_VERSION_CONTEXT.firmwareVersion,
    appVersion: BF_VERSION_CONTEXT.appVersion,
    applicability: params.applicability,
  };
}
