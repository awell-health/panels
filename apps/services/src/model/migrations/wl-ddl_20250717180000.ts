import { Migration } from '@mikro-orm/migrations'

export class Migration20250717180000 extends Migration {
  override async up(): Promise<void> {
    // Create access_control_lists table
    this.addSql(
      `create table "access_control_lists" (
        "id" serial primary key,
        "tenant_id" varchar(255) not null,
        "resource_type" varchar(255) not null check ("resource_type" in ('panel', 'view')),
        "resource_id" integer not null,
        "user_email" varchar(255) not null,
        "permission" varchar(255) not null check ("permission" in ('viewer', 'editor', 'owner')),
        "created_at" timestamptz not null,
        "updated_at" timestamptz not null
      );`,
    )

    // Create indexes for performance
    this.addSql(
      `create index "access_control_lists_tenant_id_resource_type_resource_id_index" on "access_control_lists" ("tenant_id", "resource_type", "resource_id");`,
    )
    this.addSql(
      `create index "access_control_lists_tenant_id_user_email_resource_type_index" on "access_control_lists" ("tenant_id", "user_email", "resource_type");`,
    )
    this.addSql(
      `create index "access_control_lists_tenant_id_user_email_index" on "access_control_lists" ("tenant_id", "user_email");`,
    )
  }

  override async down(): Promise<void> {
    // Drop indexes
    this.addSql(`drop index "access_control_lists_tenant_id_user_email_index";`)
    this.addSql(
      `drop index "access_control_lists_tenant_id_user_email_resource_type_index";`,
    )
    this.addSql(
      `drop index "access_control_lists_tenant_id_resource_type_resource_id_index";`,
    )

    // Drop table
    this.addSql(`drop table "access_control_lists";`)
  }
}
