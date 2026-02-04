# 包括的仕様調査 - 全不整合・実装漏れサマリー

## 調査日時
2026-02-03

## 調査範囲
- Prisma スキーマ vs Zod スキーマ
- フロントエンド型定義 vs バックエンドAPI
- 全モジュール（Employee, Company, Project, Tag, Auth/User）
- 全APIエンドポイント（55件）
- 全フォームコンポーネント
- 全カスタムフック

---

## 重大な不整合（即時修正必須）

### 1. ProjectAssignment 型のフィールド名不一致
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/types/index.ts` |
| 問題 | フロントエンド: `startDate`/`endDate` vs バックエンド: `assignmentStartDate`/`assignmentEndDate` |
| 影響 | 案件参画の表示・編集が正しく動作しない |
| 対応状況 | **要修正** |

### 2. useUpdateEmployeeSkill フック - 対応APIなし
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/hooks/useEmployees.ts` |
| 問題 | `PUT /employees/:id/skills/:skillId` を呼び出すが、バックエンドにエンドポイントが存在しない |
| 影響 | スキルレベルの更新が失敗する |
| 対応 | バックエンドにスキル更新APIを追加するか、既存のupsert APIを使用するようフックを修正 |

### 3. useProjects 検索パラメータ名の不一致
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/hooks/useProjects.ts` |
| 問題 | フロントエンド: `keyword` → `q` として送信 vs バックエンド: `keyword` を期待 |
| 影響 | 案件のキーワード検索が機能しない |
| 対応 | フロントエンドまたはバックエンドのパラメータ名を統一 |

### 4. CreateEmployeeRequest 型定義が実装と完全不一致
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/types/index.ts` |
| 問題 | 型定義: `employeeCode`, `firstName`, `lastName` vs 実装: `employeeNumber`, `fullName` |
| 影響 | TypeScriptの型チェックが無意味になっている |
| 対応 | 型定義を実際のフォーム実装に合わせて修正 |

### 5. CreateTagCategoryRequest に必須フィールド code が欠落
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/types/index.ts` |
| 問題 | バックエンドでは `code` が必須だが、フロントエンド型定義にない |
| 影響 | タグカテゴリ作成時にバリデーションエラー |
| 対応 | 型定義に `code: string` を追加 |

### 6. CreateUserRequest に存在しないフィールド
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/types/index.ts` |
| 問題 | `username`, `employeeId` がフロントエンド型定義にあるが、バックエンドには存在しない |
| 影響 | 混乱を招く、将来的なバグの原因 |
| 対応 | 型定義から不要フィールドを削除 |

### 7. AuthResponse 型がAPIレスポンスと不一致
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/types/index.ts` |
| 問題 | フロントエンド: `accessToken`/`refreshToken`/`expiresIn` vs バックエンド: `token` のみ |
| 影響 | 認証処理でフィールド参照エラーの可能性 |
| 対応 | 型定義をバックエンドに合わせて修正 |

---

## 中程度の不整合（早期修正推奨）

### 8. ProjectAssignment 型に欠落フィールド
- `unitPrice` (Decimal): 単価
- `billingType` (BillingType): 請求形態
- `status` (AssignmentStatus): 参画ステータス

### 9. CompanyDepartment 型に欠落フィールド
- `type` (DepartmentType): 部署タイプ（DIVISION/DEPARTMENT/SECTION/UNIT/OTHER）
- `officeId`: 拠点との紐付け

### 10. 欠落しているEnum型（frontend/src/types/index.ts）
- `DepartmentType`: DIVISION, DEPARTMENT, SECTION, UNIT, OTHER
- `BillingType`: HOURLY, DAILY, MONTHLY, FIXED
- `AssignmentStatus`: SCHEDULED, IN_PROGRESS, COMPLETED

### 11. Project 型に欠落フィールド
- `deliveryDate`: 納品日
- `budget`: 予算
- `unitPrice`: 単価
- `location`: 勤務地

### 12. Company 型に欠落フィールド
- `postalCode`: 郵便番号
- `address`: 住所
- `phone`: 電話番号

### 13. CompanyContact 型にファントムフィールド
- `sortOrder` がフロントエンド型定義にあるが、DBスキーマには存在しない

### 14. EmployeeStatus の意味相違
- Prisma/バックエンド: `PENDING` = 入社予定
- フロントエンド表示: `PENDING` = 退職（求職）

### 15. ProjectList.tsx のステータスフィルタ値が不正
- 使用値: `ACTIVE`/`INACTIVE`
- 正しい値: `PROPOSAL`/`IN_PROGRESS`/`ON_HOLD`/`COMPLETED`/`CANCELLED`

---

## 機能実装漏れ

### 16. 部署管理UIが未実装
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/pages/CompanyForm.tsx` |
| 問題 | バックエンドに部署CRUD APIがあるが、フロントエンドにUIがない |
| 影響 | 部署の追加・編集・削除ができない |

