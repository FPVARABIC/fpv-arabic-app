/**
 * Candidate-level compatibility: the verdict a part card carries BEFORE it is
 * chosen.
 *
 * TWO LAYERS, ONE ENGINE
 * ----------------------
 * The full-system judgement — UART budgets, current headroom, stack mounting,
 * ESC channels — belongs to `computeFindings` in the shared core and is NOT
 * reimplemented here; step 11 and «بناءي» call it on a snapshot. What a part
 * card needs is smaller and different: «if I add THIS candidate to what is
 * already chosen, does anything documented object?». This module answers only
 * that question, and answers it by calling the shared core's own validators
 * and tags wherever one exists, so the card and the final report can never
 * disagree about a rule.
 *
 * THE THREE VERDICTS
 * ------------------
 * `ok`           — nothing documented objects.
 * `review`       — we cannot confirm it from documented data: either the
 *                  pairing has no direct spec (an inference, flagged as one)
 *                  or the data genuinely does not exist, in which case the
 *                  honest sentence is the manufacturer one, not a guess.
 * `incompatible` — a documented spec objects (wrong voltage class, prop
 *                  larger than the frame's documented clearance…).
 *
 * NO INVENTED SPECS — MECHANICALLY
 * --------------------------------
 * Every comparison below reads fields that exist in `assembly/types.ts`, whose
 * own comments record why each optional field is optional (no source column,
 * caveated prose, genuine ambiguity). When a field this module wants is
 * absent, the verdict is `review` with the manufacturer sentence — never a
 * silently-assumed number. `scripts/testWebBuild.ts` asserts this file
 * contains no numeric spec literals of its own beyond the shared tolerance.
 */

import {
  validateFrameMotor, validateFramePropeller,
} from '@core/data/assembly/compatibility/validators';
import { frameMatchesSize, FRAME_SIZE_TOLERANCE_INCH } from '@core/data/assembly/frameSizeMatch';
import type {
  BasePart, Frame, Motor, Propeller, Esc, Battery, Receiver, VideoUnit,
} from '@core/data/assembly/types';
import { PART_CATEGORY_MAP } from '@core/data/project/store';
import { buildStages } from '@core/data/assembly/buildStages';
import { droneTypes } from '@core/data/assembly/droneTypes';
import type { ProjectSnapshot } from '@core/data/project/types';

/** The sentence the platform uses when a spec is genuinely undocumented. */
export const MANUAL_CHECK_AR = 'تحتاج المواصفة إلى تحقق من الشركة المصنّعة';

/**
 * The questionnaire's honest «لا أعرف بعد» answer.
 *
 * A sentinel, not an empty string: `undefined` means the question was never
 * answered (the questionnaire must still ask it), while this value means it
 * was answered with «أقرر لاحقاً» — and every ecosystem check below must
 * treat that as NO preference. The first implementation stored the Arabic
 * button label itself, and every video unit promptly failed the comparison
 * against it — a bogus «يحتاج مراجعة» on the whole catalogue.
 */
export const UNDECIDED_PREF = 'undecided';

export type CandidateVerdict = 'ok' | 'review' | 'incompatible';

export const CANDIDATE_VERDICT_LABEL_AR: Record<CandidateVerdict, string> = {
  ok: 'متوافق',
  review: 'يحتاج مراجعة',
  incompatible: 'غير متوافق',
};

export interface CandidateCheck {
  verdict: CandidateVerdict;
  /** WHY, one sentence per objection — empty for a clean `ok`. */
  reasonsAr: string[];
}

/** What has been decided so far — the context a candidate is judged against. */
export interface BuildContext {
  droneTypeId?: string;
  sizeInch?: number;
  batteryVoltage?: number;
  parts: Record<string, BasePart>;
}

