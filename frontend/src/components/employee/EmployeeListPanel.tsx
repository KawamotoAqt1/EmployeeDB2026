import { Avatar, ListItem } from '@/components/ui';
import type { Employee } from '@/types';

export interface EmployeeListPanelProps {
  /** 社員リスト */
  employees: Employee[];
  /** 選択中の社員ID */
  selectedId: string | null;
  /** 選択時のコールバック */
  onSelect: (id: string) => void;
  /** ローディング状態 */
  loading: boolean;
}

/**
 * マスターディテールレイアウトの左パネル用の社員リストコンポーネント
 */
export function EmployeeListPanel({
  employees,
  selectedId,
  onSelect,
  loading,
}: EmployeeListPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
        <svg
          className="w-12 h-12 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-sm text-gray-500">該当する社員が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto divide-y divide-gray-200">
      {employees.map((employee) => (
        <ListItem
          key={employee.id}
          avatar={
            <Avatar
              src={employee.photoUrl}
              name={employee.fullName}
              size="md"
              alt={employee.fullName}
            />
          }
          title={employee.fullName}
          subtitle={employee.department || ''}
          meta={employee.employeeNumber}
          selected={selectedId === employee.id}
          onClick={() => onSelect(employee.id)}
        />
      ))}
    </div>
  );
}

export default EmployeeListPanel;
