using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace erpsystem.Server.Migrations
{
    /// <inheritdoc />
    public partial class testi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Krok 1: Dodaj tymczasową kolumnę na nowe wartości
            migrationBuilder.AddColumn<int>(
                name: "MovementTypeTemp",
                table: "WarehouseMovements",
                type: "int",
                nullable: true);

            // Krok 2: Przekonwertuj istniejące wartości string na int
            migrationBuilder.Sql(
                @"UPDATE WarehouseMovements 
                  SET MovementTypeTemp = CASE MovementType
                      WHEN 'PZ' THEN 0
                      WHEN 'PW' THEN 1
                      WHEN 'WZ' THEN 2
                      WHEN 'RW' THEN 3
                      WHEN 'MM' THEN 4
                      WHEN 'ZW' THEN 5
                      WHEN 'ZK' THEN 6
                      WHEN 'INW' THEN 7
                      ELSE 0  -- Domyślnie PZ dla nieznanych wartości
                  END");

            // Krok 3: Usuń starą kolumnę MovementType
            migrationBuilder.DropColumn(
                name: "MovementType",
                table: "WarehouseMovements");

            // Krok 4: Zmień nazwę tymczasowej kolumny na MovementType
            migrationBuilder.RenameColumn(
                name: "MovementTypeTemp",
                table: "WarehouseMovements",
                newName: "MovementType");

            // Krok 5: Ustaw kolumnę jako NOT NULL
            migrationBuilder.AlterColumn<int>(
                name: "MovementType",
                table: "WarehouseMovements",
                type: "int",
                nullable: false,
                oldNullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Krok odwrotny: Przywróć kolumnę jako string
            migrationBuilder.AddColumn<string>(
                name: "MovementTypeTemp",
                table: "WarehouseMovements",
                type: "nvarchar(max)",
                nullable: true);

            // Przekonwertuj int na string
            migrationBuilder.Sql(
                @"UPDATE WarehouseMovements 
                  SET MovementTypeTemp = CASE MovementType
                      WHEN 0 THEN 'PZ'
                      WHEN 1 THEN 'PW'
                      WHEN 2 THEN 'WZ'
                      WHEN 3 THEN 'RW'
                      WHEN 4 THEN 'MM'
                      WHEN 5 THEN 'ZW'
                      WHEN 6 THEN 'ZK'
                      WHEN 7 THEN 'INW'
                      ELSE 'PZ'
                  END");

            // Usuń starą kolumnę MovementType
            migrationBuilder.DropColumn(
                name: "MovementType",
                table: "WarehouseMovements");

            // Zmień nazwę tymczasowej kolumny
            migrationBuilder.RenameColumn(
                name: "MovementTypeTemp",
                table: "WarehouseMovements",
                newName: "MovementType");
        }
    }
}