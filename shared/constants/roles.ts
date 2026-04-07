import type { Role } from '../types';

export const ROLES: Role[] = ['SUPER_ADMIN', 'PRODUCT_OWNER', 'DELIVERY_MANAGER', 'FINANCE'];

export const ROLE_DISPLAY_NAMES: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  PRODUCT_OWNER: 'Product Owner',
  DELIVERY_MANAGER: 'Delivery Manager',
  FINANCE: 'Finance',
};

export const ROLE_DEFAULT_ROUTES: Record<Role, string> = {
  SUPER_ADMIN: '/admin/dashboard',
  PRODUCT_OWNER: '/client/my-crs',
  DELIVERY_MANAGER: '/dm/pending',
  FINANCE: '/finance/cr-listing',
};
