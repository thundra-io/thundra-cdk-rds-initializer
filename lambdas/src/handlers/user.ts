export interface User {
  username: string;
  grants: string[];
  secretName?: string;
  isIAMUser: string;
}
