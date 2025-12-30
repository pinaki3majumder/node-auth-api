import type { RowDataPacket } from 'mysql2';

export type UserRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  mobile: string;
  password: string;
};
