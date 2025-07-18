import { Migration } from '@mikro-orm/migrations'

export class Migration20250714144855 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `alter table "calculated_column" drop constraint if exists "calculated_column_type_check";`,
    )

    this.addSql(
      `alter table "base_column" drop constraint if exists "base_column_type_check";`,
    )

    this.addSql(
      `alter table "calculated_column" add constraint "calculated_column_type_check" check("type" in ('text', 'number', 'date', 'datetime', 'boolean', 'select', 'multi_select', 'user', 'file', 'custom'));`,
    )

    this.addSql(
      `alter table "base_column" add constraint "base_column_type_check" check("type" in ('text', 'number', 'date', 'datetime', 'boolean', 'select', 'multi_select', 'user', 'file', 'custom'));`,
    )

    this.addSql(`alter table "view_filter" drop column "operator";`)
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table "base_column" drop constraint if exists "base_column_type_check";`,
    )

    this.addSql(
      `alter table "calculated_column" drop constraint if exists "calculated_column_type_check";`,
    )

    this.addSql(
      `alter table "base_column" add constraint "base_column_type_check" check("type" in ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'user', 'file', 'custom'));`,
    )

    this.addSql(
      `alter table "calculated_column" add constraint "calculated_column_type_check" check("type" in ('text', 'number', 'date', 'boolean', 'select', 'multi_select', 'user', 'file', 'custom'));`,
    )

    this.addSql(
      `alter table "view_filter" add column "operator" text check ("operator" in ('eq', 'gt', 'lt', 'gte', 'lte', 'contains', 'in', 'between', 'ne', 'startsWith', 'endsWith', 'notIn', 'isNull', 'isNotNull')) not null;`,
    )
  }
}
