/**
 * SmartRetailX shared roles for RBAC.
 * Keep in sync with SECURITY.md decision table.
 */
const ROLES = Object.freeze({
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  WAREHOUSE_STAFF: 'warehouse_staff',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

module.exports = { ROLES, ALL_ROLES };
