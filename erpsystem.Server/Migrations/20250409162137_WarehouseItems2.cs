using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace erpsystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class WarehouseItems2 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BatchNumber",
                table: "WarehouseItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpirationDate",
                table: "WarehouseItems",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MinimumStock",
                table: "WarehouseItems",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "PurchaseCost",
                table: "WarehouseItems",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Supplier",
                table: "WarehouseItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "UnitOfMeasure",
                table: "WarehouseItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "VatRate",
                table: "WarehouseItems",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "Warehouse",
                table: "WarehouseItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BatchNumber",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "ExpirationDate",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "MinimumStock",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "PurchaseCost",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "Supplier",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "UnitOfMeasure",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "VatRate",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "Warehouse",
                table: "WarehouseItems");
        }
    }
}
