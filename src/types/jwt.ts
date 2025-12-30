export type UserInfo = {
  id: number;
  email: string;
};

export type AccessTokenPayload = UserInfo & {
  iat: number;
  exp: number;
};

export type RefreshTokenPayload = UserInfo & {
  iat: number;
  exp: number;
};
