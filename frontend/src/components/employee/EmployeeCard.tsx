import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import type { Employee } from '@/types';
import { SkillBadge, Badge } from '@/components/ui';
import { API_BASE_URL } from '@/api/config';

export interface EmployeeCardProps {
  employee: Employee;
  className?: string;
}

const getPhotoUrl = (photoUrl: string | undefined) => {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('http')) return photoUrl;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${photoUrl}`;
};

export function EmployeeCard({ employee, className }: EmployeeCardProps) {
  const topSkills = employee.skills?.slice(0, 3) || [];
  const isNotActive = employee.status !== 'ACTIVE';

  return (
    <Link
      to={`/employees/${employee.id}`}
      className={clsx(
        'block bg-white rounded-lg shadow-sm border border-gray-200',
        'hover:shadow-md hover:border-gray-300 transition-all',
        className
      )}
    >
      <div className="p-5">
        {/* Profile Section */}
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {employee.photoUrl ? (
              <img
                src={getPhotoUrl(employee.photoUrl)}
                alt={employee.fullName}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold text-xl">
                  {employee.fullName?.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {employee.fullName}
              </h3>
              {isNotActive && (
                <Badge variant="error">
                  {employee.status === 'RESIGNED' ? '退職' : employee.status === 'INACTIVE' ? '休職' : '退職（求職）'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 truncate">
              {employee.employeeNumber}
            </p>
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-600">
              {employee.department && (
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {employee.department}
                </span>
              )}
              {employee.position && (
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {employee.position}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Skills Section */}
        {topSkills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">主要スキル</p>
            <div className="flex flex-wrap gap-2">
              {topSkills.map((skill) => (
                <SkillBadge
                  key={skill.id}
                  name={skill.tag?.name || ''}
                  level={skill.level}
                />
              ))}
              {employee.skills && employee.skills.length > 3 && (
                <span className="text-xs text-gray-400 self-center">
                  +{employee.skills.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}

export default EmployeeCard;
