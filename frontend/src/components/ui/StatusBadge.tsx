import type { CompanyStatus, ProjectStatus } from '@/types';
import { CompanyStatusLabels, ProjectStatusLabels } from '@/types';

interface StatusBadgeProps {
  status: CompanyStatus | ProjectStatus;
  type: 'company' | 'project';
}

export function StatusBadge({ status, type }: StatusBadgeProps) {
  const getColorClass = () => {
    if (type === 'company') {
      const companyStatus = status as CompanyStatus;
      switch (companyStatus) {
        case 'ACTIVE':
          return 'bg-green-100 text-green-800';
        case 'INACTIVE':
          return 'bg-gray-100 text-gray-800';
        case 'TERMINATED':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    } else {
      const projectStatus = status as ProjectStatus;
      switch (projectStatus) {
        case 'PROPOSAL':
          return 'bg-purple-100 text-purple-800';
        case 'IN_PROGRESS':
          return 'bg-green-100 text-green-800';
        case 'ON_HOLD':
          return 'bg-yellow-100 text-yellow-800';
        case 'COMPLETED':
          return 'bg-blue-100 text-blue-800';
        case 'CANCELLED':
          return 'bg-red-100 text-red-800';
        default:
          return 'bg-gray-100 text-gray-800';
      }
    }
  };

  const label = type === 'company'
    ? CompanyStatusLabels[status as CompanyStatus]
    : ProjectStatusLabels[status as ProjectStatus];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getColorClass()}`}
    >
      {label}
    </span>
  );
}

export default StatusBadge;
