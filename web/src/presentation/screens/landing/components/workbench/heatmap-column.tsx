import {
  heatmapGrid,
  heatmapMonths,
  heatmapStats,
  heatmapWeekdays,
} from './workbench-demo-data';

const heatColors = [
  'var(--v3-heat-0)',
  'var(--v3-heat-1)',
  'var(--v3-heat-2)',
  'var(--v3-heat-3)',
  'var(--v3-heat-4)',
];

export function HeatmapColumn(): JSX.Element {
  return (
    <div className="flex w-[228px] shrink-0 flex-col py-4">
      <span className="mb-3 px-4 text-[12px] font-medium text-[var(--v3-text-strong)]">
        Heatmap · 过去 12 个月
      </span>

      <div className="flex-1 px-4">
        <div className="flex">
          <div className="mr-1 flex flex-col justify-between py-1">
            {heatmapWeekdays.map((day) => (
              <span
                key={day}
                className="text-[9px] text-[var(--v3-text-faint)]"
              >
                {day}
              </span>
            ))}
          </div>

          <div className="flex-1">
            <div className="mb-1 flex justify-between px-0.5">
              {heatmapMonths.map((month) => (
                <span
                  key={month}
                  className="text-[9px] text-[var(--v3-text-faint)]"
                >
                  {month}
                </span>
              ))}
            </div>

            <div className="grid gap-[3px]"
              style={{ gridTemplateColumns: 'repeat(12, 11px)' }}
            >
              {heatmapGrid.map((row, rowIndex) =>
                row.map((value, colIndex) => (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className="h-[11px] w-[11px] rounded-[2px] transition-transform hover:scale-[1.12]"
                    style={{ backgroundColor: heatColors[value] ?? heatColors[0] }}
                    title={`热力值: ${value}`}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t border-[var(--v3-divider)] pt-3">
          {heatmapStats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center justify-between text-[11px]"
            >
              <span className="text-[var(--v3-text-muted)]">{stat.label}</span>
              <span
                className={`font-medium ${
                  stat.highlight
                    ? 'text-[var(--v3-primary)]'
                    : 'text-[var(--v3-text-strong)]'
                }`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
