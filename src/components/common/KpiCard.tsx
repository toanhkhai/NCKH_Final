import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  colorScheme: 'sky' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'purple';
  trendText?: string;
  progressPercent?: number;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  colorScheme,
  trendText,
  progressPercent,
  onClick,
}) => {
  return (
    <div
      className={`kpi-card glass-card kpi-scheme-${colorScheme} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      <div className="kpi-top">
        <span className="kpi-title">{title}</span>
        <div className="kpi-icon-wrap">{icon}</div>
      </div>

      <div className="kpi-value-row">
        <span className="kpi-value">{value}</span>
      </div>

      {(subtitle || trendText) && (
        <div className="kpi-bottom">
          {trendText && <span className="kpi-trend-pill">{trendText}</span>}
          {subtitle && <span className="kpi-subtitle">{subtitle}</span>}
        </div>
      )}

      {progressPercent !== undefined && (
        <div className="kpi-progress-bar-bg">
          <div
            className="kpi-progress-bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      )}
    </div>
  );
};
