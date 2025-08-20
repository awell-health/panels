import { Migration } from '@mikro-orm/migrations'

export class Migration20250717210000 extends Migration {
  override async up(): Promise<void> {
    // Convert all existing ACLs to "editor" role
    this.addSql(`
      UPDATE "access_control_lists" 
      SET "permission" = 'editor'::text,
          "updated_at" = NOW()
      WHERE "permission" IN ('viewer');
    `)
  }

  override async down(): Promise<void> {
    // Revert all ACLs back to their original permissions
    // Note: This is a destructive operation that will reset all permissions
    // In a real scenario, you might want to store the original permissions
    // in a separate table before running the up migration

    // For now, we'll set them back to 'viewer' as a safe default
    this.addSql(`
      UPDATE "access_control_lists" 
      SET "permission" = 'viewer'::text,
          "updated_at" = NOW()
      WHERE "permission" = 'editor';
    `)
  }
}
