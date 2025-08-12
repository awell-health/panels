import { Migration } from '@mikro-orm/migrations'

export class Migration20250717190000 extends Migration {
  override async up(): Promise<void> {
    // Add ACLs for all existing panel owners
    this.addSql(`
      INSERT INTO "access_control_lists" (
        "tenant_id", 
        "resource_type", 
        "resource_id", 
        "user_email", 
        "permission", 
        "created_at", 
        "updated_at"
      )
      SELECT 
        p."tenant_id",
        'panel'::text,
        p."id",
        p."user_id",
        'owner'::text,
        p."created_at",
        p."updated_at"
      FROM "panel" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "access_control_lists" acl 
        WHERE acl."resource_type" = 'panel' 
        AND acl."resource_id" = p."id" 
        AND acl."user_email" = p."user_id"
      );
    `)

    // Add ACLs for "_all" view access to all existing panels
    this.addSql(`
      INSERT INTO "access_control_lists" (
        "tenant_id", 
        "resource_type", 
        "resource_id", 
        "user_email", 
        "permission", 
        "created_at", 
        "updated_at"
      )
      SELECT 
        p."tenant_id",
        'panel'::text,
        p."id",
        '_all',
        'viewer'::text,
        p."created_at",
        p."updated_at"
      FROM "panel" p
      WHERE NOT EXISTS (
        SELECT 1 FROM "access_control_lists" acl 
        WHERE acl."resource_type" = 'panel' 
        AND acl."resource_id" = p."id" 
        AND acl."user_email" = '_all'
      );
    `)
  }

  override async down(): Promise<void> {
    // Remove ACLs for "_all" view access to views
    this.addSql(`
      DELETE FROM "access_control_lists" 
      WHERE "user_email" = '_all' 
      AND "resource_type" = 'view';
    `)

    // Remove ACLs for "_all" view access to panels
    this.addSql(`
      DELETE FROM "access_control_lists" 
      WHERE "user_email" = '_all' 
      AND "resource_type" = 'panel';
    `)

    // Remove ACLs for panel owners (only the ones we added in this migration)
    this.addSql(`
      DELETE FROM "access_control_lists" acl
      WHERE acl."resource_type" = 'panel' 
      AND acl."permission" = 'owner'
      AND EXISTS (
        SELECT 1 FROM "panels" p 
        WHERE p."id" = acl."resource_id" 
        AND p."user_id" = acl."user_email"
      );
    `)
  }
}
