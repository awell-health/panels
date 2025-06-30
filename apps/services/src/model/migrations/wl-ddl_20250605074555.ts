import { Migration } from '@mikro-orm/migrations'

export class Migration20250605074555 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table "panel" ("id" serial primary key, "tenant_id" varchar(255) not null, "user_id" varchar(255) not null, "name" varchar(255) not null, "description" varchar(255) null, "cohort_rule" jsonb not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    )
    this.addSql(
      `create index "panel_tenant_id_user_id_index" on "panel" ("tenant_id", "user_id");`,
    )

    this.addSql(
      `create table "data_source" ("id" serial primary key, "type" text check ("type" in ('database', 'api', 'file', 'custom')) not null, "config" jsonb not null, "last_sync" timestamptz not null, "panel_id" int not null);`,
    )

    this.addSql(
      `create table "calculated_column" ("id" serial primary key, "name" varchar(255) not null, "type" text check ("type" in ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'user', 'file', 'custom')) not null, "formula" varchar(255) not null, "dependencies" jsonb not null, "properties" jsonb not null, "metadata" jsonb null, "panel_id" int not null);`,
    )

    this.addSql(
      `create table "base_column" ("id" serial primary key, "name" varchar(255) not null, "type" text check ("type" in ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'user', 'file', 'custom')) not null, "source_field" varchar(255) not null, "properties" jsonb not null, "metadata" jsonb null, "data_source_id" int not null, "panel_id" int not null);`,
    )

    this.addSql(
      `create table "panel_change" ("id" serial primary key, "change_type" text check ("change_type" in ('column_added', 'column_removed', 'column_modified', 'source_changed', 'cohort_changed')) not null, "affected_column" varchar(255) null, "change_details" jsonb not null, "panel_id" int not null, "created_at" timestamptz not null);`,
    )

    this.addSql(
      `create table "view" ("id" serial primary key, "name" varchar(255) not null, "owner_user_id" varchar(255) not null, "tenant_id" varchar(255) not null, "is_published" boolean not null default false, "published_at" timestamptz null, "visible_columns" jsonb not null, "panel_id" int not null, "created_at" timestamptz not null, "updated_at" timestamptz not null);`,
    )
    this.addSql(
      `create index "view_tenant_id_is_published_index" on "view" ("tenant_id", "is_published");`,
    )
    this.addSql(
      `create index "view_tenant_id_owner_user_id_index" on "view" ("tenant_id", "owner_user_id");`,
    )

    this.addSql(
      `create table "view_filter" ("id" serial primary key, "column_id" varchar(255) not null, "operator" text check ("operator" in ('eq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'between', 'ne', 'startsWith', 'endsWith', 'notIn', 'isNull', 'isNotNull')) not null, "value" jsonb not null, "view_id" int not null);`,
    )

    this.addSql(
      `create table "view_notification" ("id" serial primary key, "user_id" varchar(255) not null, "status" text check ("status" in ('pending', 'acknowledged', 'resolved')) not null, "impact" text check ("impact" in ('breaking', 'warning', 'info')) not null, "message" varchar(255) not null, "acknowledged_at" timestamptz null, "view_id" int not null, "panel_change_id" int null, "created_at" timestamptz not null);`,
    )
    this.addSql(
      `create index "view_notification_user_id_status_index" on "view_notification" ("user_id", "status");`,
    )

    this.addSql(
      `create table "view_sort" ("id" serial primary key, "column_name" varchar(255) not null, "direction" text check ("direction" in ('asc', 'desc')) not null, "order" int not null, "view_id" int not null);`,
    )

    this.addSql(
      `alter table "data_source" add constraint "data_source_panel_id_foreign" foreign key ("panel_id") references "panel" ("id") on update cascade on delete no action;`,
    )

    this.addSql(
      `alter table "calculated_column" add constraint "calculated_column_panel_id_foreign" foreign key ("panel_id") references "panel" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "base_column" add constraint "base_column_data_source_id_foreign" foreign key ("data_source_id") references "data_source" ("id") on update cascade;`,
    )
    this.addSql(
      `alter table "base_column" add constraint "base_column_panel_id_foreign" foreign key ("panel_id") references "panel" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "panel_change" add constraint "panel_change_panel_id_foreign" foreign key ("panel_id") references "panel" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "view" add constraint "view_panel_id_foreign" foreign key ("panel_id") references "panel" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "view_filter" add constraint "view_filter_view_id_foreign" foreign key ("view_id") references "view" ("id") on update cascade;`,
    )

    this.addSql(
      `alter table "view_notification" add constraint "view_notification_view_id_foreign" foreign key ("view_id") references "view" ("id") on update cascade;`,
    )
    this.addSql(
      `alter table "view_notification" add constraint "view_notification_panel_change_id_foreign" foreign key ("panel_change_id") references "panel_change" ("id") on update cascade on delete set null;`,
    )

    this.addSql(
      `alter table "view_sort" add constraint "view_sort_view_id_foreign" foreign key ("view_id") references "view" ("id") on update cascade;`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "data_source" drop constraint "data_source_panel_id_foreign";`,
    )

    this.addSql(
      `alter table "calculated_column" drop constraint "calculated_column_panel_id_foreign";`,
    )

    this.addSql(
      `alter table "base_column" drop constraint "base_column_panel_id_foreign";`,
    )

    this.addSql(
      `alter table "panel_change" drop constraint "panel_change_panel_id_foreign";`,
    )

    this.addSql(`alter table "view" drop constraint "view_panel_id_foreign";`)

    this.addSql(
      `alter table "base_column" drop constraint "base_column_data_source_id_foreign";`,
    )

    this.addSql(
      `alter table "view_notification" drop constraint "view_notification_panel_change_id_foreign";`,
    )

    this.addSql(
      `alter table "view_filter" drop constraint "view_filter_view_id_foreign";`,
    )

    this.addSql(
      `alter table "view_notification" drop constraint "view_notification_view_id_foreign";`,
    )

    this.addSql(
      `alter table "view_sort" drop constraint "view_sort_view_id_foreign";`,
    )

    this.addSql(`drop table if exists "panel" cascade;`)

    this.addSql(`drop table if exists "data_source" cascade;`)

    this.addSql(`drop table if exists "calculated_column" cascade;`)

    this.addSql(`drop table if exists "base_column" cascade;`)

    this.addSql(`drop table if exists "panel_change" cascade;`)

    this.addSql(`drop table if exists "view" cascade;`)

    this.addSql(`drop table if exists "view_filter" cascade;`)

    this.addSql(`drop table if exists "view_notification" cascade;`)

    this.addSql(`drop table if exists "view_sort" cascade;`)
  }
}
