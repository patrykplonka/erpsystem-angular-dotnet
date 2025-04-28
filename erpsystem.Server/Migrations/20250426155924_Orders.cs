using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace erpsystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class Orders : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "OrderId",
                table: "WarehouseMovements",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseMovements_OrderId",
                table: "WarehouseMovements",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_WarehouseMovements_WarehouseItemId",
                table: "WarehouseMovements",
                column: "WarehouseItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_WarehouseMovements_Orders_OrderId",
                table: "WarehouseMovements",
                column: "OrderId",
                principalTable: "Orders",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_WarehouseMovements_WarehouseItems_WarehouseItemId",
                table: "WarehouseMovements",
                column: "WarehouseItemId",
                principalTable: "WarehouseItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_WarehouseMovements_Orders_OrderId",
                table: "WarehouseMovements");

            migrationBuilder.DropForeignKey(
                name: "FK_WarehouseMovements_WarehouseItems_WarehouseItemId",
                table: "WarehouseMovements");

            migrationBuilder.DropIndex(
                name: "IX_WarehouseMovements_OrderId",
                table: "WarehouseMovements");

            migrationBuilder.DropIndex(
                name: "IX_WarehouseMovements_WarehouseItemId",
                table: "WarehouseMovements");

            migrationBuilder.DropColumn(
                name: "OrderId",
                table: "WarehouseMovements");
        }
    }
}
