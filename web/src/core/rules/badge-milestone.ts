/**
 * 里程碑类 4 枚徽章的条件判定（PRD V1-05 §4.1 / OP-04）。
 *
 * 立碑、三碑、碑上有字、年轮有痕。删除的里程碑不参与判定；
 * 年份与日期精度按本地自然日对齐。
 */

import type { BadgeCandidate, BadgeMilestoneRow, BadgeProgress } from './badges';
import { milestoneAnchor } from './timeline-placement';

export interface MilestoneAssessment {
  candidates: BadgeCandidate[];
  progress: BadgeProgress[];
}

interface Rows {
  milestones: readonly BadgeMilestoneRow[];
}

const NOTE_EXCERPT = 40;
const YEAR_MARKS_TARGET = 3;
const THREE_TARGET = 3;

interface DatedMilestone {
  milestone: BadgeMilestoneRow;
  eventDate: string;
  year: string;
}

function byDate(left: DatedMilestone, right: DatedMilestone): number {
  return (
    left.eventDate.localeCompare(right.eventDate) ||
    left.milestone.achievedAt - right.milestone.achievedAt ||
    left.milestone.id.localeCompare(right.milestone.id)
  );
}

export function assessMilestoneBadges(rows: Rows, tzOffsetMinutes: number): MilestoneAssessment {
  const candidates: BadgeCandidate[] = [];
  const progress: BadgeProgress[] = [];

  const dated: DatedMilestone[] = rows.milestones
    .filter((milestone) => milestone.deletedAt === null)
    .map((milestone) => {
      const eventDate = milestoneAnchor(
        milestone.achievedAt,
        milestone.datePrecision,
        tzOffsetMinutes,
      );
      return { milestone, eventDate, year: eventDate.slice(0, 4) };
    })
    .sort(byDate);

  // 立碑：第一个里程碑。
  const first = dated[0];
  progress.push({ catalogId: 'first-milestone', current: first ? 1 : 0, target: 1 });
  if (first) {
    candidates.push({
      catalogId: 'first-milestone',
      category: 'milestone',
      sourceEntityId: first.milestone.id,
      snapshot: {
        milestoneId: first.milestone.id,
        branchId: first.milestone.branchId,
        title: first.milestone.title,
        datePrecision: first.milestone.datePrecision,
        achievedAt: first.milestone.achievedAt,
        eventDate: first.eventDate,
      },
    });
  }

  // 三碑：累计第 3 个里程碑。
  progress.push({ catalogId: 'three-milestones', current: dated.length, target: THREE_TARGET });
  if (dated.length >= THREE_TARGET) {
    const third = dated[THREE_TARGET - 1]!;
    candidates.push({
      catalogId: 'three-milestones',
      category: 'milestone',
      sourceEntityId: third.milestone.id,
      snapshot: {
        milestoneId: third.milestone.id,
        count: THREE_TARGET,
        eventDate: third.eventDate,
      },
    });
  }

  // 碑上有字：第一个带非空备注的里程碑。
  const withNote = dated.filter((row) => (row.milestone.note ?? '').trim().length > 0);
  progress.push({ catalogId: 'milestone-note', current: withNote.length, target: 1 });
  const firstNote = withNote[0];
  if (firstNote) {
    const note = (firstNote.milestone.note ?? '').trim();
    candidates.push({
      catalogId: 'milestone-note',
      category: 'milestone',
      sourceEntityId: firstNote.milestone.id,
      snapshot: {
        milestoneId: firstNote.milestone.id,
        title: firstNote.milestone.title,
        note: note.slice(0, NOTE_EXCERPT),
        eventDate: firstNote.eventDate,
      },
    });
  }

  // 年轮有痕：同一自然年第 3 个里程碑。
  const byYear = new Map<string, DatedMilestone[]>();
  for (const row of dated) {
    const list = byYear.get(row.year) ?? [];
    list.push(row);
    byYear.set(row.year, list);
  }
  let yearMax = 0;
  let marks: { year: string; rows: DatedMilestone[] } | null = null;
  for (const [year, list] of byYear) {
    yearMax = Math.max(yearMax, list.length);
    if (list.length < YEAR_MARKS_TARGET) continue;
    if (
      !marks ||
      list[YEAR_MARKS_TARGET - 1]!.eventDate < marks.rows[YEAR_MARKS_TARGET - 1]!.eventDate
    ) {
      marks = { year, rows: list };
    }
  }
  progress.push({ catalogId: 'year-marks', current: yearMax, target: YEAR_MARKS_TARGET });
  if (marks) {
    const three = marks.rows.slice(0, YEAR_MARKS_TARGET);
    const third = three[YEAR_MARKS_TARGET - 1]!;
    candidates.push({
      catalogId: 'year-marks',
      category: 'milestone',
      sourceEntityId: third.milestone.id,
      snapshot: {
        year: Number(marks.year),
        milestoneIds: three.map((row) => row.milestone.id),
        dates: three.map((row) => row.eventDate),
        eventDate: third.eventDate,
      },
    });
  }

  return { candidates, progress };
}
