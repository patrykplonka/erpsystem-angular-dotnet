using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace erpsystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class CustomerWarhouse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Supplier",
                table: "WarehouseItems");

            migrationBuilder.AddColumn<int>(
                name: "ContractorId",
                table: "WarehouseItems",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseItems_ContractorId",
                table: "WarehouseItems",
                column: "ContractorId");

            migrationBuilder.AddForeignKey(
                name: "FK_WarehouseItems_Contractors_ContractorId",
                table: "WarehouseItems",
                column: "ContractorId",
                principalTable: "Contractors",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WarehouseItems_Contractors_ContractorId",
                table: "WarehouseItems");

            migrationBuilder.DropIndex(
                name: "IX_WarehouseItems_ContractorId",
                table: "WarehouseItems");

            migrationBuilder.DropColumn(
                name: "ContractorId",
                table: "WarehouseItems");

            migrationBuilder.AddColumn<string>(
                name: "Supplier",
                table: "WarehouseItems",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
