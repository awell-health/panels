import { Migration } from '@mikro-orm/migrations'

export class Migration20250717200000 extends Migration {
  override async up(): Promise<void> {
    // Add ACLs for all existing view owners
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
        v."tenant_id",
        'view'::text,
        v."id",
        v."owner_user_id",
        'owner'::text,
        v."created_at",
        v."updated_at"
      FROM "view" v
      WHERE NOT EXISTS (
        SELECT 1 FROM "access_control_lists" acl 
        WHERE acl."resource_type" = 'view' 
        AND acl."resource_id" = v."id" 
        AND acl."user_email" = v."owner_user_id"
      );
    `)

    // Add ACLs for "_all" view access to all existing views
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
        v."tenant_id",
        'view'::text,
        v."id",
        '_all',
        'viewer'::text,
        v."created_at",
        v."updated_at"
      FROM "view" v
      WHERE NOT EXISTS (
        SELECT 1 FROM "access_control_lists" acl 
        WHERE acl."resource_type" = 'view' 
        AND acl."resource_id" = v."id" 
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

    // Remove ACLs for view owners (only the ones we added in this migration)
    this.addSql(`
      DELETE FROM "access_control_lists" acl
      WHERE acl."resource_type" = 'view' 
      AND acl."permission" = 'owner'
      AND EXISTS (
        SELECT 1 FROM "view" v 
        WHERE v."id" = acl."resource_id" 
        AND v."owner_user_id" = acl."user_email"
      );
    `)
  }
}
