import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useCompany, useCreateCompany, useUpdateCompany } from '@/hooks/useCompanies';
import type { CreateCompanyRequest, CompanyStatus } from '@/types';

export function CompanyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: company, isLoading } = useCompany(id);
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const [formData, setFormData] = useState<CreateCompanyRequest>({
    code: '',
    name: '',
    nameKana: '',
    postalCode: '',
    address: '',
    phone: '',
    industry: '',
    status: 'ACTIVE',
    website: '',
    remark: '',
    offices: [],
    departments: [],
    contacts: [],
  });

  useEffect(() => {
    if (company) {
      setFormData({
        code: company.code || '',
        name: company.name,
        nameKana: company.nameKana,
        postalCode: company.postalCode,
        address: company.address,
        phone: company.phone,
        industry: company.industry,
        status: company.status,
        website: company.website,
        remark: company.remark,
        offices: company.offices?.map(o => ({
          name: o.name,
          postalCode: o.postalCode,
          address: o.address,
          phone: o.phone,
          isHeadquarters: o.isHeadquarters,
        })) || [],
        departments: company.departments?.map(d => ({
          name: d.name,
          parentId: d.parentId,
        })) || [],
        contacts: company.contacts?.map(c => ({
          name: c.name,
          nameKana: c.nameKana,
          title: c.title,
          email: c.email,
          phone: c.phone,
          mobile: c.mobile,
          isPrimary: c.isPrimary,
          remark: c.remark,
        })) || [],
      });
    }
  }, [company]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateCompany.mutateAsync({ id: id!, data: formData });
      } else {
        await createCompany.mutateAsync(formData);
      }
      navigate('/companies');
    } catch (err) {
      console.error('Submit failed:', err);
    }
  };

  const addOffice = () => {
    setFormData({
      ...formData,
      offices: [
        ...(formData.offices || []),
        { name: '', postalCode: '', address: '', phone: '', isHeadquarters: false },
      ],
    });
  };

  const removeOffice = (index: number) => {
    setFormData({
      ...formData,
      offices: formData.offices?.filter((_, i) => i !== index),
    });
  };

  const updateOffice = (index: number, field: string, value: any) => {
    const offices = [...(formData.offices || [])];
    offices[index] = { ...offices[index], [field]: value };
    setFormData({ ...formData, offices });
  };

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [
        ...(formData.contacts || []),
        { name: '', nameKana: '', title: '', email: '', phone: '', mobile: '', isPrimary: false, remark: '' },
      ],
    });
  };

  const removeContact = (index: number) => {
    setFormData({
      ...formData,
      contacts: formData.contacts?.filter((_, i) => i !== index),
    });
  };

  const updateContact = (index: number, field: string, value: any) => {
    const contacts = [...(formData.contacts || [])];
    contacts[index] = { ...contacts[index], [field]: value };
    setFormData({ ...formData, contacts });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {isEdit ? '企業編集' : '企業登録'}
        </h1>
        <Link to="/companies">
          <Button variant="ghost">キャンセル</Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  企業コード <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: COMP001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  企業名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                企業名（カナ）
              </label>
              <input
                type="text"
                maxLength={200}
                value={formData.nameKana}
                onChange={(e) => setFormData({ ...formData, nameKana: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">業種</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CompanyStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ACTIVE">取引中</option>
                  <option value="INACTIVE">取引停止</option>
                  <option value="TERMINATED">取引終了</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Webサイト</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 03-1234-5678"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
              <textarea
                rows={2}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例: 東京都千代田区..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
              <textarea
                rows={4}
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Offices */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">拠点情報</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addOffice}>
              追加
            </Button>
          </div>
          <div className="space-y-4">
            {formData.offices?.map((office, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">拠点 {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeOffice(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="拠点名"
                    value={office.name}
                    onChange={(e) => updateOffice(index, 'name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="郵便番号"
                    value={office.postalCode}
                    onChange={(e) => updateOffice(index, 'postalCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="住所"
                    value={office.address}
                    onChange={(e) => updateOffice(index, 'address', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="電話番号"
                    value={office.phone}
                    onChange={(e) => updateOffice(index, 'phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={office.isHeadquarters}
                      onChange={(e) => updateOffice(index, 'isHeadquarters', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">本社</span>
                  </label>
                </div>
              </div>
            ))}
            {(!formData.offices || formData.offices.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">拠点情報がありません</p>
            )}
          </div>
        </div>

        {/* Contacts */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">担当窓口</h2>
            <Button type="button" variant="secondary" size="sm" onClick={addContact}>
              追加
            </Button>
          </div>
          <div className="space-y-4">
            {formData.contacts?.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">担当者 {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeContact(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    削除
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="氏名"
                    value={contact.name}
                    onChange={(e) => updateContact(index, 'name', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="氏名（カナ）"
                    value={contact.nameKana}
                    onChange={(e) => updateContact(index, 'nameKana', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="役職"
                    value={contact.title}
                    onChange={(e) => updateContact(index, 'title', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="email"
                    placeholder="メールアドレス"
                    value={contact.email}
                    onChange={(e) => updateContact(index, 'email', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="電話番号"
                    value={contact.phone}
                    onChange={(e) => updateContact(index, 'phone', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="tel"
                    placeholder="携帯番号"
                    value={contact.mobile}
                    onChange={(e) => updateContact(index, 'mobile', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(e) => updateContact(index, 'isPrimary', e.target.checked)}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">主担当</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <textarea
                      placeholder="備考"
                      rows={2}
                      value={contact.remark}
                      onChange={(e) => updateContact(index, 'remark', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
            {(!formData.contacts || formData.contacts.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">担当窓口がありません</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to="/companies">
            <Button type="button" variant="ghost">
              キャンセル
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            loading={createCompany.isPending || updateCompany.isPending}
          >
            {isEdit ? '更新' : '登録'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CompanyForm;
