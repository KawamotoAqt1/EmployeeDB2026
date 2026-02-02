import express, { Express } from 'express';
import cors from 'cors';

// テスト用アプリケーション（サーバー起動なし）
const createTestApp = (): Express => {
  const app = express();

  // CORS設定
  app.use(cors());

  // JSONパーサー
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  return app;
};

export default createTestApp;