function worst(a: CandidateVerdict, b: CandidateVerdict): CandidateVerdict {
  const order: CandidateVerdict[] = ['ok', 'review', 'incompatible'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

/**
 * Judge one candidate against the current context.
 *
 * Deliberately additive: every rule pushes its own reason and worsens the
 * verdict, so a part that is wrong twice says both things rather than the
 * first one found.
 */
export function checkCandidate(
  category: string,
  part: BasePart,
  ctx: BuildContext,
): CandidateCheck {
  let verdict: CandidateVerdict = 'ok';
  const reasons: string[] = [];
  const flag = (v: CandidateVerdict, reasonAr: string) => {
    verdict = worst(verdict, v);
    reasons.push(reasonAr);
  };

  // ── Voltage class — the check that burns hardware when skipped ──────────
  if (
    ctx.batteryVoltage !== undefined
    && !part.compatibilityTags.batteryVoltages.includes(ctx.batteryVoltage)
  ) {
    flag('incompatible',
      `موسومة لجهد مختلف — لا تدعم ${ctx.batteryVoltage}S حسب بياناتها الموثقة.`);
  }

  // ── Drone-type tagging — a curation fact, not an electrical one ─────────
  if (ctx.droneTypeId && !part.compatibilityTags.droneTypes.includes(ctx.droneTypeId)) {
    const typeName = droneTypes.find(t => t.id === ctx.droneTypeId)?.primaryName ?? ctx.droneTypeId;
    flag('review',
      `غير موسومة لبناء ${typeName} — قد تعمل، لكن التوثيق الذي لدينا لا يغطي هذا الاستخدام.`);
  }

  const frame = ctx.parts.frames as Frame | undefined;

  switch (category) {
    case 'frames': {
      if (ctx.sizeInch !== undefined && !frameMatchesSize(part as Frame, ctx.sizeInch)) {
        flag('incompatible', `مقاس هذا الإطار لا يطابق حجم ${ctx.sizeInch} إنش الذي اخترته.`);
      }
      break;
    }
    case 'motors': {
      if (frame) {
        const r = validateFrameMotor(frame, part as Motor);
        if (!r.isCompatible) flag('incompatible', r.reasonAr ?? 'المحرك غير مناسب لهذا الإطار.');
      }
      break;
    }
    case 'propellers': {
      const prop = part as Propeller;
      if (frame) {
        const r = validateFramePropeller(frame, prop);
        if (!r.isCompatible) flag('incompatible', r.reasonAr ?? 'المروحة أكبر من مساحة الإطار.');
      }
      const motor = ctx.parts.motors as Motor | undefined;
      if (motor) {
        // Derived, and said so: there is no documented motor↔prop table in the
        // catalogue. What IS documented is each motor's nominal frame class
        // (and, where a motor's own text claims more, its maxFrameSizeInch) —
        // the same fields, and the same tolerance, `validateFrameMotor` uses.
        const nominal = motor.compatibilityTags.frameSizeInch;
        if (nominal === undefined) {
          flag('review',
            `لا توجد بيانات موثقة لملاءمة هذه المروحة مع هذا المحرك — ${MANUAL_CHECK_AR}.`);
        } else {
          const within =
            Math.abs(prop.specs.sizeInch - nominal) <= FRAME_SIZE_TOLERANCE_INCH
            || (motor.specs.maxFrameSizeInch !== undefined
              && prop.specs.sizeInch <= motor.specs.maxFrameSizeInch);
          if (!within) {
            flag('review',
              `مقاس المروحة (${prop.specs.sizeInch}") خارج فئة المحرك الموثقة (${nominal}") — استنتاج من المواصفات، راجع توصية الشركة قبل الاعتماد عليه.`);
          }
        }
      }
      break;
    }
    case 'escs': {
      const esc = part as Esc;
      if (
        ctx.batteryVoltage !== undefined
        && !esc.specs.compatibleVoltages.includes(ctx.batteryVoltage)
      ) {
        flag('incompatible', `هذا الـESC لا يتحمل ${ctx.batteryVoltage}S حسب مواصفته الموثقة.`);
      }
      break;
    }
    case 'batteries': {
      const battery = part as Battery;
      if (ctx.batteryVoltage !== undefined && battery.specs.sCount !== ctx.batteryVoltage) {
        flag('incompatible',
          `بطارية ${battery.specs.sCount}S بينما بناؤك مصمم على ${ctx.batteryVoltage}S.`);
      }
      break;
    }
    default:
      break;
  }

  return { verdict, reasonsAr: reasons };
}

/**
 * Preference-fit for the two ecosystem questions the questionnaire asks.
 * A mismatch is `review`, never `incompatible`: the part works — with
 * goggles or a transmitter the reader said they do not have.
 */
export function checkEcosystemFit(
  category: string,
  part: BasePart,
  prefs: { videoSystem?: string; rcProtocol?: string },
): CandidateCheck {
  // «أقرر لاحقاً» is an answer, not a system — nothing can mismatch it.
  if (prefs.videoSystem === UNDECIDED_PREF) prefs = { ...prefs, videoSystem: undefined };
  if (prefs.rcProtocol === UNDECIDED_PREF) prefs = { ...prefs, rcProtocol: undefined };

  if (category === 'videoUnits' && prefs.videoSystem
    && part.protocolOrSystem && part.protocolOrSystem !== prefs.videoSystem) {
    return {
      verdict: 'review',
      reasonsAr: [`من منظومة ${part.protocolOrSystem} بينما نظارتك من ${prefs.videoSystem} — المنظومتان لا تتخاطبان.`],
    };
  }
  if (category === 'receivers' && prefs.rcProtocol) {
    const proto = (part as Receiver).specs.protocol;
    if (part.protocolOrSystem !== prefs.rcProtocol && proto !== prefs.rcProtocol) {
      return {
        verdict: 'review',
        reasonsAr: [`بروتوكوله ${part.protocolOrSystem ?? proto} بينما جهاز تحكمك يبث ${prefs.rcProtocol}.`],
      };
    }
  }
  return { verdict: 'ok', reasonsAr: [] };
}

/**
 * The ecosystem choices, DERIVED from the catalogue rather than typed here:
 * whichever systems/protocols real parts declare are the ones offerable.
 */
export function videoSystemOptions(): string[] {
  const seen = new Set<string>();
  for (const p of PART_CATEGORY_MAP.videoUnits ?? []) {
    if (p.protocolOrSystem) seen.add(p.protocolOrSystem);
  }
  return [...seen];
}

export function rcProtocolOptions(): string[] {
  const seen = new Set<string>();
  for (const p of PART_CATEGORY_MAP.receivers ?? []) {
    if (p.protocolOrSystem) seen.add(p.protocolOrSystem);
    else seen.add((p as Receiver).specs.protocol);
  }
  return [...seen];
}

/**
 * A snapshot for the verdict engine, built from IN-MEMORY wizard state.
 *
 * `readProjectSnapshot()` reads localStorage; the wizard must be able to judge
 * a build the instant a part is tapped, before any persistence settles. Shape
 * and field names mirror `snapshot.ts` exactly — this constructs the input,
 * the shared core still owns every judgement.
 */
export function snapshotFromContext(
  ctx: BuildContext,
  stageIndex: number,
): ProjectSnapshot {
  const parts = ctx.parts;
  const droneType = droneTypes.find(d => d.id === ctx.droneTypeId);
  return {
    exists: !!ctx.droneTypeId,
    droneTypeId: ctx.droneTypeId,
    droneTypeName: droneType?.primaryName,
    sizeInch: ctx.sizeInch,
    cellCount: ctx.batteryVoltage,
    stageIndex,
    totalStages: buildStages.length,
    frame: parts.frames as Frame | undefined,
    motor: parts.motors as Motor | undefined,
    esc: parts.escs as Esc | undefined,
    flightController: parts.flightControllers as ProjectSnapshot['flightController'],
    battery: parts.batteries as Battery | undefined,
    propeller: parts.propellers as Propeller | undefined,
    receiver: parts.receivers as Receiver | undefined,
    videoUnit: parts.videoUnits as VideoUnit | undefined,
    gps: parts.gps as ProjectSnapshot['gps'],
    parts,
  };
}
