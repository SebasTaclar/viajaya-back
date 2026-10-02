export type User = {
  id: number;
  email: string | null;
  password: string;
  name: string;
  role: string;
  membershipPaid: boolean;
};