### 17. スキル更新UIが未実装
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/pages/EmployeeForm.tsx` または関連コンポーネント |
| 問題 | 既存スキルのレベル変更UIがない |
| 影響 | スキルレベルを変更するには削除→再追加が必要 |

### 18. 案件参画編集UIが未実装
| 項目 | 内容 |
|------|------|
| ファイル | `frontend/src/pages/ProjectDetail.tsx` |
| 問題 | フック（useUpdateProjectAssignment）は存在するが、編集UIがない |
| 影響 | 参画情報の更新ができない |

### 19. ProjectForm に入力UIがないフィールド
- `deliveryDate` (納品日)
- `budget` (予算)
- `unitPrice` (単価)
- `location` (勤務地)

### 20. CompanyForm に入力UIがないフィールド
- 企業レベルの `postalCode`, `address`, `phone`
- 担当窓口の `remark`（備考）
- 担当窓口の `departmentId`（部署選択）

### 21. EmployeeForm の contractType 選択肢が不完全
- 現在: 正社員、契約社員、BP の3種類
- 不足: PART_TIME（パート）、TEMPORARY（派遣）、INTERN（インターン）

### 22. リフレッシュトークン未実装
- フロントエンド型定義には `refreshToken` があるが、バックエンドには実装されていない

### 23. パスワード変更API未実装
- ルート定義はあるが、実装されていない

---

## バリデーション不整合

### 24. 全フォームで文字数制限バリデーションが未実装
| フォーム | バックエンド制限 | フロントエンド |
|---------|-----------------|---------------|
| EmployeeForm | employeeNumber: max(20), fullName: max(100) | なし |
| CompanyForm | code: max(50), name: max(200) | なし |
| ProjectForm | code: max(50), name: max(200) | なし |
| UserManagement | email: max(255), password: min(6) | なし |

### 25. 日付前後関係チェックがフロントエンドにない
- ProjectForm: 契約開始日 ≤ 契約終了日
- 参画追加モーダル: 参画開始日 ≤ 参画終了日

---

## API設計の問題

### 26. タグ一覧APIにページネーション情報がない
- `/api/tags` はページネーション情報を返さない

### 27. useAllTags の limit=1000
- 将来的にバックエンドに制限が追加された場合に互換性問題が発生

### 28. Decimal精度の問題
- Prismaは `Decimal(15,2)` だが、Zodは `number` で受け取っている
- 対象: `Project.budget`, `Project.unitPrice`, `ProjectAssignment.unitPrice`

---

## 権限・セキュリティの問題

### 29. タグ管理画面の権限不整合
- フロントエンド: ADMIN限定（?）
- バックエンドAPI: EDITOR以上で操作可能

### 30. 画像アップロードがADMIN限定
- 他の社員操作はEDITORで可能だが、画像だけADMIN必須

---

## ドキュメント・コードの整合性

### 31. CLAUDE.md のスキルレベル説明と実際のラベルが不一致
- CLAUDE.md: 未経験/微経験(1～3年未満)/中堅(3～5年)/ベテラン(5年以上)
- 実装: 初級/中級/上級/エキスパート

### 32. CreateTagCategoryRequest に description, color があるが未実装
- 型定義には存在するが、バックエンドに対応フィールドがない

---

## 優先度別対応リスト

### 即時対応（P0）- システムが正しく動作しない
1. ProjectAssignment フィールド名修正（#1）
2. useUpdateEmployeeSkill 修正（#2）
3. useProjects 検索パラメータ修正（#3）
4. CreateEmployeeRequest 型定義修正（#4）
5. CreateTagCategoryRequest に code 追加（#5）
6. ProjectList.tsx ステータスフィルタ修正（#15）

### 早期対応（P1）- 機能が不完全
7. 欠落フィールドの追加（#8, #9, #11, #12）
8. 欠落Enum型の追加（#10）
9. AuthResponse 型修正（#7）
10. 部署管理UI実装（#16）

### 通常対応（P2）- 改善が望ましい
11. 未実装フォームフィールド追加（#19, #20, #21）
12. バリデーション追加（#24, #25）
13. 参画編集UI実装（#18）
14. スキル更新UI実装（#17）

### 後日対応（P3）- 影響が限定的
15. ドキュメント整備（#31, #32）
16. セキュリティ見直し（#29, #30）
17. API改善（#26, #27, #28）

---

## 関連ドキュメント

| No | ファイル | 内容 |
|----|---------|------|
| 10 | `10-prisma-zod-audit.md` | Prisma vs Zod スキーマ監査 |
| 11 | `11-frontend-backend-type-audit.md` | フロントエンド型 vs バックエンドAPI監査 |
| 12 | `12-employee-module-audit.md` | 社員モジュール監査 |
| 13 | `13-company-module-audit.md` | 企業モジュール監査 |
| 14 | `14-project-module-audit.md` | 案件モジュール監査 |
| 15 | `15-tag-module-audit.md` | タグモジュール監査 |
| 16 | `16-auth-user-module-audit.md` | 認証・ユーザーモジュール監査 |
| 17 | `17-api-endpoints-audit.md` | 全APIエンドポイント監査 |
| 18 | `18-hooks-api-audit.md` | フック vs API整合性監査 |
| 19 | `19-forms-api-audit.md` | フォーム vs APIスキーマ監査 |
